const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Partials } = require('discord.js');
const { evaluate } = require('mathjs');
const axios = require('axios');
const dataStore = require('./data');

const PREFIX = '=';

// XP System Configuration
const XP_CONFIG = {
  PER_MESSAGE: 5,
  PER_GAME_WIN: 50,
  PER_GAME_PARTICIPATION: 20,
  DAILY_BONUS: 100,
  LEVEL_MULTIPLIER: 100
};

// Animal list for guessing game
const ANIMALS = [
  'lion', 'tiger', 'elephant', 'giraffe', 'zebra', 'kangaroo', 'panda', 'koala',
  'rhinoceros', 'hippopotamus', 'crocodile', 'alligator', 'cheetah', 'leopard',
  'gorilla', 'chimpanzee', 'orangutan', 'wolf', 'fox', 'bear', 'polar bear',
  'penguin', 'eagle', 'hawk', 'owl', 'parrot', 'flamingo', 'peacock', 'dolphin',
  'whale', 'shark', 'octopus', 'jellyfish', 'crab', 'lobster', 'starfish',
  'butterfly', 'dragonfly', 'bee', 'ant', 'spider', 'scorpion', 'snake',
  'cobra', 'python', 'rattlesnake', 'turtle', 'tortoise', 'frog', 'toad'
];

// Country flags for guessing game
const COUNTRIES = [
  { name: 'United States', flag: '🇺🇸', code: 'us' },
  { name: 'United Kingdom', flag: '🇬🇧', code: 'gb' },
  { name: 'Canada', flag: '🇨🇦', code: 'ca' },
  { name: 'Australia', flag: '🇦🇺', code: 'au' },
  { name: 'Germany', flag: '🇩🇪', code: 'de' },
  { name: 'France', flag: '🇫🇷', code: 'fr' },
  { name: 'Japan', flag: '🇯🇵', code: 'jp' },
  { name: 'China', flag: '🇨🇳', code: 'cn' },
  { name: 'India', flag: '🇮🇳', code: 'in' },
  { name: 'Brazil', flag: '🇧🇷', code: 'br' },
  { name: 'Russia', flag: '🇷🇺', code: 'ru' },
  { name: 'Italy', flag: '🇮🇹', code: 'it' },
  { name: 'Spain', flag: '🇪🇸', code: 'es' },
  { name: 'Mexico', flag: '🇲🇽', code: 'mx' },
  { name: 'South Korea', flag: '🇰🇷', code: 'kr' },
  { name: 'Pakistan', flag: '🇵🇰', code: 'pk' },
  { name: 'Bangladesh', flag: '🇧🇩', code: 'bd' },
  { name: 'Turkey', flag: '🇹🇷', code: 'tr' },
  { name: 'Egypt', flag: '🇪🇬', code: 'eg' },
  { name: 'South Africa', flag: '🇿🇦', code: 'za' }
];

// Helper function to extract numeric ID from mentions or raw ID
function extractId(input) {
  if (!input) return null;
  const match = input.match(/\d+/);
  return match ? match[0] : null;
}

const COLORS = {
  primary: 0x2B2D31,
  success: 0x57F287,
  warning: 0xFEE75C,
  error: 0xED4245,
  info: 0x5865F2,
  crypto: {
    btc: 0xF7931A,
    ltc: 0x345D9D,
    eth: 0x627EEA,
    sol: 0x9945FF
  },
  game: 0x9B59B6,
  xp: 0xF1C40F
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User
  ]
});

// Active Games Storage
const activeGames = new Map();
const deletedMessages = new Map();
const editedMessages = new Map();

// XP System Functions
function calculateXPForLevel(level) {
  return level * XP_CONFIG.LEVEL_MULTIPLIER;
}

function getLevelFromXP(xp) {
  let level = 0;
  let requiredXP = 0;
  
  while (xp >= requiredXP) {
    level++;
    requiredXP = calculateXPForLevel(level);
  }
  
  return { level: level - 1, currentXP: xp, nextLevelXP: requiredXP };
}

function addXP(userId, guildId, amount, reason = '') {
  const currentData = dataStore.getUserXP(guildId, userId) || { xp: 0, level: 1 };
  const newXP = currentData.xp + amount;
  const newLevelData = getLevelFromXP(newXP);
  
  dataStore.setUserXP(guildId, userId, { xp: newXP, level: newLevelData.level });
  
  // Check for level up
  if (newLevelData.level > currentData.level) {
    return { levelUp: true, oldLevel: currentData.level, newLevel: newLevelData.level, xp: newXP };
  }
  
  return { levelUp: false, xp: newXP, level: newLevelData.level };
}

// ==================== MESSAGE EVENT HANDLER ====================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  if (message.guild) {
    // Increment message count
    dataStore.incrementMessageCount(message.guild.id);
    
    // Add XP for message
    const xpResult = addXP(message.author.id, message.guild.id, XP_CONFIG.PER_MESSAGE, 'message');
    if (xpResult.levelUp) {
      const levelEmbed = new EmbedBuilder()
        .setColor(COLORS.xp)
        .setAuthor({ name: '🎉 Level Up!', iconURL: message.author.displayAvatarURL() })
        .setDescription(`**${message.author}** has reached **Level ${xpResult.newLevel}**!`)
        .setFooter({ text: 'Keep chatting to level up more!' })
        .setTimestamp();
      
      message.channel.send({ embeds: [levelEmbed] }).catch(() => {});
    }
  }
  
  if (!message.content.startsWith(PREFIX)) {
    // Check for active games
    const gameId = `${message.channel.id}_${message.author.id}`;
    if (activeGames.has(gameId)) {
      await handleGameGuess(message, gameId);
    }
    return;
  }

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    switch (command) {
      // Original Commands
      case 'help': await helpCommand(message); break;
      case 'ping': await pingCommand(message); break;
      case 'serverinfo': await serverInfoCommand(message); break;
      case 'ui': await userInfoCommand(message, args); break;
      case 'avatar': await avatarCommand(message, args); break;
      case 'banner': await bannerCommand(message, args); break;
      case 'calc': await calcCommand(message, args); break;
      case 'remind': await remindCommand(message, args); break;
      case 'convert': await convertCommand(message, args); break;
      case 'translate': await translateCommand(message, args); break;
      case 'bal': await balCommand(message, args); break;
      case 'txid': await txidCommand(message, args); break;
      case 'vouch': await vouchCommand(message, args); break;
      case 'evouch': await evouchCommand(message, args); break;
      case 'rr': await setupReactionRole(message, args); break;
      case 'r': await useReactionRole(message, args); break;
      case 'addar': await addToReactionRole(message, args); break;
      case 'delar': await removeFromReactionRole(message, args); break;
      case 'listar': await listReactionRoles(message); break;
      case 'verify': await verifyUser(message, args); break;
      case 'unverify': await unverifyUser(message, args); break;
      case 'verifypanel': await sendVerifyPanel(message, args); break;
      case 'msgcount': await messageCount(message); break;
      case 'warn': await warnUser(message, args); break;
      case 'warnings': await checkWarnings(message, args); break;
      case 'clearwarn': await clearWarnUser(message, args); break;
      case 'kick': await kickUser(message, args); break;
      case 'ban': await banUser(message, args); break;
      case 'unban': await unbanUser(message, args); break;
      case 'mute': await muteUser(message, args); break;
      case 'unmute': await unmuteUser(message, args); break;
      case 'clear': await clearMessages(message, args); break;
      case '8ball': await eightBall(message, args); break;
      case 'dice': await rollDice(message, args); break;
      case 'coin': await flipCoin(message); break;
      case 'joke': await getJoke(message); break;
      case 'quote': await getQuote(message); break;
      case 'rep': await giveReputation(message, args); break;
      case 'getrep': await getReputationCommand(message, args); break;
      case 'poll': await createPoll(message, args); break;
      case 'botinfo': await botInfo(message); break;
      case 'weather': await getWeather(message, args); break;
      case 'addrole': await addRoleCommand(message, args); break;
      case 'removerole': await removeRoleCommand(message, args); break;
      case 'timeout': await timeoutUser(message, args); break;
      case 'changenick': await changeNickname(message, args); break;
      
      // New Mini Games
      case 'flag': await flagGameCommand(message, args); break;
      case 'animal': await animalGameCommand(message, args); break;
      case 'hangman': await hangmanGameCommand(message, args); break;
      case 'trivia': await triviaGameCommand(message, args); break;
      case 'rps': await rpsGameCommand(message, args); break;
      case 'number': await numberGameCommand(message, args); break;
      case 'wordchain': await wordChainGameCommand(message, args); break;
      
      // New Moderation Commands
      case 'slowmode': await slowmodeCommand(message, args); break;
      case 'lock': await lockChannelCommand(message, args); break;
      case 'unlock': await unlockChannelCommand(message, args); break;
      case 'nuke': await nukeChannelCommand(message, args); break;
      case 'roleinfo': await roleInfoCommand(message, args); break;
      case 'roleall': await roleAllCommand(message, args); break;
      case 'stealemoji': await stealEmojiCommand(message, args); break;
      case 'advancedpoll': await advancedPollCommand(message, args); break;
      case 'giveaway': await giveawayCommand(message, args); break;
      case 'ticket': await ticketCommand(message, args); break;
      case 'close': await closeTicketCommand(message); break;
      case 'automod': await autoModCommand(message, args); break;
      case 'blacklist': await blacklistCommand(message, args); break;
      case 'snipe': await snipeCommand(message); break;
      case 'editlogs': await editLogsCommand(message, args); break;
      case 'userlogs': await userLogsCommand(message, args); break;
      
      // XP System Commands
      case 'rank': await rankCommand(message, args); break;
      case 'leaderboard': await leaderboardCommand(message, args); break;
      case 'daily': await dailyCommand(message); break;
      case 'xp': await xpInfoCommand(message, args); break;
      
      default:
        // Check if it's a game guess
        const gameId = `${message.channel.id}_${message.author.id}`;
        if (activeGames.has(gameId)) {
          await handleGameGuess(message, gameId);
        }
        break;
    }
  } catch (error) {
    console.error(`Error executing command ${command}:`, error);
    const errorEmbed = createErrorEmbed('An error occurred while processing your request.');
    message.reply({ embeds: [errorEmbed] });
  }
});

// Store deleted messages for snipe
client.on('messageDelete', async (message) => {
  if (message.author.bot) return;
  
  const channelId = message.channel.id;
  if (!deletedMessages.has(channelId)) {
    deletedMessages.set(channelId, []);
  }
  
  const messages = deletedMessages.get(channelId);
  messages.unshift({
    content: message.content,
    author: message.author.tag,
    authorId: message.author.id,
    timestamp: Date.now(),
    attachments: message.attachments.size > 0 ? Array.from(message.attachments.values()).map(a => a.url) : []
  });
  
  // Keep only last 10 deleted messages per channel
  if (messages.length > 10) {
    messages.pop();
  }
});

