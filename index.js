require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

// Create a new Discord client with all necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,                // for guild related events
    GatewayIntentBits.GuildMessages,         // for message events
    GatewayIntentBits.MessageContent,        // for reading message content
    GatewayIntentBits.GuildMembers,          // for member info, moderation commands
    GatewayIntentBits.GuildMessageReactions, // for reaction roles
  ],
  partials: [
    Partials.Message,   // Required for reaction partials
    Partials.Channel,   // Required for reaction partials
    Partials.Reaction   // Required for reaction partials
  ]
});

// Command collection (if your bot.js uses commands dynamically)
client.commands = new Collection();

// Load your full bot.js
require('./src/bot')(client);

// Keep-alive log (Railway friendly)
setInterval(() => console.log('Bot is alive!'), 60000);

// Login the bot
client.login(process.env.DISCORD_TOKEN);

// Optional: Log when ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});
