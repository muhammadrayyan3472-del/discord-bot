require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = process.env.PREFIX;

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  // Keep alive log
  setInterval(() => console.log('Bot is alive!'), 60000); // logs every minute
});

client.on('messageCreate', (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const command = message.content.slice(prefix.length).trim().toLowerCase();

  if (command === 'ping') {
    message.channel.send('Pong!');
  }
});

client.login(process.env.DISCORD_TOKEN);