// Store edited messages for edit logs
client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (oldMessage.author.bot || oldMessage.content === newMessage.content) return;
  
  const channelId = oldMessage.channel.id;
  if (!editedMessages.has(channelId)) {
    editedMessages.set(channelId, []);
  }
  
  const messages = editedMessages.get(channelId);
  messages.unshift({
    oldContent: oldMessage.content,
    newContent: newMessage.content,
    author: oldMessage.author.tag,
    authorId: oldMessage.author.id,
    messageId: oldMessage.id,
    timestamp: Date.now()
  });
  
  if (messages.length > 10) {
    messages.pop();
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  
  try {
    if (reaction.partial) await reaction.fetch();
    
    const reactionRoles = dataStore.getReactionRoles();
    
    for (const [name, config] of Object.entries(reactionRoles)) {
      if (config.messageId === reaction.message.id) {
        const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
        const roleConfig = config.roles.find(r => r.emoji === emoji || r.emoji === reaction.emoji.name);
        
        if (roleConfig) {
          const guild = reaction.message.guild;
          const member = await guild.members.fetch(user.id);
          const role = guild.roles.cache.get(roleConfig.roleId);
          
          if (role && member) {
            await member.roles.add(role);
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error handling reaction add:', error);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  
  try {
    if (reaction.partial) await reaction.fetch();
    
    const reactionRoles = dataStore.getReactionRoles();
    
    for (const [name, config] of Object.entries(reactionRoles)) {
      if (config.messageId === reaction.message.id) {
        const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
        const roleConfig = config.roles.find(r => r.emoji === emoji || r.emoji === reaction.emoji.name);
        
        if (roleConfig) {
          const guild = reaction.message.guild;
          const member = await guild.members.fetch(user.id);
          const role = guild.roles.cache.get(roleConfig.roleId);
          
          if (role && member) {
            await member.roles.remove(role);
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error handling reaction remove:', error);
  }
});

// ==================== HELPER FUNCTIONS ====================

function createErrorEmbed(description) {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setDescription(`❌ **Error**\n${description}`)
    .setTimestamp();
}

function createSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator) || 
         member.permissions.has(PermissionFlagsBits.ManageGuild) ||
         member.id === member.guild.ownerId;
}

function isMod(member) {
  return isAdmin(member) || 
         member.permissions.has(PermissionFlagsBits.ManageMessages) ||
         member.permissions.has(PermissionFlagsBits.KickMembers) ||
         member.permissions.has(PermissionFlagsBits.BanMembers);
}

// Game guess handler
async function handleGameGuess(message, gameId) {
  const gameData = activeGames.get(gameId);
  if (!gameData) return;
  
  const guess = message.content.trim().toLowerCase();
  
  if (guess === 'quit' || guess === 'exit' || guess === 'end') {
    activeGames.delete(gameId);
    await message.reply({ embeds: [createSuccessEmbed('Game Ended', 'Game has been cancelled.')] });
    return;
  }
  
  if (gameData.type === 'flag') {
    await handleFlagGuess(message, gameId, guess);
  } else if (gameData.type === 'animal') {
    await handleAnimalGuess(message, gameId, guess);
  } else if (gameData.type === 'hangman') {
    await handleHangmanGuess(message, gameId, guess);
  } else if (gameData.type === 'trivia') {
    await handleTriviaGuess(message, gameId, guess);
  } else if (gameData.type === 'rps') {
    await handleRPSGuess(message, gameId, guess);
  } else if (gameData.type === 'number') {
    await handleNumberGuess(message, gameId, parseInt(guess));
  } else if (gameData.type === 'wordchain') {
    await handleWordChainGuess(message, gameId, guess);
  }
}

// ==================== ORIGINAL COMMANDS (ALL PRESERVED) ====================

async function helpCommand(message) {
  const isOwner = message.member.id === message.guild.ownerId;
  const isAdminUser = isAdmin(message.member);
  
  const embed = new EmbedBuilder()
    .setColor(0x2C3E50)
    .setAuthor({ name: 'WORLD OF GAMERS BOT', iconURL: client.user.displayAvatarURL() })
    .setTitle('COMMAND DIRECTORY')
    .setDescription('```\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPrefix: =  |  Slash: /\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n```')
    .addFields(
      {name: '🔐 CRYPTOCURRENCY', value: '`=bal` • Check Crypto Balance\n`=txid` • Transaction Details\n`=convert` • Currency Conversion', inline: true},
      {name: '⚡ UTILITIES', value: '`=calc` • Math Calculator\n`=remind` • Set Reminders\n`=translate` • Text Translation\n`=weather` • Weather Check\n`=poll` • Create Polls', inline: true},
      {name: '👤 USER & SERVER', value: '`=ui` • User Information\n`=avatar` • Avatar Display\n`=banner` • User Banner\n`=serverinfo` • Server Details\n`=botinfo` • Bot Information', inline: true},
      {name: '📈 INFO & STATS', value: '`=ping` • Response Speed\n`=rep` • Give Reputation\n`=getrep` • Check Reputation\n`=msgcount` • Message Statistics', inline: true},
      {name: '🎨 ENTERTAINMENT', value: '`=8ball` • Magic 8 Ball\n`=dice` • Dice Roller\n`=coin` • Coin Flip\n`=joke` • Random Joke\n`=quote` • Random Quote', inline: true}
    );

  if (isOwner || isAdminUser) {
    embed.addFields(
      {name: '\u200b', value: '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**ADMIN & MODERATION**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false},
      {name: '🔔 VOUCH GENERATION', value: '`=vouch` • Purchase Vouch\n`=evouch` • Exchange Vouch', inline: true},
      {name: '⚔️ MODERATION TOOLS', value: '`=warn` • Warn User\n`=warnings` • View Warnings\n`=clearwarn` • Clear Warnings\n`=kick` • Remove User\n`=ban` • Ban User\n`=unban` • Unban User\n`=mute` • Mute User\n`=unmute` • Unmute User\n`=timeout` • Timeout User\n`=clear` • Delete Messages', inline: false},
      {name: '🏆 ROLE MANAGEMENT', value: '`=addrole` • Add Role\n`=removerole` • Remove Role\n`=changenick` • Change Nickname\n`=rr` • Reaction Role Setup\n`=r` • Deploy Roles\n`=addar` • Add to Roles\n`=delar` • Remove from Roles\n`=listar` • List All Roles', inline: true},
      {name: '✨ VERIFICATION', value: '`=verify` • Verify Member\n`=unverify` • Unverify Member\n`=verifypanel` • Verification Panel', inline: true}
    );
  }

  // Add new games section
  embed.addFields(
    {name: '\u200b', value: '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**🎮 MINI GAMES (XP SYSTEM)**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false},
    {name: '🎯 GUESSING GAMES', value: '`=flag` • Country Flag Guessing\n`=animal` • Animal Name Guessing\n`=hangman` • Hangman Game\n`=trivia` • Quiz Game\n`=rps` • Rock Paper Scissors\n`=number` • Number Guessing\n`=wordchain` • Word Chain Game', inline: false},
    {name: '📊 XP SYSTEM', value: '`=rank` • Check Your Level\n`=leaderboard` • Server Rankings\n`=daily` • Daily Rewards\n`=xp` • XP Information', inline: true}
  );

  // Add new moderation section if admin
  if (isOwner || isAdminUser) {
    embed.addFields(
      {name: '\u200b', value: '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**🛡️ ADVANCED MODERATION**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false},
      {name: '🔧 CHANNEL CONTROLS', value: '`=lock` • Lock Channel\n`=unlock` • Unlock Channel\n`=slowmode` • Set Slowmode\n`=nuke` • Clone & Clear Channel', inline: true},
      {name: '🎫 TICKET SYSTEM', value: '`=ticket` • Create Ticket\n`=close` • Close Ticket', inline: true},
      {name: '🛡️ AUTO MODERATION', value: '`=automod` • Setup Auto Mod\n`=blacklist` • Word Blacklist\n`=snipe` • View Deleted Messages\n`=editlogs` • View Edited Messages\n`=userlogs` • User Moderation Logs', inline: false}
    );
  }

  const cmdCount = isOwner || isAdminUser ? '60+' : '35+';
  embed.setFooter({text: `Requested by ${message.author.tag} • Total Commands: ${cmdCount}`, iconURL: message.author.displayAvatarURL()}).setTimestamp();
  await message.reply({ embeds: [embed] });
}

async function pingCommand(message) {
  const sent = await message.reply({ 
    embeds: [new EmbedBuilder().setColor(COLORS.info).setDescription('📡 Measuring latency...')] 
  });
  
  const latency = sent.createdTimestamp - message.createdTimestamp;
  const apiLatency = Math.round(client.ws.ping);
  
  const getLatencyStatus = (ms) => {
    if (ms < 100) return { emoji: '🟢', status: 'Excellent' };
    if (ms < 200) return { emoji: '🟡', status: 'Good' };
    return { emoji: '🔴', status: 'High' };
  };

  const botStatus = getLatencyStatus(latency);
  const apiStatus = getLatencyStatus(apiLatency);

  const embed = new EmbedBuilder()
    .setColor(botStatus.emoji === '🟢' ? 0x57F287 : botStatus.emoji === '🟡' ? 0xFEE75C : 0xED4245)
    .setAuthor({ name: 'LATENCY CHECK', iconURL: client.user.displayAvatarURL() })
    .addFields(
      { 
        name: 'Message Latency', 
        value: `${botStatus.emoji} ${latency}ms \`${botStatus.status}\``, 
        inline: true 
      },
      { 
        name: 'API Latency', 
        value: `${apiStatus.emoji} ${apiLatency}ms \`${apiStatus.status}\``, 
        inline: true 
      }
    )
    .setFooter({ 
      text: `Requested by ${message.author.tag}`, 
      iconURL: message.author.displayAvatarURL() 
    })
    .setTimestamp();

  await sent.edit({ embeds: [embed] });
}

async function serverInfoCommand(message) {
  const { guild } = message;
  if (!guild) {
    return message.reply({ embeds: [createErrorEmbed('This command can only be used in a server.')] });
  }

  const verificationLevels = ['🟢 None', '🟡 Low', '🟠 Medium', '🔴 High', '⚫ Very High'];
  const boostTiers = ['No Level', '⭐ Level 1', '⭐⭐ Level 2', '⭐⭐⭐ Level 3'];

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: '🏰 Server Information', iconURL: guild.iconURL({ dynamic: true }) })
    .setTitle(`${guild.name}`)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
    .addFields(
      { 
        name: '📍 General', 
        value: [
          `**ID:** \`${guild.id}\``,
          `**👑 Owner:** <@${guild.ownerId}>`,
          `**📅 Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`
        ].join('\n'), 
        inline: true 
      },
      { 
        name: '📊 Statistics', 
        value: [
          `**👥 Members:** \`${guild.memberCount.toLocaleString()}\``,
          `**💬 Channels:** \`${guild.channels.cache.size}\``,
          `**🏷️ Roles:** \`${guild.roles.cache.size}\``
        ].join('\n'), 
        inline: true 
      },
      { 
        name: '💜 Boost Status', 
        value: [
          `**Tier:** \`${boostTiers[guild.premiumTier]}\``,
          `**Boosts:** \`${guild.premiumSubscriptionCount || 0}\``,
          `**Verification:** \`${verificationLevels[guild.verificationLevel]}\``
        ].join('\n'), 
        inline: true 
      }
    )
    .setImage(guild.bannerURL({ dynamic: true, size: 1024 }))
    .setFooter({ 
      text: `Requested by ${message.author.tag}`, 
      iconURL: message.author.displayAvatarURL() 
    })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function userInfoCommand(message, args) {
  let user;
  if (args[0]) {
    const userId = args[0].replace(/[<@!>]/g, '');
    try {
      user = await client.users.fetch(userId, { force: true });
    } catch {
      return message.reply({ embeds: [createErrorEmbed('Could not find that user.')] });
    }
  } else {
    user = await message.author.fetch(true);
  }

  const member = message.guild?.members.cache.get(user.id);
  const createdDate = new Date(user.createdTimestamp);
  const joinedDate = member?.joinedTimestamp ? new Date(member.joinedTimestamp) : null;
  
  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-US', options).replace(', ', ' ');
  };

  const getRelativeTime = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    const intervals = { year: 31536000, month: 2592000, day: 86400, hour: 3600, minute: 60 };
    for (const [name, secondsInInterval] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInInterval);
      if (interval >= 1) return `${interval} ${name}${interval > 1 ? 's' : ''} ago`;
    }
    return 'moments ago';
  };

  // Get XP data if available
  const xpData = dataStore.getUserXP(message.guild.id, user.id) || { xp: 0, level: 1 };
  const levelData = getLevelFromXP(xpData.xp);

  const embed = new EmbedBuilder()
    .setColor(user.accentColor || COLORS.primary)
    .setAuthor({ name: `${user.tag}'s User Information`, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
    .addFields(
      {
        name: 'General:',
        value: `• **ID:** ${user.id}\n• **Username:** @${user.username}\n• **Display Name:** ${member?.displayName || user.username}\n• **Mention:** ${user}`,
        inline: false
      },
      {
        name: 'Created At:',
        value: `• **Date:** ${formatDate(createdDate)}\n• **Relative:** ${getRelativeTime(user.createdTimestamp)}`,
        inline: false
      },
      {
        name: '📊 XP Stats:',
        value: `• **Level:** ${levelData.level}\n• **XP:** ${xpData.xp}/${levelData.nextLevelXP}\n• **Progress:** ${Math.floor((xpData.xp % XP_CONFIG.LEVEL_MULTIPLIER) / XP_CONFIG.LEVEL_MULTIPLIER * 100)}%`,
        inline: false
      }
    );

  if (member && joinedDate) {
    embed.addFields({
      name: 'Joined At:',
      value: `• **Date:** ${formatDate(joinedDate)}\n• **Relative:** ${getRelativeTime(member.joinedTimestamp)}`,
      inline: false
    });
  }

  if (member) {
    const roles = member.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => r.toString());
    
    embed.addFields({
      name: `Roles [${roles.length}]:`,
      value: roles.length ? roles.join(' • ') : '• No roles',
      inline: false
    });
  }

  if (user.bannerURL()) {
    embed.setImage(user.bannerURL({ dynamic: true, size: 1024 }));
  }

  const now = new Date();
  const timeOptions = { hour: '2-digit', minute: '2-digit' };
  const timeStr = now.toLocaleTimeString('en-US', timeOptions);
  const dayStr = now.toLocaleDateString('en-US', { weekday: 'long' });

  embed.setFooter({ 
    text: `Requested by ${message.author.tag} • ${dayStr} at ${timeStr}`, 
    iconURL: message.author.displayAvatarURL() 
  });

  await message.reply({ embeds: [embed] });
}

async function avatarCommand(message, args) {
  let user;
  if (args[0]) {
    const userId = args[0].replace(/[<@!>]/g, '');
    try {
      user = await client.users.fetch(userId);
    } catch {
      return message.reply({ embeds: [createErrorEmbed('Could not find that user.')] });
    }
  } else {
    user = message.author;
  }

  const avatarURL = user.displayAvatarURL({ dynamic: true, size: 4096 });
  const formats = ['png', 'jpg', 'webp'];
  if (user.avatar?.startsWith('a_')) formats.push('gif');

  const links = formats.map(f => 
    `[\`${f.toUpperCase()}\`](${user.displayAvatarURL({ extension: f, size: 4096 })})`
  ).join(' ');

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: `📸 ${user.tag}'s Avatar`, iconURL: user.displayAvatarURL() })
    .setImage(avatarURL)
    .setDescription(`**📥 Download:** ${links}`)
    .setFooter({ 
      text: `Requested by ${message.author.tag}`, 
      iconURL: message.author.displayAvatarURL() 
    })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function bannerCommand(message, args) {
  let user;
  if (args[0]) {
    const userId = args[0].replace(/[<@!>]/g, '');
    try {
      user = await client.users.fetch(userId, { force: true });
    } catch {
      return message.reply({ embeds: [createErrorEmbed('Could not find that user.')] });
    }
  } else {
    user = await message.author.fetch(true);
  }

  const bannerURL = user.bannerURL({ dynamic: true, size: 4096 });

  if (!bannerURL) {
    return message.reply({ embeds: [createErrorEmbed('This user does not have a banner.')] });
  }

  const formats = ['png', 'jpg', 'webp'];
  if (user.banner?.startsWith('a_')) formats.push('gif');

  const links = formats.map(f => 
    `[\`${f.toUpperCase()}\`](${user.bannerURL({ extension: f, size: 4096 })})`
  ).join(' ');

  const embed = new EmbedBuilder()
    .setColor(user.accentColor || COLORS.primary)
    .setAuthor({ name: `🎨 ${user.tag}'s Banner`, iconURL: user.displayAvatarURL() })
    .setImage(bannerURL)
    .setDescription(`**📥 Download:** ${links}`)
    .setFooter({ 
      text: `Requested by ${message.author.tag}`, 
      iconURL: message.author.displayAvatarURL() 
    })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function calcCommand(message, args) {
  if (!args.length) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '🧮 Calculator', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=calc <expression>`')
      .addFields({
        name: '📋 Examples',
        value: '```\n=calc 5 * 10\n=calc (100 + 50) / 2\n=calc sqrt(144)\n=calc 2^8```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const expression = args.join(' ');
  
  try {
    const result = evaluate(expression);
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '🧮 Calculator', iconURL: client.user.displayAvatarURL() })
      .addFields(
        { name: '📝 Expression', value: `\`\`\`${expression}\`\`\``, inline: false },
        { name: '✨ Result', value: `\`\`\`${result}\`\`\``, inline: false }
      )
      .setFooter({ 
        text: `Requested by ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL() 
      })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Invalid expression. Please check your input.')] });
  }
}

async function remindCommand(message, args) {
  if (args.length < 2) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '⏰ Reminder', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=remind <duration> <reason>`')
      .addFields({
        name: '⏱️ Duration Format',
        value: '`s` = seconds, `m` = minutes, `h` = hours, `d` = days'
      }, {
        name: '📋 Examples',
        value: '```\n=remind 10m Drink Water\n=remind 1h Check email\n=remind 30s Quick break```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const durationStr = args[0].toLowerCase();
  const reason = args.slice(1).join(' ');

  const timeUnits = { 's': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000 };
  const unitNames = { 's': 'second(s)', 'm': 'minute(s)', 'h': 'hour(s)', 'd': 'day(s)' };

  const unit = durationStr.slice(-1);
  const value = parseInt(durationStr.slice(0, -1));

  if (!timeUnits[unit] || isNaN(value) || value <= 0) {
    return message.reply({ embeds: [createErrorEmbed('Invalid duration format. Use: `10s`, `5m`, `2h`, `1d`')] });
  }

  const duration = value * timeUnits[unit];
  const maxDuration = 7 * 24 * 60 * 60 * 1000;

  if (duration > maxDuration) {
    return message.reply({ embeds: [createErrorEmbed('Maximum reminder duration is 7 days.')] });
  }

  const reminderTime = Math.floor((Date.now() + duration) / 1000);

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({ name: '⏰ Reminder Set', iconURL: client.user.displayAvatarURL() })
    .setDescription(`I'll remind you <t:${reminderTime}:R>`)
    .addFields(
      { name: '⏱️ Duration', value: `\`${value} ${unitNames[unit]}\``, inline: true },
      { name: '📝 Reason', value: reason, inline: true }
    )
    .setFooter({ 
      text: `Requested by ${message.author.tag}`, 
      iconURL: message.author.displayAvatarURL() 
    })
    .setTimestamp();

  await message.reply({ embeds: [embed] });

  setTimeout(async () => {
    const reminderEmbed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setAuthor({ name: '⏰ Reminder!', iconURL: client.user.displayAvatarURL() })
      .setDescription(`**${reason}**`)
      .addFields({ name: '📍 Set', value: `<t:${Math.floor(Date.now() / 1000) - Math.floor(duration / 1000)}:R>` })
      .setFooter({ text: "⏲️ Time's up!" })
      .setTimestamp();

    try {
      await message.channel.send({ content: `<@${message.author.id}>`, embeds: [reminderEmbed] });
    } catch (e) {
      console.error('Failed to send reminder:', e);
    }
  }, duration);
}

async function convertCommand(message, args) {
  if (args.length < 4 || args[2].toLowerCase() !== 'to') {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '💱 Currency Converter', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=convert <amount> <from> to <to>`')
      .addFields({
        name: '📋 Examples',
        value: '```\n=convert 100 usd to pkr\n=convert 50 eur to gbp\n=convert 1000 inr to usd```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const amount = parseFloat(args[0]);
  const fromCurrency = args[1].toUpperCase();
  const toCurrency = args[3].toUpperCase();

  if (isNaN(amount)) {
    return message.reply({ embeds: [createErrorEmbed('Please provide a valid amount.')] });
  }

  try {
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
    const rate = response.data.rates[toCurrency];

    if (!rate) {
      return message.reply({ embeds: [createErrorEmbed('Invalid currency code.')] });
    }

    const result = (amount * rate).toFixed(2);

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '💱 Currency Converter', iconURL: client.user.displayAvatarURL() })
      .addFields(
        { name: '💵 From', value: `\`\`\`${amount.toLocaleString()} ${fromCurrency}\`\`\``, inline: true },
        { name: '💰 To', value: `\`\`\`${parseFloat(result).toLocaleString()} ${toCurrency}\`\`\``, inline: true },
        { name: '📊 Exchange Rate', value: `\`1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}\``, inline: false }
      )
      .setFooter({ 
        text: `Requested by ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL() 
      })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Failed to convert currency. Please check the currency codes.')] });
  }
}

async function translateCommand(message, args) {
  const toIndex = args.findIndex(arg => arg.toLowerCase() === 'to');
  
  if (toIndex === -1 || toIndex === 0 || toIndex === args.length - 1) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '🌐 Translator', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=translate <message> to <language>`')
      .addFields({
        name: '📋 Examples',
        value: '```\n=translate hello to spanish\n=translate good morning to french\n=translate thank you to japanese```'
      }, {
        name: '🌍 Supported Languages',
        value: 'English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi, Urdu, Turkish, and more...'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const text = args.slice(0, toIndex).join(' ');
  const targetLang = args.slice(toIndex + 1).join(' ').toLowerCase();

  const langCodes = {
    'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de',
    'italian': 'it', 'portuguese': 'pt', 'russian': 'ru', 'japanese': 'ja',
    'korean': 'ko', 'chinese': 'zh', 'arabic': 'ar', 'hindi': 'hi',
    'urdu': 'ur', 'turkish': 'tr', 'dutch': 'nl', 'polish': 'pl',
    'vietnamese': 'vi', 'thai': 'th', 'indonesian': 'id', 'malay': 'ms'
  };

  const targetCode = langCodes[targetLang] || targetLang;

  try {
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: { q: text, langpair: `en|${targetCode}` }
    });

    const translatedText = response.data.responseData.translatedText;

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '🌐 Translation', iconURL: client.user.displayAvatarURL() })
      .addFields(
        { name: '🇬🇧 Original (English)', value: `\`\`\`${text}\`\`\``, inline: false },
        { name: `🌍 Translated (${targetLang.charAt(0).toUpperCase() + targetLang.slice(1)})`, value: `\`\`\`${translatedText}\`\`\``, inline: false }
      )
      .setFooter({ 
        text: `Requested by ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL() 
      })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Failed to translate. Please try again.')] });
  }
}

async function balCommand(message, args) {
  if (args.length < 2) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '💰 Crypto Balance', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=bal <crypto> <address>`')
      .addFields({
        name: '💎 Supported Coins',
        value: '`₿ BTC` `Ł LTC` `Ξ ETH` `◎ SOL`'
      }, {
        name: '📋 Example',
        value: '```=bal btc 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const crypto = args[0].toLowerCase();
  const address = args[1];

  const cryptoInfo = {
    btc: { name: 'Bitcoin', symbol: 'BTC', color: COLORS.crypto.btc, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', emoji: '₿' },
    ltc: { name: 'Litecoin', symbol: 'LTC', color: COLORS.crypto.ltc, icon: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png', emoji: 'Ł' },
    eth: { name: 'Ethereum', symbol: 'ETH', color: COLORS.crypto.eth, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', emoji: 'Ξ' },
    sol: { name: 'Solana', symbol: 'SOL', color: COLORS.crypto.sol, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png', emoji: '◎' }
  };

  if (!cryptoInfo[crypto]) {
    return message.reply({ embeds: [createErrorEmbed('Supported cryptocurrencies: `BTC`, `LTC`, `ETH`, `SOL`')] });
  }

  const info = cryptoInfo[crypto];

  try {
    let balance;

    if (crypto === 'btc') {
      const response = await axios.get(`https://blockchain.info/balance?active=${address}`);
      const data = response.data[address];
      balance = data ? (data.final_balance / 100000000).toFixed(8) : '0';
    } else if (crypto === 'ltc') {
      const response = await axios.get(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`);
      balance = (response.data.balance / 100000000).toFixed(8);
    } else if (crypto === 'eth') {
      const response = await axios.get(`https://api.blockcypher.com/v1/eth/main/addrs/${address}/balance`);
      balance = (response.data.balance / 1000000000000000000).toFixed(8);
    } else if (crypto === 'sol') {
      const response = await axios.post('https://api.mainnet-beta.solana.com', {
        jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address]
      });
      balance = response.data.result?.value ? (response.data.result.value / 1000000000).toFixed(8) : '0';
    }

    const embed = new EmbedBuilder()
      .setColor(info.color)
      .setAuthor({ name: `${info.emoji} ${info.name} Wallet`, iconURL: info.icon })
      .addFields(
        { name: '📍 Address', value: `\`\`\`${address}\`\`\``, inline: false },
        { name: '💰 Balance', value: `\`\`\`${balance} ${info.symbol}\`\`\``, inline: false }
      )
      .setFooter({ 
        text: `Requested by ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL() 
      })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Failed to fetch balance. Please check the address and try again.')] });
  }
}
async function txidCommand(message, args) {
  if (args.length < 2) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '📝 Transaction Lookup', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=txid <crypto> <txid>`')
      .addFields({
        name: '💎 Supported Coins',
        value: '`₿ BTC` `Ł LTC` `Ξ ETH`'
      }, {
        name: '📋 Example',
        value: '```=txid btc abc123def456...```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const crypto = args[0].toLowerCase();
  const txid = args[1];

  const cryptoInfo = {
    btc: { name: 'Bitcoin', symbol: 'BTC', color: COLORS.crypto.btc, emoji: '₿' },
    ltc: { name: 'Litecoin', symbol: 'LTC', color: COLORS.crypto.ltc, emoji: 'Ł' },
    eth: { name: 'Ethereum', symbol: 'ETH', color: COLORS.crypto.eth, emoji: 'Ξ' }
  };

  if (!cryptoInfo[crypto]) {
    return message.reply({ embeds: [createErrorEmbed('Supported cryptocurrencies: `BTC`, `LTC`, `ETH`')] });
  }

  const info = cryptoInfo[crypto];

  try {
    let data;
    if (crypto === 'btc') {
      const response = await axios.get(`https://blockchain.info/rawtx/${txid}`);
      data = response.data;
    } else {
      const response = await axios.get(`https://api.blockcypher.com/v1/${crypto}/main/txs/${txid}`);
      data = response.data;
    }

    const embed = new EmbedBuilder()
      .setColor(info.color)
      .setAuthor({ name: `${info.emoji} ${info.name} Transaction` })
      .addFields(
        { name: '🔗 Transaction Hash', value: `\`\`\`${txid}\`\`\``, inline: false },
        { 
          name: '📦 Block Height', 
          value: `\`${data.block_height || 'Pending'}\``, 
          inline: true 
        },
        { 
          name: '✅ Status', 
          value: data.block_height ? '`Confirmed`' : '`Pending`', 
          inline: true 
        },
        { 
          name: '🔢 Confirmations', 
          value: `\`${data.confirmations || (data.block_height ? '1+' : '0')}\``, 
          inline: true 
        }
      );

    if (crypto === 'btc' && data.time) {
      embed.addFields({ name: '🕐 Time', value: `<t:${data.time}:F>`, inline: false });
    } else if (data.confirmed) {
      embed.addFields({ 
        name: '🕐 Confirmed At', 
        value: `<t:${Math.floor(new Date(data.confirmed).getTime() / 1000)}:F>`, 
        inline: false 
      });
    }

    embed.setFooter({ 
      text: `Requested by ${message.author.tag}`, 
      iconURL: message.author.displayAvatarURL() 
    }).setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Failed to fetch transaction details. Please check the TXID and try again.')] });
  }
}

async function vouchCommand(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  
  if (args.length < 4) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: 'PURCHASE VOUCH GENERATOR', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=vouch <@user> <Item> <price> <currency> <wallet>`')
      .addFields({
        name: 'Example',
        value: '```=vouch @user ink decoration 1.3$ usd cwallet```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const priceIndex = args.findIndex((arg, idx) => idx > 0 && /^\d+\.?\d*\$?$|^\$\d+\.?\d*$/.test(arg));
  
  if (priceIndex === -1) {
    return message.reply({ embeds: [createErrorEmbed('Please include a price. Example: `=vouch @user ink decoration 1.3$ usd cwallet`')] });
  }

  const item = args.slice(1, priceIndex).join(' ');
  const price = args[priceIndex];
  const currency = args[priceIndex + 1] || 'USD';
  const wallet = args.slice(priceIndex + 2).join(' ') || 'Unknown';
  const sellerID = message.author.id;

  const repCommand = `+rep <@${sellerID}> Purchased ${item} for ${price} ${currency.toUpperCase()} [${wallet}] • Always Legit`;

  const repEmbed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📋 COPY & SHARE WITH BUYER')
    .setDescription(`\`\`\`\n${repCommand}\n\`\`\``);

  await message.reply({ embeds: [repEmbed] });
}

async function evouchCommand(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  
  const toIndex = args.findIndex(arg => arg.toLowerCase() === 'to');
  
  if (toIndex === -1 || toIndex < 2) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: 'EXCHANGE VOUCH GENERATOR', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=evouch <Amount> <Currency> to <Amount> <Currency> <Wallet>`')
      .addFields({
        name: 'Example',
        value: '```=evouch 3000 PKR to 10.3$ USDC Cwallet```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const fromAmount = args[0];
  const fromCurrency = args[1];
  const toAmount = args[toIndex + 1] || '0';
  const toCurrency = args[toIndex + 2] || '';
  const toWallet = args.slice(toIndex + 3).join(' ') || 'Unknown';

  const repCommand = `+rep <@${message.author.id}> Exchanged ${fromAmount} ${fromCurrency.toUpperCase()} to ${toAmount} ${toCurrency.toUpperCase()} [${toWallet}] • Always Legit`;

  const repEmbed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📋 COPY & SHARE WITH BUYER')
    .setDescription(`\`\`\`\n${repCommand}\n\`\`\``);

  await message.reply({ embeds: [repEmbed] });
}

async function setupReactionRole(message, args) {
  if (!isAdmin(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need Administrator permissions to use this command.')] });
  }

  if (args.length < 2) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '⚙️ Reaction Role Setup', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=rr <name> <roleId>`')
      .addFields({
        name: '📋 Example',
        value: '```=rr colors 123456789012345678```'
      }, {
        name: '📍 Next Steps',
        value: 'After setup, use `=addar <name> <roleId> <emoji>` to add roles'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const name = args[0].toLowerCase();
  const roleId = args[1];

  const role = message.guild.roles.cache.get(roleId);
  if (!role) {
    return message.reply({ embeds: [createErrorEmbed('Could not find that role. Please provide a valid role ID.')] });
  }

  dataStore.setReactionRole(name, {
    guildId: message.guild.id,
    channelId: null,
    messageId: null,
    roles: [{ roleId: roleId, emoji: null }]
  });

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({ name: '✅ Reaction Role Created', iconURL: client.user.displayAvatarURL() })
    .addFields(
      { name: '📝 Name', value: `\`${name}\``, inline: true },
      { name: '👤 Initial Role', value: `<@&${roleId}>`, inline: true }
    )
    .setDescription('Use `=addar` to add more roles with emojis, then `=r` to deploy it.')
    .setFooter({ text: `Created by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function addToReactionRole(message, args) {
  if (!isAdmin(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need Administrator permissions to use this command.')] });
  }

  if (args.length < 3) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '➕ Add to Reaction Role', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=addar <name> <roleId> <emoji>`')
      .addFields({
        name: '📋 Example',
        value: '```=addar colors 123456789012345678 🔴```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const name = args[0].toLowerCase();
  const roleId = args[1];
  const emoji = args[2];

  const reactionRoles = dataStore.getReactionRoles();
  const config = reactionRoles[name];

  if (!config) {
    return message.reply({ embeds: [createErrorEmbed(`Reaction role "${name}" not found. Create it first with \`=rr\`.`)] });
  }

  const role = message.guild.roles.cache.get(roleId);
  if (!role) {
    return message.reply({ embeds: [createErrorEmbed('Could not find that role.')] });
  }

  if (!config.roles) config.roles = [];
  
  const existingIndex = config.roles.findIndex(r => r.roleId === roleId);
  if (existingIndex !== -1) {
    config.roles[existingIndex].emoji = emoji;
  } else {
    config.roles.push({ roleId, emoji });
  }

  dataStore.setReactionRole(name, config);

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({ name: '✅ Role Added', iconURL: client.user.displayAvatarURL() })
    .addFields(
      { name: '🏷️ Reaction Role', value: `\`${name}\``, inline: true },
      { name: '👤 Role', value: `<@&${roleId}>`, inline: true },
      { name: '😀 Emoji', value: emoji, inline: true }
    )
    .setFooter({ text: `Modified by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function removeFromReactionRole(message, args) {
  if (!isAdmin(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need Administrator permissions to use this command.')] });
  }

  if (args.length < 2) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '➖ Remove from Reaction Role', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=delar <name> <roleId>`')
      .addFields({
        name: '📋 Example',
        value: '```=delar colors 123456789012345678```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const name = args[0].toLowerCase();
  const roleId = args[1];

  const reactionRoles = dataStore.getReactionRoles();
  const config = reactionRoles[name];

  if (!config) {
    return message.reply({ embeds: [createErrorEmbed(`Reaction role "${name}" not found.`)] });
  }

  config.roles = config.roles.filter(r => r.roleId !== roleId);
  
  if (config.roles.length === 0) {
    dataStore.deleteReactionRole(name);
    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setDescription(`⚠️ Reaction role \`${name}\` deleted (no roles remaining).`)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  dataStore.setReactionRole(name, config);

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({ name: '✅ Role Removed', iconURL: client.user.displayAvatarURL() })
    .setDescription(`Removed <@&${roleId}> from \`${name}\``)
    .setFooter({ text: `Modified by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function useReactionRole(message, args) {
  if (!isAdmin(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need Administrator permissions to use this command.')] });
  }

  if (args.length < 1) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '🚀 Deploy Reaction Role', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=r <name>`')
      .addFields({
        name: '📋 Example',
        value: '```=r colors```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const name = args[0].toLowerCase();
  const reactionRoles = dataStore.getReactionRoles();
  const config = reactionRoles[name];

  if (!config) {
    return message.reply({ embeds: [createErrorEmbed(`Reaction role "${name}" not found.`)] });
  }

  const validRoles = config.roles.filter(r => r.emoji);
  if (validRoles.length === 0) {
    return message.reply({ embeds: [createErrorEmbed('No roles with emojis configured. Use `=addar` to add roles.')] });
  }

  const rolesText = validRoles.map(r => `${r.emoji} ➜ <@&${r.roleId}>`).join('\n');

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: '🎯 Role Selection', iconURL: client.user.displayAvatarURL() })
    .setTitle('React to get your roles!')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━\n\n' + rolesText + '\n\n━━━━━━━━━━━━━━━━━━━━━━')
    .setFooter({ text: '👆 React below to get/remove roles' })
    .setTimestamp();

  const sent = await message.channel.send({ embeds: [embed] });

  config.channelId = message.channel.id;
  config.messageId = sent.id;
  dataStore.setReactionRole(name, config);

  for (const roleConfig of validRoles) {
    try {
      await sent.react(roleConfig.emoji);
    } catch (e) {
      console.error(`Failed to react with ${roleConfig.emoji}:`, e);
    }
  }

  await message.delete().catch(() => {});
}

async function listReactionRoles(message) {
  if (!isAdmin(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need Administrator permissions to use this command.')] });
  }

  const reactionRoles = dataStore.getReactionRoles();
  const guildRoles = Object.entries(reactionRoles).filter(([_, config]) => config.guildId === message.guild.id);

  if (guildRoles.length === 0) {
    return message.reply({ embeds: [createErrorEmbed('No reaction roles configured for this server.')] });
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: '📋 Reaction Roles', iconURL: client.user.displayAvatarURL() })
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━');

  for (const [name, config] of guildRoles) {
    const rolesText = config.roles
      .filter(r => r.emoji)
      .map(r => `${r.emoji} <@&${r.roleId}>`)
      .join('\n') || 'No roles configured';
    
    const status = config.messageId ? '🟢 `Active`' : '⚪ `Not Deployed`';
    
    embed.addFields({
      name: `${name} ${status}`,
      value: rolesText,
      inline: true
    });
  }

  embed.setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function verifyUser(message, args) {
  if (!isAdmin(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need Administrator permissions to use this command.')] });
  }

  if (args.length < 1) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '✅ Verify User', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=verify <@user or userId>`')
      .addFields({
        name: '📋 Example',
        value: '```=verify @Shadow\n=verify 123456789012345678```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const userId = args[0].replace(/[<@!>]/g, '');
  
  try {
    const member = await message.guild.members.fetch(userId);
    
    if (dataStore.isVerified(message.guild.id, userId)) {
      return message.reply({ embeds: [createErrorEmbed('This user is already verified.')] });
    }

    const verifyRoleId = dataStore.getVerifyRole(message.guild.id);
    if (verifyRoleId) {
      const role = message.guild.roles.cache.get(verifyRoleId);
      if (role) {
        await member.roles.add(role);
      }
    }

    dataStore.addVerifiedUser(message.guild.id, userId);

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '✅ User Verified', iconURL: client.user.displayAvatarURL() })
      .setDescription(`${member} has been manually verified.`)
      .setFooter({ text: `Verified by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Could not find that user.')] });
  }
}

async function unverifyUser(message, args) {
  if (!isAdmin(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need Administrator permissions to use this command.')] });
  }

  if (args.length < 1) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '❌ Unverify User', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=unverify <@user or userId>`')
      .addFields({
        name: '📋 Example',
        value: '```=unverify @Shadow\n=unverify 123456789012345678```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  const userId = extractId(args[0]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention or ID')] });
  
  try {
    const member = await message.guild.members.fetch(userId);
    
    if (!dataStore.isVerified(message.guild.id, userId)) {
      return message.reply({ embeds: [createErrorEmbed('This user is not verified.')] });
    }

    const verifyRoleId = dataStore.getVerifyRole(message.guild.id);
    if (verifyRoleId) {
      const role = message.guild.roles.cache.get(verifyRoleId);
      if (role) {
        await member.roles.remove(role);
      }
    }

    dataStore.removeVerifiedUser(message.guild.id, userId);

    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setAuthor({ name: '❌ User Unverified', iconURL: client.user.displayAvatarURL() })
      .setDescription(`${member}'s verification has been removed.`)
      .setFooter({ text: `Unverified by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Could not find that user.')] });
  }
}

async function sendVerifyPanel(message, args) {
  if (!isAdmin(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need Administrator permissions to use this command.')] });
  }

  if (args.length >= 1) {
    const roleId = args[0].replace(/[<@&>]/g, '');
    const role = message.guild.roles.cache.get(roleId);
    if (role) {
      dataStore.setVerifyRole(message.guild.id, roleId);
    }
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
    .setTitle('🔐 Verification Required')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Click the button below to verify yourself and gain access to the server.\n\n━━━━━━━━━━━━━━━━━━━━━━')
    .setFooter({ text: '🛡️ Verification System' })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId('verify_button')
    .setLabel('Verify')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅');

  const row = new ActionRowBuilder().addComponents(button);

  await message.channel.send({ embeds: [embed], components: [row] });
  await message.delete().catch(() => {});
}

async function messageCount(message) {
  if (!isAdmin(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need Administrator permissions to use this command.')] });
  }

  const count = dataStore.getMessageCount(message.guild.id);

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: '📊 Message Statistics', iconURL: client.user.displayAvatarURL() })
    .addFields(
      { name: '💬 Total Messages', value: `\`\`\`${count.toLocaleString()}\`\`\``, inline: false }
    )
    .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function warnUser(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const userId = extractId(args[0]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention')] });
  const user = await message.guild.members.fetch(userId);
  const reason = args.slice(1).join(' ') || 'No reason';
  dataStore.addWarning(message.guild.id, user.id, reason);
  await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`⚠️ ${user} warned: ${reason}`).setTimestamp()] });
}

async function checkWarnings(message, args) {
  const userId = args[0] ? extractId(args[0]) : message.author.id;
  const warns = dataStore.getWarnings(message.guild.id, userId);
  const embed = new EmbedBuilder().setColor(COLORS.primary).setTitle(`⚠️ Warnings [${warns.length}]`);
  if (warns.length === 0) {
    embed.setDescription('✅ No warnings');
  } else {
    embed.setDescription(warns.map((w, i) => `${i + 1}. ${w.reason}`).join('\n'));
  }
  await message.reply({ embeds: [embed.setTimestamp()] });
}

async function clearWarnUser(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const userId = extractId(args[0]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention')] });
  const user = await message.guild.members.fetch(userId);
  dataStore.clearWarnings(message.guild.id, user.id);
  await message.reply({ embeds: [createSuccessEmbed('Warnings Cleared', `${user}'s warnings cleared`)] });
}

async function kickUser(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const userId = extractId(args[0]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention')] });
  const user = await message.guild.members.fetch(userId);
  const reason = args.slice(1).join(' ') || 'No reason';
  await user.kick(reason);
  await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`👢 ${user} kicked: ${reason}`).setTimestamp()] });
}

async function banUser(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const userId = extractId(args[0]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention')] });
  const reason = args.slice(1).join(' ') || 'No reason';
  await message.guild.members.ban(userId, { reason });
  await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setDescription(`🔨 User banned: ${reason}`).setTimestamp()] });
}

async function unbanUser(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const userId = args[0];
  await message.guild.bans.remove(userId);
  await message.reply({ embeds: [createSuccessEmbed('User Unbanned', 'User has been unbanned')] });
}

async function muteUser(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const userId = extractId(args[0]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention')] });
  const user = await message.guild.members.fetch(userId);
  await user.timeout(parseInt(args[1]) * 60000 || 3600000);
  await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`🔇 ${user} muted`).setTimestamp()] });
}

async function unmuteUser(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const userId = extractId(args[0]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention')] });
  const user = await message.guild.members.fetch(userId);
  await user.timeout(null);
  await message.reply({ embeds: [createSuccessEmbed('User Unmuted', `${user} is now unmuted`)] });
}

async function clearMessages(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const count = parseInt(args[0]) || 10;
  const deleted = await message.channel.bulkDelete(count);
  try {
    await message.reply({ embeds: [createSuccessEmbed('Purged', `🗑️ Deleted ${deleted.size} messages`)] });
  } catch {
    await message.channel.send({ embeds: [createSuccessEmbed('Purged', `🗑️ Deleted ${deleted.size} messages`)] });
  }
}

async function eightBall(message, args) {
  const responses = ['Yes', 'No', 'Maybe', 'Ask again later', 'Definitely', 'Absolutely not', 'Without a doubt', 'Don\'t count on it'];
  const answer = responses[Math.floor(Math.random() * responses.length)];
  await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle('🎱 Magic 8 Ball').setDescription(`**${answer}**`).setTimestamp()] });
}

async function rollDice(message, args) {
  const dice = args[0] || '1d6';
  const [num, sides] = dice.split('d').map(Number);
  if (!num || !sides) return message.reply({ embeds: [createErrorEmbed('Usage: =dice 1d6')] });
  let total = 0;
  for (let i = 0; i < num; i++) total += Math.floor(Math.random() * sides) + 1;
  await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('🎲 Dice Roll').setDescription(`**${dice}**: \`${total}\``).setTimestamp()] });
}

async function flipCoin(message) {
  const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
  await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('🪙 Coin Flip').setDescription(`**${result}**`).setTimestamp()] });
}

async function getJoke(message) {
  try {
    const res = await axios.get('https://api.adviceslip.com/advice');
    await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle('😂 Random Advice').setDescription(`*${res.data.slip.advice}*`).setTimestamp()] });
  } catch {
    message.reply({ embeds: [createErrorEmbed('Failed to fetch joke')] });
  }
}

async function getQuote(message) {
  try {
    const res = await axios.get('https://api.quotable.io/random');
    await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle('💭 Random Quote').setDescription(`*"${res.data.content}"*\n— ${res.data.author}`).setTimestamp()] });
  } catch {
    message.reply({ embeds: [createErrorEmbed('Failed to fetch quote')] });
  }
}

async function giveReputation(message, args) {
  const userId = extractId(args[0]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention')] });
  const user = await message.guild.members.fetch(userId);
  dataStore.addReputation(user.id, 1);
  const rep = dataStore.getReputation(user.id);
  await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setDescription(`⭐ +1 Rep for ${user} | Total: ${rep}`).setTimestamp()] });
}

async function getReputationCommand(message, args) {
  const userId = args[0] ? extractId(args[0]) : message.author.id;
  const rep = dataStore.getReputation(userId);
  await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.primary).setTitle('⭐ Reputation').setDescription(`**${rep} rep points**`).setTimestamp()] });
}

async function createPoll(message, args) {
  const question = args.join(' ');
  if (!question) return message.reply({ embeds: [createErrorEmbed('Usage: =poll Your question here')] });
  const poll = await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.primary).setTitle('📊 Poll').setDescription(question).setTimestamp()] });
  await poll.react('👍');
  await poll.react('👎');
}

