const { client } = require('./src/bot');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('ERROR: DISCORD_BOT_TOKEN is not set in environment variables.');
  console.log('Please add your Discord bot token to the Secrets tab.');
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
      console.log('4. Scroll down to "Privileged Gateway Intents"');
      console.log('5. Enable these intents:');
      console.log('   - SERVER MEMBERS INTENT');
      console.log('   - MESSAGE CONTENT INTENT');
      console.log('6. Save changes and restart this bot');
      console.log('============================================\n');
    }
    
    process.exit(1);
  });
