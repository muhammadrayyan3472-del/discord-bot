require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// Load your bot logic
require('./src/bot')(client);

// Keep alive (for Railway)
setInterval(() => console.log('Bot is alive!'), 60000);

client.login(process.env.DISCORD_TOKEN);