async function botInfo(message) {
  const uptime = Math.floor((Date.now() - dataStore.getUptime()) / 1000);
  const hours = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);
  const secs = uptime % 60;
  await message.reply({ embeds: [new EmbedBuilder().setColor(0x2C3E50).setAuthor({name: 'BOT INFORMATION', iconURL: client.user.displayAvatarURL()}).addFields(
    {name: 'Bot Name', value: client.user.tag, inline: true},
    {name: 'Status', value: 'Online', inline: true},
    {name: 'Uptime', value: `${hours}h ${mins}m ${secs}s`, inline: true},
    {name: 'Active Servers', value: `${client.guilds.cache.size}`, inline: true},
    {name: '\u200b', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false},
    {name: 'My Prefix =', value: 'Official Discord Bot Of **World Of Gamers**\nMade By 4w2x For You <3', inline: false}
  ).setTimestamp()] });
}

async function getWeather(message, args) {
  const city = args.join(' ');
  if (!city) return message.reply({ embeds: [createErrorEmbed('Usage: =weather London')] });
  try {
    const geoRes = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
      params: { name: city, count: 1, language: 'en', format: 'json' },
      timeout: 5000
    });
    
    if (!geoRes.data.results || geoRes.data.results.length === 0) {
      return message.reply({ embeds: [createErrorEmbed('City not found')] });
    }
    
    const locationData = geoRes.data.results[0];
    const lat = locationData.latitude;
    const lon = locationData.longitude;
    const cityName = locationData.name;
    const country = locationData.country || '';
    
    const weatherRes = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
        timezone: 'auto'
      },
      timeout: 5000
    });
    
    const current = weatherRes.data.current;
    const temp = Math.round(current.temperature_2m);
    const humidity = current.relative_humidity_2m;
    const windSpeed = Math.round(current.wind_speed_10m);
    
    const weatherDescriptions = {
      0: '☀️ Clear',
      1: '🌤️ Partly Cloudy',
      2: '⛅ Cloudy',
      3: '☁️ Overcast',
      45: '🌫️ Foggy',
      48: '🌫️ Foggy',
      51: '🌧️ Light Rain',
      53: '🌧️ Rain',
      55: '🌧️ Heavy Rain',
      61: '🌧️ Rainy',
      63: '🌧️ Heavy Rain',
      65: '⛈️ Thunderstorm',
      71: '❄️ Snowy',
      73: '❄️ Snow',
      75: '❄️ Heavy Snow',
      77: '❄️ Snow',
      80: '🌧️ Showers',
      81: '🌧️ Heavy Showers',
      82: '⛈️ Thunderstorm',
      85: '❄️ Snow Showers',
      86: '❄️ Heavy Snow',
      95: '⛈️ Thunderstorm',
      96: '⛈️ Thunderstorm',
      99: '⛈️ Thunderstorm'
    };
    
    const weather = weatherDescriptions[current.weather_code] || '🌡️ Unknown';
    
    await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle(`🌤️ Weather - ${cityName}, ${country}`).addFields(
      {name: '🌡️ Temperature', value: `${temp}°C`, inline: true},
      {name: '💧 Humidity', value: `${humidity}%`, inline: true},
      {name: '💨 Wind Speed', value: `${windSpeed} km/h`, inline: true},
      {name: '⛅ Condition', value: weather, inline: true}
    ).setTimestamp()] });
  } catch (err) {
    message.reply({ embeds: [createErrorEmbed('City not found. Try another city like London, Karachi, or New York.')] });
  }
}

