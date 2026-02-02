const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Partials, SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
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
