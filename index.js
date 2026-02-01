const { client } = require('./src/bot');
const express = require('express');
const app = express();

// Railway requires a port to be bound to keep the service alive
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Bot is running and healthy!');
});

app.listen(PORT, () => {
  console.log(`Web server is listening on port ${PORT}`);
});

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('ERROR: DISCORD_BOT_TOKEN is not set in environment variables.');
  process.exit(1);
}

client.login(BOT_TOKEN)
  .then(() => {
    console.log('Successfully logged in to Discord!');
  })
  .catch((error) => {
    console.error('Failed to login to Discord:', error.message);
    
    if (error.message.includes('disallowed intents')) {
      console.log('\n=== IMPORTANT: Enable Privileged Intents ===');
      console.log('1. Go to https://discord.com/developers/applications');
      console.log('2. Select your bot application');
      console.log('3. Go to the "Bot" section');
      console.log('4. Enable: MESSAGE CONTENT INTENT and SERVER MEMBERS INTENT');
      console.log('============================================\n');
    }
    
    process.exit(1);
  });