async function addRoleCommand(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  
  if (args.length < 2) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: 'ADD ROLE', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=addrole <@user> <@role>`')
      .addFields({
        name: 'Example',
        value: '```=addrole @User @Admin\n=addrole @Shadow @Moderator```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
  
  const userId = extractId(args[0]);
  const roleId = extractId(args[1]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('❌ Invalid user mention. Use: =addrole @user @role')] });
  if (!roleId) return message.reply({ embeds: [createErrorEmbed('❌ Invalid role mention. Use: =addrole @user @role')] });
  try {
    const user = await message.guild.members.fetch(userId);
    const role = message.guild.roles.cache.get(roleId);
    if (!role) return message.reply({ embeds: [createErrorEmbed('Role not found')] });
    await user.roles.add(role);
    await message.reply({ embeds: [createSuccessEmbed('Role Added', `✅ ${role.name} added to ${user}`)] });
  } catch (err) {
    message.reply({ embeds: [createErrorEmbed(`❌ Error: ${err.message || 'Could not add role. Check bot/role permissions.'}`)] });
  }
}

async function removeRoleCommand(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const userId = extractId(args[0]);
  const roleId = extractId(args[1]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention')] });
  if (!roleId) return message.reply({ embeds: [createErrorEmbed('Invalid role mention')] });
  try {
    const user = await message.guild.members.fetch(userId);
    const role = message.guild.roles.cache.get(roleId);
    if (!role) return message.reply({ embeds: [createErrorEmbed('Role not found')] });
    await user.roles.remove(role);
    await message.reply({ embeds: [createSuccessEmbed('Role Removed', `✅ ${role.name} removed from ${user}`)] });
  } catch (err) {
    message.reply({ embeds: [createErrorEmbed('Could not remove role. Check permissions.')] });
  }
}

async function timeoutUser(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const userId = extractId(args[0]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention')] });
  try {
    const user = await message.guild.members.fetch(userId);
    const minutes = parseInt(args[1]) || 60;
    await user.timeout(minutes * 60000);
    await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`⏱️ ${user} timed out for ${minutes} minutes`).setTimestamp()] });
  } catch (err) {
    message.reply({ embeds: [createErrorEmbed('Could not timeout user. Check permissions.')] });
  }
}

async function changeNickname(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const userId = extractId(args[0]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention')] });
  try {
    const user = await message.guild.members.fetch(userId);
    const nickname = args.slice(1).join(' ') || null;
    await user.setNickname(nickname);
    const text = nickname ? `changed to **${nickname}**` : 'reset';
    await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setDescription(`📝 Nickname ${text} for ${user}`).setTimestamp()] });
  } catch (err) {
    message.reply({ embeds: [createErrorEmbed('Could not change nickname. Check permissions.')] });
  }
}
// ==================== NEW MINI GAMES ====================

// 🎌 Flag Guessing Game
async function flagGameCommand(message, args) {
  const difficulty = args[0]?.toLowerCase() || 'easy';
  let countryCount = 5;
  
  if (difficulty === 'hard') countryCount = 10;
  else if (difficulty === 'extreme') countryCount = 15;
  
  const selectedCountries = [];
  const selectedFlags = [];
  
  while (selectedCountries.length < countryCount) {
    const randomCountry = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    if (!selectedCountries.includes(randomCountry)) {
      selectedCountries.push(randomCountry);
      selectedFlags.push(randomCountry.flag);
    }
  }
  
  const gameId = `${message.channel.id}_${message.author.id}`;
  const gameData = {
    type: 'flag',
    countries: selectedCountries,
    flags: selectedFlags,
    currentRound: 0,
    score: 0,
    startTime: Date.now(),
    difficulty: difficulty
  };
  
  activeGames.set(gameId, gameData);
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ name: '🎌 Flag Guessing Game', iconURL: message.author.displayAvatarURL() })
    .setDescription(`**Difficulty:** ${difficulty.toUpperCase()}\n**Rounds:** ${countryCount}\n\nGuess the country for each flag!`)
    .addFields(
      { name: '🏆 Scoring', value: '• Correct guess: 10 XP\n• Bonus for speed: Up to 5 XP\n• Perfect game bonus: 50 XP', inline: false },
      { name: '🎯 How to Play', value: 'Type the country name when a flag appears!\nType `quit` to end the game.', inline: false }
    )
    .setFooter({ text: 'Game starting in 5 seconds...' })
    .setTimestamp();
  
  const msg = await message.reply({ embeds: [embed] });
  gameData.messageId = msg.id;
  
  setTimeout(() => startFlagRound(message, gameId, msg), 5000);
}

async function startFlagRound(message, gameId, gameMessage) {
  const gameData = activeGames.get(gameId);
  if (!gameData) return;
  
  if (gameData.currentRound >= gameData.countries.length) {
    await endFlagGame(message, gameId, gameMessage);
    return;
  }
  
  const currentCountry = gameData.countries[gameData.currentRound];
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ name: `🎌 Round ${gameData.currentRound + 1}/${gameData.countries.length}`, iconURL: message.author.displayAvatarURL() })
    .setDescription(`**Flag:** ${currentCountry.flag}\n\nGuess the country name!`)
    .setFooter({ text: `Difficulty: ${gameData.difficulty.toUpperCase()} | Type your answer below` })
    .setTimestamp();
  
  await gameMessage.edit({ embeds: [embed] });
  gameData.roundStartTime = Date.now();
}

async function handleFlagGuess(message, gameId, guess) {
  const gameData = activeGames.get(gameId);
  if (!gameData) return;
  
  const currentCountry = gameData.countries[gameData.currentRound];
  const guessLower = guess.toLowerCase();
  const countryLower = currentCountry.name.toLowerCase();
  
  let isCorrect = false;
  let xpEarned = 0;
  
  // Check if guess is correct
  if (guessLower === countryLower || guessLower === currentCountry.code.toLowerCase()) {
    isCorrect = true;
    gameData.score++;
    
    // Calculate XP based on speed
    const timeTaken = Date.now() - gameData.roundStartTime;
    let baseXP = 10;
    let speedBonus = 0;
    
    if (timeTaken < 5000) speedBonus = 5;
    else if (timeTaken < 10000) speedBonus = 3;
    else if (timeTaken < 15000) speedBonus = 1;
    
    xpEarned = baseXP + speedBonus;
    
    // Add XP to user
    const xpResult = addXP(message.author.id, message.guild.id, xpEarned, 'flag_game');
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '✅ Correct!', iconURL: message.author.displayAvatarURL() })
      .setDescription(`**Country:** ${currentCountry.name} ${currentCountry.flag}`)
      .addFields(
        { name: '🎯 Score', value: `${gameData.score}/${gameData.countries.length}`, inline: true },
        { name: '⭐ XP Earned', value: `${xpEarned} XP`, inline: true },
        { name: '⏱️ Time', value: `${(timeTaken / 1000).toFixed(1)}s`, inline: true }
      )
      .setFooter({ text: xpResult.levelUp ? `🎉 Leveled up to ${xpResult.level}!` : `Total XP: ${xpResult.xp}` })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  } else {
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setAuthor({ name: '❌ Incorrect', iconURL: message.author.displayAvatarURL() })
      .setDescription(`The correct answer was: **${currentCountry.name}** ${currentCountry.flag}`)
      .addFields(
        { name: '🎯 Score', value: `${gameData.score}/${gameData.countries.length}`, inline: true },
        { name: '🤔 Your Guess', value: guess, inline: true }
      )
      .setFooter({ text: 'Better luck next round!' })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
  
  gameData.currentRound++;
  
  // Start next round after 3 seconds
  setTimeout(async () => {
    const gameMessage = await message.channel.messages.fetch(gameData.messageId).catch(() => null);
    if (gameMessage) {
      await startFlagRound(message, gameId, gameMessage);
    }
  }, 3000);
}

async function endFlagGame(message, gameId, gameMessage) {
  const gameData = activeGames.get(gameId);
  if (!gameData) return;
  
  const totalTime = Date.now() - gameData.startTime;
  const minutes = Math.floor(totalTime / 60000);
  const seconds = Math.floor((totalTime % 60000) / 1000);
  
  let finalXP = gameData.score * 10;
  let bonusXP = 0;
  
  // Perfect game bonus
  if (gameData.score === gameData.countries.length) {
    bonusXP = 50;
    finalXP += bonusXP;
  }
  
  // Difficulty bonus
  if (gameData.difficulty === 'hard') bonusXP += 20;
  else if (gameData.difficulty === 'extreme') bonusXP += 40;
  
  finalXP += bonusXP;
  
  // Add final XP
  const xpResult = addXP(message.author.id, message.guild.id, finalXP, 'flag_game_complete');
  
  const embed = new EmbedBuilder()
    .setColor(gameData.score === gameData.countries.length ? COLORS.xp : COLORS.primary)
    .setAuthor({ name: '🏁 Game Complete!', iconURL: message.author.displayAvatarURL() })
    .setTitle(`🎌 Flag Guessing Game - ${gameData.difficulty.toUpperCase()}`)
    .addFields(
      { name: '🏆 Final Score', value: `${gameData.score}/${gameData.countries.length}`, inline: true },
      { name: '⭐ Total XP', value: `${finalXP} XP`, inline: true },
      { name: '⏱️ Time', value: `${minutes}m ${seconds}s`, inline: true },
      { name: '📊 Accuracy', value: `${((gameData.score / gameData.countries.length) * 100).toFixed(1)}%`, inline: false }
    )
    .setFooter({ 
      text: xpResult.levelUp ? 
        `🎉 Leveled up to ${xpResult.level}! Total XP: ${xpResult.xp}` : 
        `Total XP: ${xpResult.xp} | Level: ${xpResult.level}` 
    })
    .setTimestamp();
  
  if (gameData.score === gameData.countries.length) {
    embed.setDescription('**🎯 PERFECT GAME!** 🎯\nYou got every flag correct!');
  }
  
  await gameMessage.edit({ embeds: [embed] });
  activeGames.delete(gameId);
}

// 🐾 Animal Guessing Game
async function animalGameCommand(message, args) {
  const gameId = `${message.channel.id}_${message.author.id}`;
  
  if (activeGames.has(gameId)) {
    return message.reply({ embeds: [createErrorEmbed('You already have an active game!')] });
  }
  
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const scrambled = animal.split('').sort(() => Math.random() - 0.5).join('');
  
  const gameData = {
    type: 'animal',
    answer: animal,
    scrambled: scrambled,
    attempts: 0,
    maxAttempts: 5,
    hintsUsed: 0,
    startTime: Date.now()
  };
  
  activeGames.set(gameId, gameData);
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ name: '🐾 Animal Guessing Game', iconURL: message.author.displayAvatarURL() })
    .setDescription(`**Scrambled Word:** \`${scrambled.toUpperCase()}\``)
    .addFields(
      { name: '🎯 How to Play', value: 'Unscramble the letters to guess the animal name!\n\n**Commands:**\n`hint` - Get a hint\n`skip` - Skip this animal\n`quit` - End game', inline: false },
      { name: '🏆 Scoring', value: '• Correct guess: 15 XP\n• Bonus for fewer attempts\n• Hint penalty: -3 XP per hint', inline: false }
    )
    .setFooter({ text: `Attempts: 0/${gameData.maxAttempts} | Type your guess below` })
    .setTimestamp();
  
  const msg = await message.reply({ embeds: [embed] });
  gameData.messageId = msg.id;
}

