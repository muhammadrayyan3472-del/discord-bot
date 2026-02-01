require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();

// ✅ Just require bot.js (no function call)
require('./src/bot');

// Keep-alive log for Railway
setInterval(() => console.log('Bot is alive!'), 60000);

// Login
client.login(process.env.DISCORD_TOKEN);

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});
