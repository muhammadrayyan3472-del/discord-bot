const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Partials } = require('discord.js');
const { evaluate } = require('mathjs');
const axios = require('axios');
const dataStore = require('./data');

const PREFIX = '=';

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
  }
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User
  ]
});


client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  if (message.guild) {
    dataStore.incrementMessageCount(message.guild.id);
  }
  
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    switch (command) {
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
    }
  } catch (error) {
    console.error(`Error executing command ${command}:`, error);
    const errorEmbed = createErrorEmbed('An error occurred while processing your request.');
    message.reply({ embeds: [errorEmbed] });
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

  const cmdCount = isOwner || isAdminUser ? '40+' : '23+';
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

async function warnUser(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const user = await message.guild.members.fetch(args[0]?.replace(/[<@!>]/g, ''));
  const reason = args.slice(1).join(' ') || 'No reason';
  dataStore.addWarning(message.guild.id, user.id, reason);
  await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`⚠️ ${user} warned: ${reason}`).setTimestamp()] });
}

async function checkWarnings(message, args) {
  const userId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;
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
  const user = await message.guild.members.fetch(args[0]?.replace(/[<@!>]/g, ''));
  dataStore.clearWarnings(message.guild.id, user.id);
  await message.reply({ embeds: [createSuccessEmbed('Warnings Cleared', `${user}'s warnings cleared`)] });
}

async function kickUser(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const user = await message.guild.members.fetch(args[0]?.replace(/[<@!>]/g, ''));
  const reason = args.slice(1).join(' ') || 'No reason';
  await user.kick(reason);
  await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`👢 ${user} kicked: ${reason}`).setTimestamp()] });
}

async function banUser(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const userId = args[0]?.replace(/[<@!>]/g, '');
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
  const user = await message.guild.members.fetch(args[0]?.replace(/[<@!>]/g, ''));
  await user.timeout(parseInt(args[1]) * 60000 || 3600000);
  await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`🔇 ${user} muted`).setTimestamp()] });
}

async function unmuteUser(message, args) {
  if (!isAdmin(message.member)) return message.reply({ embeds: [createErrorEmbed('Admin only')] });
  const user = await message.guild.members.fetch(args[0]?.replace(/[<@!>]/g, ''));
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
  const user = await message.guild.members.fetch(args[0]?.replace(/[<@!>]/g, ''));
  dataStore.addReputation(user.id, 1);
  const rep = dataStore.getReputation(user.id);
  await message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setDescription(`⭐ +1 Rep for ${user} | Total: ${rep}`).setTimestamp()] });
}

async function getReputationCommand(message, args) {
  const userId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;
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
    // Get city coordinates using geocoding
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
    
    // Get weather using coordinates
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

const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'verify_button') {
      try {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        
        if (dataStore.isVerified(guildId, userId)) {
          return interaction.reply({ content: '✅ You are already verified!', ephemeral: true });
        }
        
        const verifyRoleId = dataStore.getVerifyRole(guildId);
        if (verifyRoleId) {
          const member = await interaction.guild.members.fetch(userId);
          const role = interaction.guild.roles.cache.get(verifyRoleId);
          
          if (role) {
            await member.roles.add(role);
          }
        }
        
        dataStore.addVerifiedUser(guildId, userId);
        
        await interaction.reply({ 
          content: '✅ You have been successfully verified!', 
          ephemeral: true 
        });
      } catch (error) {
        console.error('Error verifying user:', error);
        await interaction.reply({ 
          content: '❌ An error occurred during verification.', 
          ephemeral: true 
        });
      }
    }
  }
  
  if (interaction.isChatInputCommand()) {
    const { commandName, options } = interaction;
    
    if (commandName === 'ping') {
      const latency = client.ws.ping;
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.primary).setAuthor({name: '🎯 Pong!', iconURL: client.user.displayAvatarURL()}).addFields({name: '📡 API Latency', value: `\`${latency}ms\``, inline: false}).setTimestamp()] });
    } else if (commandName === 'avatar') {
      const user = options.getUser('user') || interaction.user;
      const url = user.displayAvatarURL({size: 4096});
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.primary).setAuthor({name: `📸 ${user.tag}'s Avatar`, iconURL: user.displayAvatarURL()}).setImage(url).setTimestamp()] });
    } else if (commandName === 'info') {
      const user = options.getUser('user') || interaction.user;
      const embed = new EmbedBuilder().setColor(COLORS.primary).setAuthor({name: '👤 User Info', iconURL: user.displayAvatarURL()}).setTitle(user.tag).addFields({name: '👤 ID', value: user.id, inline: true}, {name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true}).setThumbnail(user.displayAvatarURL({size: 512})).setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
});

const commands = [
  new SlashCommandBuilder().setName('help').setDescription('View all commands'),
  new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  new SlashCommandBuilder().setName('avatar').setDescription('Get user avatar').addUserOption(option => option.setName('user').setDescription('User').setRequired(false)),
  new SlashCommandBuilder().setName('info').setDescription('Get user info').addUserOption(option => option.setName('user').setDescription('User').setRequired(false)),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

client.once('ready', async () => {
  console.log(`Bot is online! Logged in as ${client.user.tag}`);
  await client.user.setStatus('online');
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash commands registered');
  } catch (error) {
    console.error('Failed to register slash commands:', error);
  }
});

module.exports = { client };