async function handleAnimalGuess(message, gameId, guess) {
  const gameData = activeGames.get(gameId);
  if (!gameData) return;
  
  if (guess.toLowerCase() === 'hint') {
    gameData.hintsUsed++;
    const hint = gameData.answer.substring(0, Math.min(gameData.hintsUsed + 2, gameData.answer.length));
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '💡 Hint', iconURL: message.author.displayAvatarURL() })
      .setDescription(`Starts with: **${hint.toUpperCase()}**\n\nScrambled: \`${gameData.scrambled.toUpperCase()}\``)
      .setFooter({ text: `Hint ${gameData.hintsUsed}/3 | -3 XP per hint` })
      .setTimestamp();
    await message.reply({ embeds: [embed] });
    return;
  }
  
  if (guess.toLowerCase() === 'skip') {
    activeGames.delete(gameId);
    await message.reply({ embeds: [createErrorEmbed(`Skipped! The animal was: **${gameData.answer.toUpperCase()}**`)] });
    setTimeout(() => animalGameCommand(message, []), 2000);
    return;
  }
  
  gameData.attempts++;
  
  if (guess.toLowerCase() === gameData.answer.toLowerCase()) {
    // Calculate XP
    let xpEarned = 15;
    if (gameData.attempts <= 2) xpEarned += 10; // Quick guess bonus
    else if (gameData.attempts <= 3) xpEarned += 5;
    
    // Penalty for hints
    xpEarned -= (gameData.hintsUsed * 3);
    if (xpEarned < 5) xpEarned = 5; // Minimum XP
    
    const xpResult = addXP(message.author.id, message.guild.id, xpEarned, 'animal_game');
    const timeTaken = Date.now() - gameData.startTime;
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '✅ Correct!', iconURL: message.author.displayAvatarURL() })
      .setDescription(`**Animal:** ${gameData.answer.toUpperCase()}`)
      .addFields(
        { name: '🎯 Attempts', value: `${gameData.attempts}`, inline: true },
        { name: '💡 Hints Used', value: `${gameData.hintsUsed}`, inline: true },
        { name: '⭐ XP Earned', value: `${xpEarned} XP`, inline: true },
        { name: '⏱️ Time', value: `${(timeTaken / 1000).toFixed(1)}s`, inline: true }
      )
      .setFooter({ text: xpResult.levelUp ? `🎉 Leveled up to ${xpResult.level}!` : `Total XP: ${xpResult.xp}` })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    activeGames.delete(gameId);
    
    // Start new game after 5 seconds
    setTimeout(() => animalGameCommand(message, []), 5000);
  } else {
    if (gameData.attempts >= gameData.maxAttempts) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.error)
        .setAuthor({ name: '❌ Game Over', iconURL: message.author.displayAvatarURL() })
        .setDescription(`The animal was: **${gameData.answer.toUpperCase()}**`)
        .addFields(
          { name: '📊 Stats', value: `Attempts: ${gameData.attempts}\nHints Used: ${gameData.hintsUsed}`, inline: true }
        )
        .setFooter({ text: 'Better luck next time!' })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      activeGames.delete(gameId);
    } else {
      const embed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setAuthor({ name: '❌ Incorrect', iconURL: message.author.displayAvatarURL() })
        .setDescription(`**Scrambled Word:** \`${gameData.scrambled.toUpperCase()}\``)
        .addFields(
          { name: '🎯 Attempts', value: `${gameData.attempts}/${gameData.maxAttempts}`, inline: true },
          { name: '💡 Hint', value: 'Type `hint` for a clue', inline: true }
        )
        .setFooter({ text: `Keep trying! The answer is ${gameData.answer.length} letters long` })
        .setTimestamp();
      
      const gameMessage = await message.channel.messages.fetch(gameData.messageId).catch(() => null);
      if (gameMessage) {
        await gameMessage.edit({ embeds: [embed] });
      }
    }
  }
}

// 🎭 Hangman Game
async function hangmanGameCommand(message, args) {
  const gameId = `${message.channel.id}_${message.author.id}`;
  
  if (activeGames.has(gameId)) {
    return message.reply({ embeds: [createErrorEmbed('You already have an active game!')] });
  }
  
  const categories = {
    animals: ANIMALS,
    countries: COUNTRIES.map(c => c.name.toLowerCase()),
    fruits: ['apple', 'banana', 'orange', 'grape', 'mango', 'pineapple', 'watermelon', 'strawberry'],
    sports: ['football', 'basketball', 'cricket', 'tennis', 'baseball', 'hockey', 'rugby', 'golf']
  };
  
  const category = args[0]?.toLowerCase() || 'animals';
  const wordList = categories[category] || categories.animals;
  const word = wordList[Math.floor(Math.random() * wordList.length)].toLowerCase();
  
  const gameData = {
    type: 'hangman',
    word: word,
    guessedLetters: [],
    incorrectGuesses: 0,
    maxIncorrect: 6,
    category: category,
    startTime: Date.now()
  };
  
  activeGames.set(gameId, gameData);
  
  await displayHangman(message, gameId);
}

async function displayHangman(message, gameId) {
  const gameData = activeGames.get(gameId);
  if (!gameData) return;
  
  const wordDisplay = gameData.word.split('').map(letter => 
    gameData.guessedLetters.includes(letter) ? letter : '_'
  ).join(' ');
  
  const incorrectLetters = gameData.guessedLetters.filter(l => !gameData.word.includes(l));
  const hangmanStages = [
    '⬜⬜⬜\n⬜      \n⬜      ',
    '⬜⬜⬜\n⬜     😶\n⬜      ',
    '⬜⬜⬜\n⬜     😶\n⬜     👕',
    '⬜⬜⬜\n⬜     😶\n⬜     👕\n       👖',
    '⬜⬜⬜\n⬜     😶\n⬜     👕\n       👖\n      👟👟',
    '⬜⬜⬜\n⬜     😶\n⬜     👕\n       👖\n      👟👟\n      💀'
  ];
  
  const hangman = hangmanStages[gameData.incorrectGuesses] || hangmanStages[0];
  
  const embed = new EmbedBuilder()
    .setColor(gameData.incorrectGuesses >= 5 ? COLORS.error : COLORS.game)
    .setAuthor({ name: '🎭 Hangman Game', iconURL: message.author.displayAvatarURL() })
    .setDescription(`**Category:** ${gameData.category.toUpperCase()}`)
    .addFields(
      { name: '📝 Word', value: `\`${wordDisplay}\``, inline: false },
      { name: '🚫 Incorrect Guesses', value: incorrectLetters.length > 0 ? incorrectLetters.join(', ') : 'None', inline: true },
      { name: '💀 Lives', value: `${gameData.maxIncorrect - gameData.incorrectGuesses}/${gameData.maxIncorrect}`, inline: true }
    )
    .addFields({ name: '🎨 Hangman', value: `\`\`\`${hangman}\`\`\``, inline: false })
    .setFooter({ text: `Guess a letter or type "quit" to end | Letters used: ${gameData.guessedLetters.length}` })
    .setTimestamp();
  
  const gameMessage = await message.channel.send({ embeds: [embed] });
  gameData.messageId = gameMessage.id;
}

async function handleHangmanGuess(message, gameId, guess) {
  const gameData = activeGames.get(gameId);
  if (!gameData) return;
  
  if (guess.length !== 1 || !/[a-z]/i.test(guess)) {
    await message.reply({ embeds: [createErrorEmbed('Please guess a single letter!')] });
    return;
  }
  
  const letter = guess.toLowerCase();
  
  if (gameData.guessedLetters.includes(letter)) {
    await message.reply({ embeds: [createErrorEmbed(`You already guessed "${letter}"!`)] });
    return;
  }
  
  gameData.guessedLetters.push(letter);
  
  if (!gameData.word.includes(letter)) {
    gameData.incorrectGuesses++;
  }
  
  // Check win/lose conditions
  const wordGuessed = gameData.word.split('').every(l => gameData.guessedLetters.includes(l));
  const livesLeft = gameData.maxIncorrect - gameData.incorrectGuesses;
  
  if (wordGuessed) {
    // Win!
    let xpEarned = 20;
    if (livesLeft >= 4) xpEarned += 10; // Bonus for many lives left
    
    const xpResult = addXP(message.author.id, message.guild.id, xpEarned, 'hangman_win');
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '🎉 You Win!', iconURL: message.author.displayAvatarURL() })
      .setDescription(`**Word:** ${gameData.word.toUpperCase()}`)
      .addFields(
        { name: '🎯 Guesses', value: `${gameData.guessedLetters.length} letters`, inline: true },
        { name: '💀 Lives Left', value: `${livesLeft}`, inline: true },
        { name: '⭐ XP Earned', value: `${xpEarned} XP`, inline: true }
      )
      .setFooter({ text: xpResult.levelUp ? `🎉 Leveled up to ${xpResult.level}!` : 'Great job!' })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    activeGames.delete(gameId);
  } else if (livesLeft <= 0) {
    // Lose
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setAuthor({ name: '💀 Game Over', iconURL: message.author.displayAvatarURL() })
      .setDescription(`**The word was:** ${gameData.word.toUpperCase()}`)
      .addFields(
        { name: '🎯 Guesses', value: `${gameData.guessedLetters.length} letters`, inline: true },
        { name: '📝 Word', value: gameData.word.split('').map(l => gameData.guessedLetters.includes(l) ? l : '_').join(' '), inline: true }
      )
      .setFooter({ text: 'Better luck next time!' })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    activeGames.delete(gameId);
  } else {
    // Continue game
    await displayHangman(message, gameId);
  }
}

// ==================== XP SYSTEM COMMANDS ====================

async function rankCommand(message, args) {
  const userId = args[0] ? extractId(args[0]) : message.author.id;
  const user = await message.guild.members.fetch(userId).catch(() => null);
  if (!user) return message.reply({ embeds: [createErrorEmbed('User not found')] });
  
  const xpData = dataStore.getUserXP(message.guild.id, user.id) || { xp: 0, level: 1 };
  const levelData = getLevelFromXP(xpData.xp);
  const progress = Math.floor((xpData.xp % XP_CONFIG.LEVEL_MULTIPLIER) / XP_CONFIG.LEVEL_MULTIPLIER * 100);
  
  // Get rank position
  const allXP = dataStore.getAllXP(message.guild.id);
  const sortedUsers = Object.entries(allXP)
    .sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0));
  
  const rank = sortedUsers.findIndex(([id]) => id === user.id) + 1;
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.xp)
    .setAuthor({ name: `${user.user.tag}'s Rank`, iconURL: user.user.displayAvatarURL() })
    .setThumbnail(user.user.displayAvatarURL())
    .addFields(
      { name: '📊 Rank', value: `#${rank}`, inline: true },
      { name: '⭐ Level', value: `${levelData.level}`, inline: true },
      { name: '🎯 XP', value: `${xpData.xp}`, inline: true },
      { name: '📈 Progress', value: `${progress}% to Level ${levelData.level + 1}`, inline: false },
      { name: '🎯 Next Level', value: `${levelData.nextLevelXP - xpData.xp} XP needed`, inline: false }
    )
    .setFooter({ text: `Ranking: ${rank}/${sortedUsers.length} players` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function leaderboardCommand(message, args) {
  const allXP = dataStore.getAllXP(message.guild.id);
  const sortedUsers = Object.entries(allXP)
    .sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0))
    .slice(0, 10);
  
  let leaderboardText = '';
  for (let i = 0; i < sortedUsers.length; i++) {
    const [userId, data] = sortedUsers[i];
    const user = await message.guild.members.fetch(userId).catch(() => ({ user: { tag: 'Unknown User' } }));
    const levelData = getLevelFromXP(data.xp || 0);
    
    const medals = ['🥇', '🥈', '🥉'];
    const medal = i < 3 ? medals[i] : `**${i + 1}.**`;
    
    leaderboardText += `${medal} **${user.user.tag}** - Level ${levelData.level} (${data.xp || 0} XP)\n`;
  }
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.xp)
    .setAuthor({ name: '🏆 XP Leaderboard', iconURL: message.guild.iconURL() })
    .setDescription(leaderboardText || 'No XP data yet! Start chatting to earn XP!')
    .setFooter({ text: 'Earn XP by chatting and playing games!' })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function dailyCommand(message) {
  const userId = message.author.id;
  const guildId = message.guild.id;
  const lastDaily = dataStore.getDailyCooldown(userId, guildId);
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000; // 24 hours
  
  if (now - lastDaily < cooldown) {
    const nextDaily = lastDaily + cooldown;
    const hoursLeft = Math.ceil((nextDaily - now) / (60 * 60 * 1000));
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setAuthor({ name: '⏰ Daily Reward', iconURL: message.author.displayAvatarURL() })
      .setDescription(`You've already claimed your daily reward today!\n\n**Next daily in:** ${hoursLeft} hours`)
      .setFooter({ text: 'Come back tomorrow!' })
      .setTimestamp();
    
    return message.reply({ embeds: [embed] });
  }
  
  // Give daily reward
  const xpResult = addXP(userId, guildId, XP_CONFIG.DAILY_BONUS, 'daily_reward');
  dataStore.setDailyCooldown(userId, guildId);
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.xp)
    .setAuthor({ name: '🎁 Daily Reward Claimed!', iconURL: message.author.displayAvatarURL() })
    .setDescription(`**+${XP_CONFIG.DAILY_BONUS} XP** added to your account!`)
    .addFields(
      { name: '📊 Total XP', value: `${xpResult.xp}`, inline: true },
      { name: '⭐ Current Level', value: `${xpResult.level}`, inline: true }
    )
    .setFooter({ text: xpResult.levelUp ? `🎉 Leveled up to ${xpResult.level}!` : 'Come back tomorrow for more!' })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function xpInfoCommand(message, args) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.xp)
    .setAuthor({ name: '📊 XP System Information', iconURL: client.user.displayAvatarURL() })
    .addFields(
      { name: '💬 Chatting', value: `${XP_CONFIG.PER_MESSAGE} XP per message`, inline: true },
      { name: '🎮 Games', value: '10-50 XP per game', inline: true },
      { name: '🎁 Daily Bonus', value: `${XP_CONFIG.DAILY_BONUS} XP`, inline: true },
      { name: '📈 Level Up', value: `Every ${XP_CONFIG.LEVEL_MULTIPLIER} XP`, inline: false },
      { name: '🎯 Commands', value: '`=rank` - Check your level\n`=leaderboard` - Server rankings\n`=daily` - Daily reward', inline: false }
    )
    .setFooter({ text: 'Keep chatting and playing games to level up!' })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// ==================== NEW MODERATION COMMANDS ====================

async function lockChannelCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions.')] });
  }
  
  const channel = message.mentions.channels.first() || message.channel;
  const reason = args.slice(1).join(' ') || 'No reason provided';
  
  try {
    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: false,
      AddReactions: false
    });
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setAuthor({ name: '🔒 Channel Locked', iconURL: message.author.displayAvatarURL() })
      .addFields(
        { name: '📌 Channel', value: `${channel}`, inline: true },
        { name: '👤 Moderator', value: `${message.author}`, inline: true },
        { name: '📝 Reason', value: reason, inline: false }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Failed to lock channel. Check permissions.')] });
  }
}

async function unlockChannelCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions.')] });
  }
  
  const channel = message.mentions.channels.first() || message.channel;
  const reason = args.slice(1).join(' ') || 'No reason provided';
  
  try {
    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: null,
      AddReactions: null
    });
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '🔓 Channel Unlocked', iconURL: message.author.displayAvatarURL() })
      .addFields(
        { name: '📌 Channel', value: `${channel}`, inline: true },
        { name: '👤 Moderator', value: `${message.author}`, inline: true },
        { name: '📝 Reason', value: reason, inline: false }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Failed to unlock channel.')] });
  }
}

async function slowmodeCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions.')] });
  }
  
  const channel = message.mentions.channels.first() || message.channel;
  const seconds = parseInt(args[0]);
  
  if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '⏱️ Slowmode', iconURL: client.user.displayAvatarURL() })
      .setDescription('**Usage:** `=slowmode <seconds> [channel]`')
      .addFields(
        { name: '📋 Examples', value: '```\n=slowmode 10\n=slowmode 60 #general\n=slowmode 0 (disable)```' },
        { name: '⚠️ Limit', value: 'Max: 21600 seconds (6 hours)' }
      )
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
  
  try {
    await channel.setRateLimitPerUser(seconds);
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '⏱️ Slowmode Set', iconURL: message.author.displayAvatarURL() })
      .addFields(
        { name: '📌 Channel', value: `${channel}`, inline: true },
        { name: '👤 Moderator', value: `${message.author}`, inline: true },
        { name: '⏰ Delay', value: seconds === 0 ? 'Disabled' : `${seconds} seconds`, inline: true }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Failed to set slowmode. Check permissions.')] });
  }
}

async function nukeChannelCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions.')] });
  }
  
  const channel = message.mentions.channels.first() || message.channel;
  
  const confirmEmbed = new EmbedBuilder()
    .setColor(COLORS.error)
    .setAuthor({ name: '⚠️ Nuke Channel', iconURL: client.user.displayAvatarURL() })
    .setDescription(`Are you sure you want to NUKE **${channel.name}**?\n\nThis will:\n• Delete ALL messages\n• Clone the channel\n• Cannot be undone!\n\nType \`confirm\` to proceed or \`cancel\` to abort.`)
    .setFooter({ text: 'This action is irreversible!' })
    .setTimestamp();
  
  const confirmation = await message.reply({ embeds: [confirmEmbed] });
  
  const filter = m => m.author.id === message.author.id && ['confirm', 'cancel'].includes(m.content.toLowerCase());
  
  try {
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
    const response = collected.first().content.toLowerCase();
    
    if (response === 'cancel') {
      await message.reply({ embeds: [createSuccessEmbed('Action Cancelled', 'Channel nuke cancelled.')] });
      return;
    }
    
    // Create clone
    const clone = await channel.clone();
    await clone.setPosition(channel.position);
    
    // Delete original
    await channel.delete();
    
    const successEmbed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '💥 Channel Nuked', iconURL: message.author.displayAvatarURL() })
      .setDescription(`**${channel.name}** has been nuked and cloned!\n\nNew channel: ${clone}`)
      .setFooter({ text: `Nuked by ${message.author.tag}` })
      .setTimestamp();
    
    await clone.send({ embeds: [successEmbed] });
  } catch (error) {
    await message.reply({ embeds: [createErrorEmbed('Nuke cancelled or timed out.')] });
  }
}

async function snipeCommand(message) {
  const channel = message.mentions.channels.first() || message.channel;
  const messages = deletedMessages.get(channel.id) || [];
  
  if (messages.length === 0) {
    return message.reply({ embeds: [createErrorEmbed('No deleted messages found in this channel.')] });
  }
  
  const latest = messages[0];
  const timeAgo = Math.floor((Date.now() - latest.timestamp) / 1000);
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setAuthor({ name: '📝 Snipe', iconURL: message.author.displayAvatarURL() })
    .setDescription(`**Deleted Message from ${latest.author}**`)
    .addFields(
      { name: '💬 Content', value: latest.content || '*(No text content)*', inline: false },
      { name: '🕐 Deleted', value: `<t:${Math.floor(latest.timestamp / 1000)}:R>`, inline: true },
      { name: '👤 User ID', value: `\`${latest.authorId}\``, inline: true }
    )
    .setFooter({ text: `Showing latest of ${messages.length} deleted messages` })
    .setTimestamp();
  
  if (latest.attachments.length > 0) {
    embed.addFields({ name: '📎 Attachments', value: latest.attachments.join('\n'), inline: false });
  }
  
  await message.reply({ embeds: [embed] });
}

// ==================== BOT STARTUP ====================

client.once('ready', async () => {
  console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  
  // Set bot activity
  client.user.setActivity({
    name: `=help | ${client.guilds.cache.size} servers`,
    type: ActivityType.Playing
  });
  
  // Set status
  client.user.setStatus('online');
});

// Bot login
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
client.login(BOT_TOKEN);

module.exports = { client };
