const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Partials } = require('discord.js');
const { evaluate } = require('mathjs');
const axios = require('axios');
const fs = require('fs');

const PREFIX = '=';

// ==================== ADVANCED XP SYSTEM ====================
const XP_CONFIG = {
  PER_MESSAGE: 1,
  PER_GAME_WIN: 10,
  PER_GAME_PARTICIPATION: 2,
  DAILY_BONUS: 20,
  LEVEL_MULTIPLIER: 150,
  LEVEL_EXPONENT: 1.5,
  MAX_LEVEL: 100
};

// ==================== COUNTRIES BY DIFFICULTY ====================
const COUNTRIES = {
  easy: [ // Popular countries
    { name: 'United States', flag: '🇺🇸', code: 'us' },
    { name: 'United Kingdom', flag: '🇬🇧', code: 'gb' },
    { name: 'Canada', flag: '🇨🇦', code: 'ca' },
    { name: 'Australia', flag: '🇦🇺', code: 'au' },
    { name: 'Germany', flag: '🇩🇪', code: 'de' },
    { name: 'France', flag: '🇫🇷', code: 'fr' },
    { name: 'Japan', flag: '🇯🇵', code: 'jp' },
    { name: 'China', flag: '🇨🇳', code: 'cn' },
    { name: 'India', flag: '🇮🇳', code: 'in' },
    { name: 'Brazil', flag: '🇧🇷', code: 'br' }
  ],
  medium: [ // Less common but still known
    { name: 'Italy', flag: '🇮🇹', code: 'it' },
    { name: 'Spain', flag: '🇪🇸', code: 'es' },
    { name: 'Mexico', flag: '🇲🇽', code: 'mx' },
    { name: 'Russia', flag: '🇷🇺', code: 'ru' },
    { name: 'South Korea', flag: '🇰🇷', code: 'kr' },
    { name: 'Turkey', flag: '🇹🇷', code: 'tr' },
    { name: 'Pakistan', flag: '🇵🇰', code: 'pk' },
    { name: 'Egypt', flag: '🇪🇬', code: 'eg' },
    { name: 'South Africa', flag: '🇿🇦', code: 'za' },
    { name: 'Argentina', flag: '🇦🇷', code: 'ar' }
  ],
  hard: [ // Harder to recognize
    { name: 'Netherlands', flag: '🇳🇱', code: 'nl' },
    { name: 'Switzerland', flag: '🇨🇭', code: 'ch' },
    { name: 'Sweden', flag: '🇸🇪', code: 'se' },
    { name: 'Norway', flag: '🇳🇴', code: 'no' },
    { name: 'Denmark', flag: '🇩🇰', code: 'dk' },
    { name: 'Finland', flag: '🇫🇮', code: 'fi' },
    { name: 'Poland', flag: '🇵🇱', code: 'pl' },
    { name: 'Portugal', flag: '🇵🇹', code: 'pt' },
    { name: 'Greece', flag: '🇬🇷', code: 'gr' },
    { name: 'Thailand', flag: '🇹🇭', code: 'th' }
  ],
  extreme: [ // Very hard flags
    { name: 'Bangladesh', flag: '🇧🇩', code: 'bd' },
    { name: 'Vietnam', flag: '🇻🇳', code: 'vn' },
    { name: 'Philippines', flag: '🇵🇭', code: 'ph' },
    { name: 'Malaysia', flag: '🇲🇾', code: 'my' },
    { name: 'Indonesia', flag: '🇮🇩', code: 'id' },
    { name: 'Saudi Arabia', flag: '🇸🇦', code: 'sa' },
    { name: 'United Arab Emirates', flag: '🇦🇪', code: 'ae' },
    { name: 'Israel', flag: '🇮🇱', code: 'il' },
    { name: 'Iran', flag: '🇮🇷', code: 'ir' },
    { name: 'Ukraine', flag: '🇺🇦', code: 'ua' }
  ]
};

// ==================== ANIMALS BY DIFFICULTY ====================
const ANIMALS = {
  easy: [ // Common animals everyone knows
    'lion', 'tiger', 'elephant', 'giraffe', 'zebra',
    'bear', 'wolf', 'fox', 'monkey', 'kangaroo',
    'panda', 'koala', 'crocodile', 'hippo', 'rhino'
  ],
  medium: [ // Less common but still known
    'cheetah', 'leopard', 'gorilla', 'chimpanzee', 'orangutan',
    'penguin', 'dolphin', 'whale', 'shark', 'octopus',
    'eagle', 'hawk', 'owl', 'parrot', 'flamingo'
  ],
  hard: [ // Harder to guess animals
    'anteater', 'armadillo', 'platypus', 'wombat', 'meerkat',
    'lynx', 'jaguar', 'puma', 'hyena', 'mongoose',
    'walrus', 'seal', 'otter', 'beaver', 'raccoon'
  ],
  extreme: [ // Very rare/exotic animals
    'aardvark', 'okapi', 'narwhal', 'quokka', 'tarsier',
    'axolotl', 'capybara', 'pangolin', 'lemur', 'tapir',
    'manatee', 'sloth', 'porcupine', 'wolverine', 'marmoset'
  ]
};

// ==================== DATA STORAGE ====================
class DataStore {
  constructor() {
    this.data = {
      xp: {},
      warnings: {},
      reputation: {},
      messageCounts: {},
      dailies: {},
      activeGames: new Map(),
      deletedMessages: new Map(),
      editedMessages: new Map()
    };
    this.loadData();
  }
  
  loadData() {
    try {
      if (fs.existsSync('bot_data.json')) {
        const raw = fs.readFileSync('bot_data.json', 'utf8');
        const saved = JSON.parse(raw);
        Object.assign(this.data, saved);
      }
    } catch (error) {
      console.log('Starting fresh');
    }
  }
  
  saveData() {
    try {
      const toSave = { ...this.data };
      fs.writeFileSync('bot_data.json', JSON.stringify(toSave, null, 2));
    } catch (error) {
      console.error('Save error:', error);
    }
  }
  
  // XP Methods
  getUserXP(guildId, userId) {
    if (!this.data.xp[guildId]) this.data.xp[guildId] = {};
    if (!this.data.xp[guildId][userId]) {
      this.data.xp[guildId][userId] = { xp: 0, level: 1, messages: 0, gamesWon: 0 };
    }
    return this.data.xp[guildId][userId];
  }
  
  setUserXP(guildId, userId, data) {
    if (!this.data.xp[guildId]) this.data.xp[guildId] = {};
    this.data.xp[guildId][userId] = data;
    this.saveData();
  }
  
  getAllXP(guildId) {
    return this.data.xp[guildId] || {};
  }
  
  // Daily Methods
  getDailyCooldown(userId, guildId) {
    const key = `${userId}_${guildId}`;
    return this.data.dailies[key] || 0;
  }
  
  setDailyCooldown(userId, guildId) {
    const key = `${userId}_${guildId}`;
    this.data.dailies[key] = Date.now();
    this.saveData();
  }
  
  // Message Count
  incrementMessageCount(guildId) {
    if (!this.data.messageCounts[guildId]) this.data.messageCounts[guildId] = 0;
    this.data.messageCounts[guildId]++;
    this.saveData();
  }
  
  getMessageCount(guildId) {
    return this.data.messageCounts[guildId] || 0;
  }
}

const dataStore = new DataStore();

// ==================== HELPER FUNCTIONS ====================
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
  game: 0x9B59B6,
  xp: 0xF1C40F,
  fun: 0xE91E63
};

// XP Calculation
function calculateXPForLevel(level) {
  return Math.floor(XP_CONFIG.LEVEL_MULTIPLIER * Math.pow(level, XP_CONFIG.LEVEL_EXPONENT));
}

function getLevelFromXP(xp) {
  let level = 1;
  let totalXP = 0;
  
  while (true) {
    const needed = calculateXPForLevel(level);
    totalXP += needed;
    
    if (xp < totalXP || level >= XP_CONFIG.MAX_LEVEL) {
      break;
    }
    level++;
  }
  
  const currentLevelXP = calculateXPForLevel(level);
  const nextLevelXP = calculateXPForLevel(level + 1);
  const xpInCurrent = xp - (level > 1 ? calculateXPForLevel(level - 1) : 0);
  
  return {
    level: Math.min(level, XP_CONFIG.MAX_LEVEL),
    currentXP: xp,
    nextLevelXP: nextLevelXP,
    xpInCurrentLevel: xpInCurrent,
    requiredForNext: nextLevelXP - xpInCurrent,
    progress: Math.floor((xpInCurrent / currentLevelXP) * 100)
  };
}

function addXP(userId, guildId, amount, reason = '') {
  const currentData = dataStore.getUserXP(guildId, userId);
  const newXP = currentData.xp + amount;
  const newLevelData = getLevelFromXP(newXP);
  
  currentData.xp = newXP;
  currentData.level = newLevelData.level;
  
  dataStore.setUserXP(guildId, userId, currentData);
  
  if (newLevelData.level > currentData.level) {
    return {
      levelUp: true,
      oldLevel: currentData.level,
      newLevel: newLevelData.level,
      xp: newXP,
      levelData: newLevelData
    };
  }
  
  return { levelUp: false, xp: newXP, level: newLevelData.level, levelData: newLevelData };
}

// Permissions
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

// Embed Functions
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

// ==================== CLIENT SETUP ====================
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

// ==================== FLAG GAME (FIXED) ====================
async function flagGameCommand(message, args) {
  const difficulty = args[0]?.toLowerCase() || 'easy';
  
  if (!['easy', 'medium', 'hard', 'extreme'].includes(difficulty)) {
    return message.reply({ 
      embeds: [createErrorEmbed('Invalid difficulty! Use: easy, medium, hard, extreme')] 
    });
  }
  
  const countries = COUNTRIES[difficulty];
  const gameId = `${message.channel.id}_${message.author.id}`;
  
  if (activeGames.has(gameId)) {
    return message.reply({ embeds: [createErrorEmbed('You already have an active game!')] });
  }
  
  // Select 5 random countries
  const selectedCountries = [];
  while (selectedCountries.length < 5 && selectedCountries.length < countries.length) {
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];
    if (!selectedCountries.some(c => c.name === randomCountry.name)) {
      selectedCountries.push(randomCountry);
    }
  }
  
  const gameData = {
    type: 'flag',
    countries: selectedCountries,
    currentRound: 0,
    score: 0,
    startTime: Date.now(),
    difficulty: difficulty,
    playerId: message.author.id,
    channelId: message.channel.id,
    active: true
  };
  
  activeGames.set(gameId, gameData);
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ name: '🎌 FLAG GUESSING GAME', iconURL: message.author.displayAvatarURL() })
    .setTitle(`Difficulty: ${difficulty.toUpperCase()}`)
    .setDescription(`**Guess ${selectedCountries.length} flags!**`)
    .addFields(
      { name: '🎯 Rounds', value: `${selectedCountries.length}`, inline: true },
      { name: '🏆 Scoring', value: 'Correct: 15 XP\nSpeed Bonus: Up to 10 XP', inline: true },
      { name: '🎮 How to Play', value: 'Type the country name when flag appears!\nType `quit` to end game', inline: false }
    )
    .setFooter({ text: 'Game starting in 5 seconds...' })
    .setTimestamp();
  
  const startMsg = await message.reply({ embeds: [embed] });
  gameData.messageId = startMsg.id;
  
  setTimeout(() => {
    startFlagRound(message, gameId);
  }, 5000);
}

async function startFlagRound(message, gameId) {
  const gameData = activeGames.get(gameId);
  if (!gameData || !gameData.active) return;
  
  if (gameData.currentRound >= gameData.countries.length) {
    endFlagGame(message, gameId);
    return;
  }
  
  const currentCountry = gameData.countries[gameData.currentRound];
  gameData.roundStartTime = Date.now();
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ name: `🎌 ROUND ${gameData.currentRound + 1}/${gameData.countries.length}`, iconURL: message.author.displayAvatarURL() })
    .setDescription(`**Guess the country for this flag:**\n\n${currentCountry.flag}`)
    .addFields(
      { name: '📊 Score', value: `${gameData.score}/${gameData.currentRound}`, inline: true },
      { name: '⏱️ Time', value: '30 seconds', inline: true }
    )
    .setFooter({ text: `Difficulty: ${gameData.difficulty.toUpperCase()} | Type your answer` })
    .setTimestamp();
  
  const roundMsg = await message.channel.send({ embeds: [embed] });
  gameData.roundMessageId = roundMsg.id;
  
  gameData.timeout = setTimeout(() => {
    if (activeGames.has(gameId)) {
      const currentGame = activeGames.get(gameId);
      if (currentGame.currentRound === gameData.currentRound) {
        message.channel.send({ 
          embeds: [createErrorEmbed(`⏰ Time's up! Answer was: **${currentCountry.name}**`)] 
        });
        currentGame.currentRound++;
        startFlagRound(message, gameId);
      }
    }
  }, 30000);
}

// ==================== ANIMAL GAME (FIXED) ====================
async function animalGameCommand(message, args) {
  const difficulty = args[0]?.toLowerCase() || 'easy';
  
  if (!['easy', 'medium', 'hard', 'extreme'].includes(difficulty)) {
    return message.reply({ 
      embeds: [createErrorEmbed('Invalid difficulty! Use: easy, medium, hard, extreme')] 
    });
  }
  
  const animals = ANIMALS[difficulty];
  const gameId = `${message.channel.id}_${message.author.id}`;
  
  if (activeGames.has(gameId)) {
    return message.reply({ embeds: [createErrorEmbed('You already have an active game!')] });
  }
  
  // Select 5 random animals
  const selectedAnimals = [];
  while (selectedAnimals.length < 5 && selectedAnimals.length < animals.length) {
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    if (!selectedAnimals.includes(randomAnimal)) {
      selectedAnimals.push(randomAnimal);
    }
  }
  
  // Scramble animals
  const scrambledAnimals = selectedAnimals.map(animal => scrambleWord(animal));
  
  const gameData = {
    type: 'animal',
    animals: selectedAnimals,
    scrambled: scrambledAnimals,
    currentRound: 0,
    score: 0,
    hintsUsed: 0,
    maxHints: 3,
    maxAttempts: 3,
    startTime: Date.now(),
    difficulty: difficulty,
    playerId: message.author.id,
    active: true
  };
  
  activeGames.set(gameId, gameData);
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ name: '🐾 ANIMAL GUESSING GAME', iconURL: message.author.displayAvatarURL() })
    .setTitle(`Difficulty: ${difficulty.toUpperCase()}`)
    .setDescription(`**Unscramble ${selectedAnimals.length} animal names!**`)
    .addFields(
      { name: '🎯 Rounds', value: `${selectedAnimals.length}`, inline: true },
      { name: '💡 Hints', value: '3 hints available', inline: true },
      { name: '🏆 Scoring', value: 'Correct: 10 XP\nNo hints: +5 XP bonus', inline: true },
      { name: '🎮 Commands', value: 'Type animal name\n`hint` - Get hint\n`skip` - Skip animal\n`quit` - End game', inline: false }
    )
    .setFooter({ text: 'Game starting in 5 seconds...' })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
  
  setTimeout(() => {
    startAnimalRound(message, gameId);
  }, 5000);
}

function scrambleWord(word) {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('').toUpperCase();
}

async function startAnimalRound(message, gameId) {
  const gameData = activeGames.get(gameId);
  if (!gameData || !gameData.active) return;
  
  if (gameData.currentRound >= gameData.animals.length) {
    endAnimalGame(message, gameId);
    return;
  }
  
  const currentAnimal = gameData.animals[gameData.currentRound];
  const scrambled = gameData.scrambled[gameData.currentRound];
  gameData.roundStartTime = Date.now();
  gameData.attempts = 0;
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ name: `🐾 ROUND ${gameData.currentRound + 1}/${gameData.animals.length}`, iconURL: message.author.displayAvatarURL() })
    .setDescription(`**Unscramble the letters!**\n\n\`${scrambled}\``)
    .addFields(
      { name: '📊 Score', value: `${gameData.score}/${gameData.currentRound}`, inline: true },
      { name: '💡 Hints Left', value: `${gameData.maxHints - gameData.hintsUsed}`, inline: true },
      { name: '🔤 Word Length', value: `${currentAnimal.length} letters`, inline: true }
    )
    .setFooter({ text: `Difficulty: ${gameData.difficulty.toUpperCase()} | Type your answer` })
    .setTimestamp();
  
  await message.channel.send({ embeds: [embed] });
}

// ==================== EVENT HANDLERS ====================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  try {
    // Add XP for message
    if (message.guild && Math.random() < 0.3) {
      addXP(message.author.id, message.guild.id, XP_CONFIG.PER_MESSAGE, 'message');
      dataStore.incrementMessageCount(message.guild.id);
    }
    
    // Handle game responses
    await handleGameResponse(message);
    
    // Check for commands
    if (!message.content.startsWith(PREFIX)) return;
    
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    // Command routing
    switch (command) {
      // Basic
      case 'help': await helpCommand(message); break;
      case 'ping': await pingCommand(message); break;
      case 'botinfo': await botInfoCommand(message); break;
      
      // Games
      case 'flag': await flagGameCommand(message, args); break;
      case 'animal': await animalGameCommand(message, args); break;
      case 'rps': await rpsGameCommand(message, args); break;
      case 'trivia': await triviaGameCommand(message, args); break;
      case 'number': await numberGameCommand(message, args); break;
      case 'hangman': await hangmanGameCommand(message, args); break;
      
      // XP System
      case 'rank': await rankCommand(message, args); break;
      case 'leaderboard': 
      case 'lb': await leaderboardCommand(message, args); break;
      case 'daily': await dailyCommand(message); break;
      case 'xpinfo': await xpInfoCommand(message); break;
      
      // User Info
      case 'ui': 
      case 'userinfo': await userInfoCommand(message, args); break;
      case 'avatar': await avatarCommand(message, args); break;
      
      // Utility
      case 'calc': await calcCommand(message, args); break;
      case 'weather': await weatherCommand(message, args); break;
      case 'translate': await translateCommand(message, args); break;
      
      // Fun
      case 'joke': await jokeCommand(message); break;
      case 'quote': await quoteCommand(message); break;
      case 'coin': await coinFlipCommand(message); break;
      case 'dice': await diceRollCommand(message, args); break;
      case '8ball': await eightBallCommand(message, args); break;
      
      // Moderation
      case 'clear': await clearCommand(message, args); break;
      case 'kick': await kickCommand(message, args); break;
      case 'ban': await banCommand(message, args); break;
      case 'warn': await warnCommand(message, args); break;
      
      default:
        await message.reply({ 
          embeds: [createErrorEmbed(`Command not found! Use \`${PREFIX}help\``)] 
        });
        break;
    }
    
  } catch (error) {
    console.error('Error:', error);
    message.reply({ embeds: [createErrorEmbed('Something went wrong!')] });
  }
});

// ==================== GAME RESPONSE HANDLER ====================
async function handleGameResponse(message) {
  const gameId = `${message.channel.id}_${message.author.id}`;
  const gameData = activeGames.get(gameId);
  
  if (!gameData || !gameData.active) return;
  
  const content = message.content.trim().toLowerCase();
  
  // Quit game
  if (content === 'quit' || content === 'exit' || content === 'end') {
    if (gameData.type === 'flag') endFlagGame(message, gameId, true);
    else if (gameData.type === 'animal') endAnimalGame(message, gameId, true);
    activeGames.delete(gameId);
    return;
  }
  
  // Handle flag game
  if (gameData.type === 'flag') {
    await handleFlagGuess(message, gameId, content);
  }
  
  // Handle animal game
  if (gameData.type === 'animal') {
    await handleAnimalGuess(message, gameId, content);
  }
}

// Flag game handler
async function handleFlagGuess(message, gameId, guess) {
  const gameData = activeGames.get(gameId);
  if (!gameData || gameData.type !== 'flag') return;
  
  const currentCountry = gameData.countries[gameData.currentRound];
  const countryLower = currentCountry.name.toLowerCase();
  
  if (guess === 'skip') {
    gameData.currentRound++;
    message.channel.send({ 
      embeds: [createErrorEmbed(`Skipped! Answer was: **${currentCountry.name}**`)] 
    });
    setTimeout(() => startFlagRound(message, gameId), 2000);
    return;
  }
  
  // Clear timeout
  if (gameData.timeout) {
    clearTimeout(gameData.timeout);
  }
  
  const timeTaken = Date.now() - gameData.roundStartTime;
  
  if (guess === countryLower || guess === currentCountry.code.toLowerCase()) {
    // Correct guess
    gameData.score++;
    
    // Calculate XP
    let xpEarned = 15;
    if (timeTaken < 5000) xpEarned += 10;
    else if (timeTaken < 10000) xpEarned += 7;
    else if (timeTaken < 15000) xpEarned += 5;
    else if (timeTaken < 20000) xpEarned += 3;
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '✅ CORRECT!', iconURL: message.author.displayAvatarURL() })
      .setDescription(`**${currentCountry.name}** ${currentCountry.flag}`)
      .addFields(
        { name: '⏱️ Time', value: `${(timeTaken/1000).toFixed(1)}s`, inline: true },
        { name: '⭐ XP', value: `${xpEarned} XP`, inline: true },
        { name: '📊 Score', value: `${gameData.score}/${gameData.currentRound + 1}`, inline: true }
      )
      .setFooter({ text: 'Next round in 3 seconds...' })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
    // Add XP
    addXP(message.author.id, message.guild.id, xpEarned, 'flag_game_correct');
    
  } else {
    // Wrong guess
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setAuthor({ name: '❌ WRONG!', iconURL: message.author.displayAvatarURL() })
      .setDescription(`**Correct answer:** ${currentCountry.name} ${currentCountry.flag}`)
      .addFields(
        { name: '📊 Score', value: `${gameData.score}/${gameData.currentRound + 1}`, inline: true },
        { name: '🤔 Your Guess', value: guess, inline: true }
      )
      .setFooter({ text: 'Better luck next round!' })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
    // Small XP for participation
    addXP(message.author.id, message.guild.id, 2, 'flag_game_participation');
  }
  
  gameData.currentRound++;
  
  // Next round
  setTimeout(() => {
    startFlagRound(message, gameId);
  }, 3000);
}
// Animal game handler
async function handleAnimalGuess(message, gameId, guess) {
  const gameData = activeGames.get(gameId);
  if (!gameData || gameData.type !== 'animal') return;
  
  const currentAnimal = gameData.animals[gameData.currentRound];
  
  if (guess === 'skip') {
    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setDescription(`**Skipped!** The animal was: **${currentAnimal.toUpperCase()}**`)
      .setFooter({ text: 'Next round in 3 seconds...' })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    gameData.currentRound++;
    gameData.hintsUsed = 0;
    
    setTimeout(() => {
      startAnimalRound(message, gameId);
    }, 3000);
    return;
  }
  
  if (guess === 'hint') {
    if (gameData.hintsUsed >= gameData.maxHints) {
      await message.reply({ embeds: [createErrorEmbed('No hints left!')] });
      return;
    }
    
    gameData.hintsUsed++;
    const hint = currentAnimal.substring(0, Math.min(gameData.hintsUsed + 1, currentAnimal.length));
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '💡 HINT', iconURL: message.author.displayAvatarURL() })
      .setDescription(`**Starts with:** \`${hint.toUpperCase()}\`\n\nScrambled: \`${gameData.scrambled[gameData.currentRound]}\``)
      .setFooter({ text: `Hint ${gameData.hintsUsed}/${gameData.maxHints} | -3 XP penalty` })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    return;
  }
  
  gameData.attempts++;
  
  if (guess === currentAnimal.toLowerCase()) {
    // Calculate XP
    let xpEarned = 10;
    const timeTaken = Date.now() - gameData.roundStartTime;
    
    // Speed bonus
    if (timeTaken < 10000) xpEarned += 5;
    
    // No hint bonus
    if (gameData.hintsUsed === 0) xpEarned += 5;
    
    // First attempt bonus
    if (gameData.attempts === 1) xpEarned += 3;
    
    // Hint penalty
    xpEarned -= (gameData.hintsUsed * 3);
    
    if (xpEarned < 3) xpEarned = 3;
    
    gameData.score++;
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '✅ CORRECT!', iconURL: message.author.displayAvatarURL() })
      .setDescription(`**${currentAnimal.toUpperCase()}** 🎉`)
      .addFields(
        { name: '🎯 Attempts', value: `${gameData.attempts}`, inline: true },
        { name: '⏱️ Time', value: `${(timeTaken/1000).toFixed(1)}s`, inline: true },
        { name: '💡 Hints Used', value: `${gameData.hintsUsed}`, inline: true },
        { name: '⭐ XP Earned', value: `${xpEarned} XP`, inline: true },
        { name: '📊 Score', value: `${gameData.score}/${gameData.currentRound + 1}`, inline: false }
      )
      .setFooter({ text: 'Next round in 3 seconds...' })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
    // Add XP
    addXP(message.author.id, message.guild.id, xpEarned, 'animal_game_correct');
    
    gameData.currentRound++;
    gameData.hintsUsed = 0;
    
    setTimeout(() => {
      startAnimalRound(message, gameId);
    }, 3000);
    
  } else {
    if (gameData.attempts >= gameData.maxAttempts) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.error)
        .setAuthor({ name: '❌ FAILED', iconURL: message.author.displayAvatarURL() })
        .setDescription(`**The animal was:** ${currentAnimal.toUpperCase()}`)
        .addFields(
          { name: '📊 Score', value: `${gameData.score}/${gameData.currentRound + 1}`, inline: true },
          { name: '🎯 Attempts Used', value: `${gameData.attempts}`, inline: true }
        )
        .setFooter({ text: 'Next round in 3 seconds...' })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
      // Small XP for trying
      addXP(message.author.id, message.guild.id, 1, 'animal_game_participation');
      
      gameData.currentRound++;
      gameData.hintsUsed = 0;
      
      setTimeout(() => {
        startAnimalRound(message, gameId);
      }, 3000);
    } else {
      const embed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setDescription(`**Try again!**\n\nScrambled: \`${gameData.scrambled[gameData.currentRound]}\`\n\nAttempts: ${gameData.attempts}/${gameData.maxAttempts}`)
        .setFooter({ text: `Type \`hint\` for help or \`skip\` to skip` })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
    }
  }
}

// End flag game
async function endFlagGame(message, gameId, manualEnd = false) {
  const gameData = activeGames.get(gameId);
  if (!gameData) return;
  
  if (gameData.timeout) {
    clearTimeout(gameData.timeout);
  }
  
  gameData.active = false;
  activeGames.delete(gameId);
  
  const totalTime = Date.now() - gameData.startTime;
  const minutes = Math.floor(totalTime / 60000);
  const seconds = Math.floor((totalTime % 60000) / 1000);
  
  let finalXP = gameData.score * 15;
  let bonusXP = 0;
  
  // Perfect game bonus
  if (gameData.score === gameData.countries.length) {
    bonusXP += 100;
  }
  
  // Difficulty bonus
  if (gameData.difficulty === 'medium') bonusXP += 20;
  else if (gameData.difficulty === 'hard') bonusXP += 40;
  else if (gameData.difficulty === 'extreme') bonusXP += 75;
  
  finalXP += bonusXP;
  
  // Add final XP
  const xpResult = addXP(message.author.id, message.guild.id, finalXP, 'flag_game_complete');
  
  const embed = new EmbedBuilder()
    .setColor(gameData.score === gameData.countries.length ? COLORS.xp : COLORS.primary)
    .setAuthor({ name: '🏁 FLAG GAME COMPLETE', iconURL: message.author.displayAvatarURL() })
    .setTitle(`${gameData.difficulty.toUpperCase()} MODE`)
    .addFields(
      { name: '🏆 Final Score', value: `${gameData.score}/${gameData.countries.length}`, inline: true },
      { name: '📊 Accuracy', value: `${((gameData.score / gameData.countries.length) * 100).toFixed(1)}%`, inline: true },
      { name: '⏱️ Time', value: `${minutes}m ${seconds}s`, inline: true },
      { name: '💰 Total XP', value: `${finalXP}`, inline: true }
    )
    .setFooter({ 
      text: xpResult.levelUp ? 
        `🎉 LEVEL UP! Level ${xpResult.oldLevel} → ${xpResult.newLevel}` : 
        `Current Level: ${xpResult.level}` 
    })
    .setTimestamp();
  
  if (gameData.score === gameData.countries.length) {
    embed.setDescription('**🎯 PERFECT GAME! 🎯**');
  } else if (manualEnd) {
    embed.setDescription('**Game ended by player**');
  }
  
  await message.channel.send({ embeds: [embed] });
}

// End animal game
async function endAnimalGame(message, gameId, manualEnd = false) {
  const gameData = activeGames.get(gameId);
  if (!gameData) return;
  
  gameData.active = false;
  activeGames.delete(gameId);
  
  const totalTime = Date.now() - gameData.startTime;
  const minutes = Math.floor(totalTime / 60000);
  const seconds = Math.floor((totalTime % 60000) / 1000);
  
  let finalXP = gameData.score * 10;
  let bonusXP = 0;
  
  // Perfect game bonus
  if (gameData.score === gameData.animals.length) {
    bonusXP += 50;
  }
  
  // Difficulty bonus
  if (gameData.difficulty === 'medium') bonusXP += 15;
  else if (gameData.difficulty === 'hard') bonusXP += 30;
  else if (gameData.difficulty === 'extreme') bonusXP += 60;
  
  finalXP += bonusXP;
  
  // Add final XP
  const xpResult = addXP(message.author.id, message.guild.id, finalXP, 'animal_game_complete');
  
  const embed = new EmbedBuilder()
    .setColor(gameData.score === gameData.animals.length ? COLORS.xp : COLORS.primary)
    .setAuthor({ name: '🏁 ANIMAL GAME COMPLETE', iconURL: message.author.displayAvatarURL() })
    .setTitle(`${gameData.difficulty.toUpperCase()} MODE`)
    .addFields(
      { name: '🏆 Final Score', value: `${gameData.score}/${gameData.animals.length}`, inline: true },
      { name: '📊 Accuracy', value: `${((gameData.score / gameData.animals.length) * 100).toFixed(1)}%`, inline: true },
      { name: '⏱️ Time', value: `${minutes}m ${seconds}s`, inline: true },
      { name: '💡 Hints Used', value: `${gameData.hintsUsed}`, inline: true },
      { name: '💰 Total XP', value: `${finalXP}`, inline: true }
    )
    .setFooter({ 
      text: xpResult.levelUp ? 
        `🎉 LEVEL UP! Level ${xpResult.oldLevel} → ${xpResult.newLevel}` : 
        `Current Level: ${xpResult.level}` 
    })
    .setTimestamp();
  
  if (gameData.score === gameData.animals.length) {
    embed.setDescription('**🎯 PERFECT GAME! 🎯**');
  } else if (manualEnd) {
    embed.setDescription('**Game ended by player**');
  }
  
  await message.channel.send({ embeds: [embed] });
}

// ==================== OTHER GAMES ====================
async function rpsGameCommand(message, args) {
  const choice = args[0]?.toLowerCase();
  const choices = ['rock', 'paper', 'scissors'];
  
  if (!choice || !choices.includes(choice)) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '✊ ROCK PAPER SCISSORS', iconURL: client.user.displayAvatarURL() })
      .setDescription(`**Usage:** \`${PREFIX}rps <rock|paper|scissors>\``)
      .addFields(
        { name: '🎮 Example', value: '`=rps rock`\n`=rps paper`\n`=rps scissors`', inline: false },
        { name: '🏆 XP Rewards', value: 'Win: 15 XP\nDraw: 5 XP\nLose: 2 XP', inline: false }
      )
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
  
  const botChoice = choices[Math.floor(Math.random() * 3)];
  const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
  
  let result, xpEarned;
  
  if (choice === botChoice) {
    result = '**🤝 DRAW!**';
    xpEarned = 5;
  } else if (
    (choice === 'rock' && botChoice === 'scissors') ||
    (choice === 'paper' && botChoice === 'rock') ||
    (choice === 'scissors' && botChoice === 'paper')
  ) {
    result = '**🎉 YOU WIN!**';
    xpEarned = 15;
  } else {
    result = '**😢 YOU LOSE!**';
    xpEarned = 2;
  }
  
  const xpResult = addXP(message.author.id, message.guild.id, xpEarned, 'rps_game');
  
  const embed = new EmbedBuilder()
    .setColor(result.includes('WIN') ? COLORS.success : result.includes('LOSE') ? COLORS.error : COLORS.warning)
    .setAuthor({ name: '✊ ROCK PAPER SCISSORS', iconURL: message.author.displayAvatarURL() })
    .addFields(
      { name: '👤 Your Choice', value: `${emojis[choice]} ${choice.toUpperCase()}`, inline: true },
      { name: '🤖 Bot Choice', value: `${emojis[botChoice]} ${botChoice.toUpperCase()}`, inline: true },
      { name: '🏆 Result', value: result, inline: true },
      { name: '⭐ XP Earned', value: `${xpEarned} XP`, inline: false }
    )
    .setFooter({ text: xpResult.levelUp ? `🎉 Level up to ${xpResult.level}!` : `Current Level: ${xpResult.level}` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function triviaGameCommand(message, args) {
  const categories = ['general', 'science', 'history', 'geography', 'animals', 'sports'];
  const category = args[0]?.toLowerCase() || 'general';
  
  if (!categories.includes(category)) {
    return message.reply({ 
      embeds: [createErrorEmbed(`Invalid category! Use: ${categories.join(', ')}`)] 
    });
  }
  
  const questions = {
    general: [
      { question: 'What is the capital of France?', answer: 'paris', options: ['London', 'Berlin', 'Paris', 'Madrid'] },
      { question: 'How many continents are there?', answer: '7', options: ['5', '6', '7', '8'] },
      { question: 'What is the largest ocean?', answer: 'pacific', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'] }
    ],
    science: [
      { question: 'What is H2O?', answer: 'water', options: ['Hydrogen', 'Oxygen', 'Water', 'Carbon Dioxide'] },
      { question: 'What planet is known as the Red Planet?', answer: 'mars', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'] },
      { question: 'What is the fastest land animal?', answer: 'cheetah', options: ['Lion', 'Cheetah', 'Leopard', 'Tiger'] }
    ]
  };
  
  const categoryQuestions = questions[category] || questions.general;
  const randomQuestion = categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)];
  
  const gameId = `${message.channel.id}_${message.author.id}`;
  
  const gameData = {
    type: 'trivia',
    question: randomQuestion.question,
    answer: randomQuestion.answer,
    options: randomQuestion.options,
    startTime: Date.now(),
    playerId: message.author.id,
    active: true
  };
  
  activeGames.set(gameId, gameData);
  
  const optionsText = randomQuestion.options.map((opt, idx) => {
    const letter = String.fromCharCode(65 + idx);
    return `${letter}) ${opt}`;
  }).join('\n');
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ name: '🧠 TRIVIA', iconURL: message.author.displayAvatarURL() })
    .setTitle(`Category: ${category.toUpperCase()}`)
    .setDescription(`**${randomQuestion.question}**\n\n${optionsText}`)
    .addFields(
      { name: '⏱️ Time Limit', value: '30 seconds', inline: true },
      { name: '🏆 XP Reward', value: 'Correct: 20 XP', inline: true }
    )
    .setFooter({ text: 'Reply with A, B, C, or D | Type "quit" to end' })
    .setTimestamp();
  
  const triviaMsg = await message.reply({ embeds: [embed] });
  gameData.messageId = triviaMsg.id;
  
  gameData.timeout = setTimeout(async () => {
    if (activeGames.has(gameId)) {
      activeGames.delete(gameId);
      await message.channel.send({ 
        embeds: [createErrorEmbed(`⏰ Time's up! Answer was: **${randomQuestion.answer}**`)] 
      });
    }
  }, 30000);
}

// ==================== XP COMMANDS ====================
async function rankCommand(message, args) {
  let targetUser = message.author;
  
  if (args.length > 0) {
    const userId = extractId(args[0]);
    if (userId) {
      try {
        targetUser = await client.users.fetch(userId);
      } catch {
        return message.reply({ embeds: [createErrorEmbed('User not found!')] });
      }
    }
  }
  
  const xpData = dataStore.getUserXP(message.guild.id, targetUser.id);
  const levelData = getLevelFromXP(xpData.xp);
  
  // Get rank position
  const allXP = dataStore.getAllXP(message.guild.id);
  const sortedUsers = Object.entries(allXP).sort((a, b) => b[1].xp - a[1].xp);
  const rank = sortedUsers.findIndex(([id]) => id === targetUser.id) + 1;
  
  // Progress bar
  const progressBarLength = 15;
  const progress = Math.floor((levelData.xpInCurrentLevel / calculateXPForLevel(levelData.level)) * progressBarLength);
  const progressBar = '█'.repeat(progress) + '░'.repeat(progressBarLength - progress);
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.xp)
    .setAuthor({ name: `📊 RANK - ${targetUser.username}`, iconURL: targetUser.displayAvatarURL() })
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      { name: '🏆 Rank', value: `#${rank || 'N/A'}`, inline: true },
      { name: '⭐ Level', value: `${levelData.level}`, inline: true },
      { name: '📊 XP', value: `${xpData.xp.toLocaleString()}`, inline: true },
      { name: '📈 Progress', value: `${progressBar} ${levelData.progress}%`, inline: false },
      { name: '🎯 Next Level', value: `${levelData.requiredForNext.toLocaleString()} XP needed`, inline: false }
    )
    .setFooter({ text: `Ranking: ${rank}/${sortedUsers.length} players` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function leaderboardCommand(message, args) {
  const page = parseInt(args[0]) || 1;
  const perPage = 10;
  
  const allXP = dataStore.getAllXP(message.guild.id);
  const sortedUsers = Object.entries(allXP).sort((a, b) => b[1].xp - a[1].xp);
  
  const totalPages = Math.ceil(sortedUsers.length / perPage);
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const pageUsers = sortedUsers.slice(startIndex, endIndex);
  
  if (pageUsers.length === 0) {
    return message.reply({ embeds: [createErrorEmbed('No users on this page!')] });
  }
  
  let leaderboardText = '';
  let rank = startIndex + 1;
  
  for (const [userId, data] of pageUsers) {
    try {
      const user = await client.users.fetch(userId).catch(() => ({ tag: 'Unknown User' }));
      const levelData = getLevelFromXP(data.xp);
      
      const medals = ['🥇', '🥈', '🥉'];
      const medal = rank <= 3 ? medals[rank - 1] : `**${rank}.**`;
      
      leaderboardText += `${medal} **${user.tag}**\n` +
                        `   ⭐ Level ${levelData.level} • 📊 ${data.xp.toLocaleString()} XP\n`;
      
      rank++;
    } catch {
      continue;
    }
  }
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.xp)
    .setAuthor({ name: '🏆 XP LEADERBOARD', iconURL: message.guild.iconURL() })
    .setTitle(`Page ${page}/${totalPages}`)
    .setDescription(leaderboardText || 'No XP data yet!')
    .addFields(
      { name: '📊 Total Players', value: `${sortedUsers.length}`, inline: true },
      { name: '🎮 Top Player', value: sortedUsers.length > 0 ? `<@${sortedUsers[0][0]}>` : 'None', inline: true }
    )
    .setFooter({ text: `Use =leaderboard <page> to view more pages` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function dailyCommand(message) {
  const userId = message.author.id;
  const guildId = message.guild.id;
  const lastDaily = dataStore.getDailyCooldown(userId, guildId);
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;
  
  if (now - lastDaily < cooldown) {
    const nextDaily = lastDaily + cooldown;
    const hoursLeft = Math.ceil((nextDaily - now) / (60 * 60 * 1000));
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setAuthor({ name: '⏰ DAILY REWARD', iconURL: message.author.displayAvatarURL() })
      .setDescription(`**Already claimed today!**\n\n⏳ **Next daily in:** ${hoursLeft} hours`)
      .addFields(
        { name: '🕒 Last Claimed', value: `<t:${Math.floor(lastDaily / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: 'Come back tomorrow!' })
      .setTimestamp();
    
    return message.reply({ embeds: [embed] });
  }
  
  // Give daily reward
  const xpResult = addXP(userId, guildId, XP_CONFIG.DAILY_BONUS, 'daily_reward');
  dataStore.setDailyCooldown(userId, guildId);
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.xp)
    .setAuthor({ name: '🎁 DAILY REWARD CLAIMED!', iconURL: message.author.displayAvatarURL() })
    .setDescription(`**+${XP_CONFIG.DAILY_BONUS} XP** added to your account!`)
    .addFields(
      { name: '💰 Reward', value: `${XP_CONFIG.DAILY_BONUS} XP`, inline: true },
      { name: '📊 Total XP', value: `${xpResult.xp.toLocaleString()}`, inline: true },
      { name: '⭐ Current Level', value: `${xpResult.level}`, inline: true }
    )
    .setFooter({ 
      text: xpResult.levelUp ? 
        `🎉 LEVEL UP! Now Level ${xpResult.level}` : 
        `Come back tomorrow for more!` 
    })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function xpInfoCommand(message) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.xp)
    .setAuthor({ name: '📊 XP SYSTEM', iconURL: client.user.displayAvatarURL() })
    .setTitle('🌟 ADVANCED LEVELING SYSTEM')
    .addFields(
      { name: '💬 Messaging', value: `• ${XP_CONFIG.PER_MESSAGE} XP per message\n• Limited to prevent spam`, inline: false },
      { name: '🎮 Game Rewards', value: `• Win: 10-25 XP\n• Participation: 1-5 XP\n• Bonus for speed & accuracy`, inline: false },
      { name: '🎁 Daily Bonus', value: `• ${XP_CONFIG.DAILY_BONUS} XP every 24 hours`, inline: false },
      { name: '📈 Level Formula', value: `• Gets harder each level!\n• Level XP = ${XP_CONFIG.LEVEL_MULTIPLIER} × Level^${XP_CONFIG.LEVEL_EXPONENT}`, inline: false },
      { name: '🎯 Commands', value: `• \`${PREFIX}rank\` - Check your level\n• \`${PREFIX}leaderboard\` - Server rankings\n• \`${PREFIX}daily\` - Daily reward`, inline: false }
    )
    .setDescription('**Leveling up is HARD!** Play games daily and chat actively to level up.')
    .setFooter({ text: 'Max Level: 100 • Keep grinding!' })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// ==================== HELP COMMAND ====================
async function helpCommand(message) {
  const isAdminUser = isAdmin(message.member);
  
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ name: '⚡ WORLD OF GAMERS BOT', iconURL: client.user.displayAvatarURL() })
    .setTitle('📚 COMMAND DIRECTORY')
    .setDescription(`\`\`\`diff\n+ Prefix: ${PREFIX} | Type ${PREFIX}help for more info\`\`\``)
    .addFields(
      { 
        name: '🎮 **GAMES** 🎮', 
        value: '```\n' +
               `${PREFIX}flag [easy|medium|hard|extreme]\n` +
               `${PREFIX}animal [difficulty]\n` +
               `${PREFIX}rps <rock|paper|scissors>\n` +
               `${PREFIX}trivia [category]\n` +
               `${PREFIX}number [max]\n` +
               `${PREFIX}hangman [category]\n` +
               '```', 
        inline: true 
      },
      { 
        name: '📊 **XP SYSTEM** 📊', 
        value: '```\n' +
               `${PREFIX}rank [@user]\n` +
               `${PREFIX}leaderboard\n` +
               `${PREFIX}daily\n` +
               `${PREFIX}xpinfo\n` +
               '```', 
        inline: true 
      },
      { 
        name: '👤 **USER** 👤', 
        value: '```\n' +
               `${PREFIX}ui [@user]\n` +
               `${PREFIX}avatar [@user]\n` +
               `${PREFIX}serverinfo\n` +
               '```', 
        inline: true 
      }
    )
    .addFields(
      { 
        name: '🛠️ **UTILITY** 🛠️', 
        value: '```\n' +
               `${PREFIX}calc <expression>\n` +
               `${PREFIX}weather <city>\n` +
               `${PREFIX}translate <text> to <lang>\n` +
               `${PREFIX}remind <time> <message>\n` +
               '```', 
        inline: true 
      },
      { 
        name: '😄 **FUN** 😄', 
        value: '```\n' +
               `${PREFIX}joke\n` +
               `${PREFIX}quote\n` +
               `${PREFIX}coin\n` +
               `${PREFIX}dice\n` +
               `${PREFIX}8ball <question>\n` +
               '```', 
        inline: true 
      }
    );
  
  if (isAdminUser) {
    embed.addFields(
      { 
        name: '🛡️ **ADMIN** 🛡️', 
        value: '```\n' +
               `${PREFIX}clear <amount>\n` +
               `${PREFIX}kick <@user> [reason]\n` +
               `${PREFIX}ban <@user> [reason]\n` +
               `${PREFIX}warn <@user> <reason>\n` +
               '```', 
        inline: true 
      }
    );
  }
  
  embed.addFields(
    { 
      name: 'ℹ️ **INFO** ℹ️', 
      value: '```\n' +
             `${PREFIX}ping\n` +
             `${PREFIX}botinfo\n` +
             `${PREFIX}help\n` +
             '```', 
      inline: true 
    }
  );
  
  const totalCommands = isAdminUser ? '45+' : '40+';
  embed.setFooter({ 
    text: `Total Commands: ${totalCommands} • Requested by ${message.author.tag}`, 
    iconURL: message.author.displayAvatarURL() 
  }).setTimestamp();
  
  await message.reply({ embeds: [embed] });
}
// ==================== BASIC COMMANDS ====================
async function pingCommand(message) {
  const sent = await message.reply({ 
    embeds: [new EmbedBuilder()
      .setColor(COLORS.info)
      .setDescription('📡 **Measuring latency...**')
      .setTimestamp()
    ] 
  });
  
  const latency = sent.createdTimestamp - message.createdTimestamp;
  const apiLatency = Math.round(client.ws.ping);
  
  const getStatus = (ms) => {
    if (ms < 100) return '🟢 Excellent';
    if (ms < 200) return '🟡 Good';
    if (ms < 500) return '🟠 Average';
    return '🔴 Poor';
  };
  
  const embed = new EmbedBuilder()
    .setColor(latency < 200 ? COLORS.success : latency < 500 ? COLORS.warning : COLORS.error)
    .setAuthor({ name: '📡 PING', iconURL: client.user.displayAvatarURL() })
    .addFields(
      { name: '🤖 Bot Latency', value: `${latency}ms \`${getStatus(latency)}\``, inline: true },
      { name: '🌐 API Latency', value: `${apiLatency}ms \`${getStatus(apiLatency)}\``, inline: true },
      { name: '⚡ Status', value: latency < 100 ? '✨ **Super Fast!**' : latency < 200 ? '🚀 **Fast**' : '👍 **Normal**', inline: true }
    )
    .setFooter({ text: `Requested by ${message.author.tag}` })
    .setTimestamp();
  
  await sent.edit({ embeds: [embed] });
}

async function botInfoCommand(message) {
  const uptime = client.uptime;
  const days = Math.floor(uptime / 86400000);
  const hours = Math.floor((uptime % 86400000) / 3600000);
  const minutes = Math.floor((uptime % 3600000) / 60000);
  const seconds = Math.floor((uptime % 60000) / 1000);
  
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ name: '🤖 BOT INFORMATION', iconURL: client.user.displayAvatarURL() })
    .setThumbnail(client.user.displayAvatarURL())
    .addFields(
      { name: '🤖 Bot Name', value: `\`${client.user.tag}\``, inline: true },
      { name: '🆔 Bot ID', value: `\`${client.user.id}\``, inline: true },
      { name: '📅 Created', value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: '🕒 Uptime', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
      { name: '🌐 Servers', value: `\`${client.guilds.cache.size}\``, inline: true },
      { name: '👥 Users', value: `\`${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toLocaleString()}\``, inline: true },
      { name: '⚡ Version', value: '`v3.0.0`', inline: true },
      { name: '🎮 Games', value: '`6+ games`', inline: true },
      { name: '📊 Commands', value: '`45+ commands`', inline: true }
    )
    .setDescription('**⚡ Advanced Discord Bot with XP System & Games**\n\n🌟 **Features:**\n• 🎮 Multiple Mini Games\n• 📊 Advanced XP System\n• 🛡️ Moderation Tools\n• 🛠️ Utility Commands\n• 😄 Fun Commands')
    .setFooter({ text: 'Made for Discord Community' })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function userInfoCommand(message, args) {
  let targetUser = message.author;
  let targetMember = message.member;
  
  if (args.length > 0) {
    const userId = extractId(args[0]);
    if (userId) {
      try {
        targetUser = await client.users.fetch(userId);
        targetMember = await message.guild.members.fetch(userId);
      } catch {
        return message.reply({ embeds: [createErrorEmbed('User not found!')] });
      }
    }
  }
  
  const xpData = dataStore.getUserXP(message.guild.id, targetUser.id);
  const levelData = getLevelFromXP(xpData.xp);
  
  const badges = [];
  if (targetMember.premiumSince) badges.push('🌟 Booster');
  if (isAdmin(targetMember)) badges.push('🛡️ Admin');
  else if (isMod(targetMember)) badges.push('⚔️ Mod');
  if (targetMember.permissions.has(PermissionFlagsBits.ManageMessages)) badges.push('📝 Staff');
  if (targetUser.bot) badges.push('🤖 Bot');
  
  const embed = new EmbedBuilder()
    .setColor(targetMember.displayHexColor || COLORS.primary)
    .setAuthor({ name: `👤 USER INFORMATION`, iconURL: targetUser.displayAvatarURL() })
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      { name: '📝 Username', value: `\`${targetUser.tag}\``, inline: true },
      { name: '🆔 User ID', value: `\`${targetUser.id}\``, inline: true },
      { name: '📅 Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
      { name: '📅 Joined Server', value: targetMember.joinedTimestamp ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
      { name: '⭐ Level', value: `**${levelData.level}**`, inline: true },
      { name: '📊 XP', value: `**${xpData.xp}** / ${levelData.nextLevelXP}`, inline: true }
    );
  
  if (badges.length > 0) {
    embed.addFields({ name: '🎖️ Badges', value: badges.join(' • '), inline: false });
  }
  
  // Add roles (limited to 10)
  const roles = targetMember.roles.cache
    .filter(role => role.id !== message.guild.id)
    .sort((a, b) => b.position - a.position)
    .map(role => role.toString())
    .slice(0, 10);
  
  if (roles.length > 0) {
    embed.addFields({ 
      name: `🏷️ Roles [${targetMember.roles.cache.size - 1}]`, 
      value: roles.join(' ') + (targetMember.roles.cache.size - 1 > 10 ? `\n...and ${targetMember.roles.cache.size - 11} more` : ''), 
      inline: false 
    });
  }
  
  embed.setFooter({ text: `Requested by ${message.author.tag}` }).setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function avatarCommand(message, args) {
  let targetUser = message.author;
  
  if (args.length > 0) {
    const userId = extractId(args[0]);
    if (userId) {
      try {
        targetUser = await client.users.fetch(userId);
      } catch {
        return message.reply({ embeds: [createErrorEmbed('User not found!')] });
      }
    }
  }
  
  const avatarURL = targetUser.displayAvatarURL({ size: 4096, dynamic: true });
  const formats = ['png', 'jpg', 'webp'];
  if (targetUser.avatar?.startsWith('a_')) formats.push('gif');
  
  const links = formats.map(f => 
    `[\`${f.toUpperCase()}\`](${targetUser.displayAvatarURL({ extension: f, size: 4096 })})`
  ).join(' ');
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: `📸 ${targetUser.tag}'s Avatar`, iconURL: targetUser.displayAvatarURL() })
    .setImage(avatarURL)
    .setDescription(`**📥 Download:** ${links}`)
    .setFooter({ text: `Requested by ${message.author.tag}` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// ==================== UTILITY COMMANDS ====================
async function calcCommand(message, args) {
  if (!args.length) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '🧮 CALCULATOR', iconURL: client.user.displayAvatarURL() })
      .setDescription(`**Usage:** \`${PREFIX}calc <expression>\``)
      .addFields({
        name: '📋 Examples',
        value: '```\n' +
               `${PREFIX}calc 5 * 10\n` +
               `${PREFIX}calc (100 + 50) / 2\n` +
               `${PREFIX}calc sqrt(144)\n` +
               `${PREFIX}calc 2^8\n` +
               '```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
  
  const expression = args.join(' ');
  
  try {
    const result = evaluate(expression);
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '🧮 CALCULATOR', iconURL: client.user.displayAvatarURL() })
      .addFields(
        { name: '📝 Expression', value: `\`\`\`${expression}\`\`\``, inline: false },
        { name: '✨ Result', value: `\`\`\`${result}\`\`\``, inline: false }
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Invalid expression. Please check your input.')] });
  }
}

async function weatherCommand(message, args) {
  if (!args.length) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '🌤️ WEATHER', iconURL: client.user.displayAvatarURL() })
      .setDescription(`**Usage:** \`${PREFIX}weather <city>\``)
      .addFields({
        name: '📋 Examples',
        value: '```\n' +
               `${PREFIX}weather Karachi\n` +
               `${PREFIX}weather London\n` +
               `${PREFIX}weather New York\n` +
               '```'
      })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
  
  const city = args.join(' ');
  
  try {
    // Using wttr.in - 100% working, no API key needed
    const response = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      timeout: 10000
    });
    
    const data = response.data;
    const current = data.current_condition[0];
    const area = data.nearest_area[0];
    
    const tempC = current.temp_C;
    const feelsLike = current.FeelsLikeC;
    const humidity = current.humidity;
    const windSpeed = current.windspeedKmph;
    const condition = current.weatherDesc[0].value;
    
    // Get emoji for condition
    const emojiMap = {
      'Sunny': '☀️', 'Clear': '☀️',
      'Partly cloudy': '⛅', 'Cloudy': '☁️',
      'Overcast': '☁️', 'Mist': '🌫️',
      'Fog': '🌫️', 'Patchy rain': '🌦️',
      'Light rain': '🌦️', 'Moderate rain': '🌧️',
      'Heavy rain': '⛈️', 'Thunderstorm': '⛈️',
      'Snow': '❄️', 'Sleet': '🌨️'
    };
    
    let emoji = '🌡️';
    for (const [key, value] of Object.entries(emojiMap)) {
      if (condition.toLowerCase().includes(key.toLowerCase())) {
        emoji = value;
        break;
      }
    }
    
    // Color based on temperature
    const getColor = (temp) => {
      if (temp > 30) return 0xFF6B35; // Hot - Orange
      if (temp > 20) return 0xFFD166; // Warm - Yellow
      if (temp > 10) return 0x06D6A0; // Cool - Green
      if (temp > 0) return 0x118AB2;  // Cold - Blue
      return 0x073B4C; // Freezing - Dark Blue
    };
    
    const embed = new EmbedBuilder()
      .setColor(getColor(tempC))
      .setAuthor({ name: `🌤️ WEATHER - ${area.areaName[0].value}, ${area.country[0].value}`, iconURL: 'https://cdn-icons-png.flaticon.com/512/1163/1163661.png' })
      .setDescription(`**${emoji} ${condition}**`)
      .addFields(
        { name: '🌡️ Temperature', value: `**${tempC}°C**`, inline: true },
        { name: '🤔 Feels Like', value: `**${feelsLike}°C**`, inline: true },
        { name: '💧 Humidity', value: `**${humidity}%**`, inline: true },
        { name: '💨 Wind Speed', value: `**${windSpeed} km/h**`, inline: true },
        { name: '👁️ Visibility', value: `**${current.visibility} km**`, inline: true },
        { name: '📊 Pressure', value: `**${current.pressure} hPa**`, inline: true }
      )
      .setFooter({ 
        text: `Live Data • Requested by ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL() 
      })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Weather error:', error.message);
    
    // Fallback: Show simulated weather
    const simulatedWeather = {
      'karachi': { temp: 32, condition: 'Sunny', emoji: '☀️', humidity: 65, wind: 12 },
      'lahore': { temp: 28, condition: 'Partly Cloudy', emoji: '⛅', humidity: 55, wind: 10 },
      'islamabad': { temp: 24, condition: 'Clear', emoji: '🌤️', humidity: 60, wind: 8 },
      'london': { temp: 15, condition: 'Cloudy', emoji: '☁️', humidity: 75, wind: 18 },
      'new york': { temp: 22, condition: 'Sunny', emoji: '☀️', humidity: 60, wind: 12 },
      'dubai': { temp: 38, condition: 'Very Hot', emoji: '🔥', humidity: 40, wind: 15 },
      'tokyo': { temp: 20, condition: 'Clear', emoji: '🌤️', humidity: 65, wind: 10 }
    };
    
    const cityLower = city.toLowerCase();
    const weather = simulatedWeather[cityLower] || {
      temp: 20 + Math.floor(Math.random() * 15),
      condition: ['Sunny', 'Cloudy', 'Clear', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
      emoji: '🌡️',
      humidity: 50 + Math.floor(Math.random() * 30),
      wind: 5 + Math.floor(Math.random() * 15)
    };
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: `🌤️ WEATHER - ${city}`, iconURL: 'https://cdn-icons-png.flaticon.com/512/1163/1163661.png' })
      .setDescription(`**${weather.emoji} ${weather.condition}**`)
      .addFields(
        { name: '🌡️ Temperature', value: `**${weather.temp}°C**`, inline: true },
        { name: '💧 Humidity', value: `**${weather.humidity}%**`, inline: true },
        { name: '💨 Wind Speed', value: `**${weather.wind} km/h**`, inline: true }
      )
      .setFooter({ 
        text: `Simulated Data • Requested by ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL() 
      })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
}

async function translateCommand(message, args) {
  const toIndex = args.findIndex(arg => arg.toLowerCase() === 'to');
  
  if (toIndex === -1 || toIndex === 0 || toIndex === args.length - 1) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '🌐 TRANSLATOR', iconURL: client.user.displayAvatarURL() })
      .setDescription(`**Usage:** \`${PREFIX}translate <text> to <language>\``)
      .addFields({
        name: '📋 Examples',
        value: '```\n' +
               `${PREFIX}translate hello to spanish\n` +
               `${PREFIX}translate good morning to french\n` +
               '```'
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
    'urdu': 'ur', 'turkish': 'tr'
  };
  
  const targetCode = langCodes[targetLang] || targetLang;
  
  try {
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: { q: text, langpair: `en|${targetCode}` }
    });
    
    const translatedText = response.data.responseData.translatedText;
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '🌐 TRANSLATION', iconURL: client.user.displayAvatarURL() })
      .addFields(
        { name: '🇬🇧 Original', value: `\`\`\`${text}\`\`\``, inline: false },
        { name: `🌍 Translated (${targetLang})`, value: `\`\`\`${translatedText}\`\`\``, inline: false }
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Failed to translate. Please try again.')] });
  }
}

// ==================== FUN COMMANDS ====================
async function jokeCommand(message) {
  const jokes = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    "Why don't eggs tell jokes? They'd crack each other up.",
    "What do you call fake spaghetti? An impasta!",
    "Why did the bicycle fall over? Because it was two-tired!",
    "What do you call a bear with no teeth? A gummy bear!",
    "I'm reading a book on anti-gravity. It's impossible to put down!",
    "Why did the math book look so sad? Because it had too many problems."
  ];
  
  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.fun)
    .setAuthor({ name: '😂 RANDOM JOKE', iconURL: client.user.displayAvatarURL() })
    .setDescription(`**${joke}**`)
    .setFooter({ text: `Requested by ${message.author.tag}` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function quoteCommand(message) {
  const quotes = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
    { text: "Whoever is happy will make others happy too.", author: "Anne Frank" },
    { text: "You must be the change you wish to see in the world.", author: "Mahatma Gandhi" },
    { text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" }
  ];
  
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setAuthor({ name: '💭 INSPIRATIONAL QUOTE', iconURL: client.user.displayAvatarURL() })
    .setDescription(`*"${quote.text}"*\n\n**— ${quote.author}**`)
    .setFooter({ text: `Requested by ${message.author.tag}` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function coinFlipCommand(message) {
  const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
  const emoji = result === 'Heads' ? '👑' : '🦅';
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.fun)
    .setAuthor({ name: '🪙 COIN FLIP', iconURL: message.author.displayAvatarURL() })
    .setDescription(`${emoji} **${result}**`)
    .setFooter({ text: `Flipped by ${message.author.tag}` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function diceRollCommand(message, args) {
  const dice = args[0] || '1d6';
  const [num, sides] = dice.split('d').map(Number);
  
  if (!num || !sides || num > 10 || sides > 100) {
    return message.reply({ embeds: [createErrorEmbed('Usage: =dice [NdS]\nExample: =dice 2d6 (max 10d100)')] });
  }
  
  let total = 0;
  const rolls = [];
  
  for (let i = 0; i < num; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    total += roll;
  }
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.fun)
    .setAuthor({ name: '🎲 DICE ROLL', iconURL: message.author.displayAvatarURL() })
    .setDescription(`**${dice}**`)
    .addFields(
      { name: '🎯 Rolls', value: rolls.join(', '), inline: true },
      { name: '💰 Total', value: `${total}`, inline: true }
    )
    .setFooter({ text: `Rolled by ${message.author.tag}` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function eightBallCommand(message, args) {
  if (!args.length) {
    return message.reply({ embeds: [createErrorEmbed('Ask a question! Example: =8ball Will I win today?')] });
  }
  
  const responses = [
    '🎱 It is certain.',
    '🎱 It is decidedly so.',
    '🎱 Without a doubt.',
    '🎱 Yes definitely.',
    '🎱 You may rely on it.',
    '🎱 As I see it, yes.',
    '🎱 Most likely.',
    '🎱 Outlook good.',
    '🎱 Yes.',
    '🎱 Signs point to yes.',
    '🎱 Reply hazy, try again.',
    '🎱 Ask again later.',
    '🎱 Better not tell you now.',
    '🎱 Cannot predict now.',
    '🎱 Concentrate and ask again.',
    '🎱 Don\'t count on it.',
    '🎱 My reply is no.',
    '🎱 My sources say no.',
    '🎱 Outlook not so good.',
    '🎱 Very doubtful.'
  ];
  
  const answer = responses[Math.floor(Math.random() * responses.length)];
  const question = args.join(' ');
  
  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setAuthor({ name: '🎱 MAGIC 8 BALL', iconURL: message.author.displayAvatarURL() })
    .addFields(
      { name: '❓ Question', value: question, inline: false },
      { name: '🎱 Answer', value: answer, inline: false }
    )
    .setFooter({ text: `Asked by ${message.author.tag}` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// ==================== MODERATION COMMANDS ====================
async function clearCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions.')] });
  }
  
  const amount = parseInt(args[0]) || 10;
  
  if (isNaN(amount) || amount < 1 || amount > 100) {
    return message.reply({ embeds: [createErrorEmbed('Please specify a number between 1 and 100.')] });
  }
  
  try {
    const deleted = await message.channel.bulkDelete(Math.min(amount, 100), true);
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '🗑️ MESSAGES CLEARED', iconURL: message.author.displayAvatarURL() })
      .setDescription(`**${deleted.size}** messages deleted`)
      .addFields(
        { name: '📌 Channel', value: `${message.channel}`, inline: true },
        { name: '👮 Moderator', value: `${message.author}`, inline: true }
      )
      .setFooter({ text: 'Messages deleted successfully' })
      .setTimestamp();
    
    const reply = await message.channel.send({ embeds: [embed] });
    
    // Delete confirmation after 5 seconds
    setTimeout(() => reply.delete().catch(() => {}), 5000);
    
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Cannot delete messages. Messages may be older than 14 days.')] });
  }
}

async function kickCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions.')] });
  }
  
  if (args.length < 1) {
    return message.reply({ embeds: [createErrorEmbed(`Usage: ${PREFIX}kick <@user> [reason]`)] });
  }
  
  const userId = extractId(args[0]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention.')] });
  
  try {
    const member = await message.guild.members.fetch(userId);
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    // Check permissions
    if (member.roles.highest.position >= message.member.roles.highest.position && !isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You cannot kick someone with higher or equal role.')] });
    }
    
    await member.kick(reason);
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setAuthor({ name: '👢 USER KICKED', iconURL: member.user.displayAvatarURL() })
      .addFields(
        { name: '👤 User', value: `${member.user.tag}`, inline: true },
        { name: '👮 Moderator', value: `${message.author}`, inline: true },
        { name: '📝 Reason', value: reason, inline: false }
      )
      .setFooter({ text: `User ID: ${member.id}` })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Cannot kick user. Check permissions.')] });
  }
}

async function banCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions.')] });
  }
  
  if (args.length < 1) {
    return message.reply({ embeds: [createErrorEmbed(`Usage: ${PREFIX}ban <@user> [reason]`)] });
  }
  
  const userId = extractId(args[0]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention.')] });
  
  try {
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    await message.guild.members.ban(userId, { reason });
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setAuthor({ name: '🔨 USER BANNED', iconURL: client.user.displayAvatarURL() })
      .addFields(
        { name: '🆔 User ID', value: `\`${userId}\``, inline: true },
        { name: '👮 Moderator', value: `${message.author}`, inline: true },
        { name: '📝 Reason', value: reason, inline: false }
      )
      .setFooter({ text: 'User has been banned from the server' })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('Cannot ban user. Check permissions.')] });
  }
}

async function warnCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions.')] });
  }
  
  if (args.length < 2) {
    return message.reply({ embeds: [createErrorEmbed(`Usage: ${PREFIX}warn <@user> <reason>`)] });
  }
  
  const userId = extractId(args[0]);
  if (!userId) return message.reply({ embeds: [createErrorEmbed('Invalid user mention.')] });
  
  try {
    const member = await message.guild.members.fetch(userId);
    const reason = args.slice(1).join(' ');
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setAuthor({ name: '⚠️ USER WARNED', iconURL: member.user.displayAvatarURL() })
      .addFields(
        { name: '👤 User', value: `${member}`, inline: true },
        { name: '👮 Moderator', value: `${message.author}`, inline: true },
        { name: '📝 Reason', value: reason, inline: false }
      )
      .setFooter({ text: `User ID: ${member.id}` })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    message.reply({ embeds: [createErrorEmbed('User not found.')] });
  }
}

// ==================== BOT STARTUP ====================
client.on('ready', () => {
  console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  console.log(`👥 Total users: ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`);
  console.log(`🎮 Games: Flag, Animal, Trivia, RPS, Number, Hangman`);
  console.log(`📊 Systems: XP, Leaderboard, Daily Rewards`);
  console.log(`⚡ Ready to use!`);
  
  // Set bot activity
  client.user.setPresence({
    activities: [{
      name: `=help | ${client.guilds.cache.size} servers`,
      type: ActivityType.Playing
    }],
    status: 'online'
  });
  
  // Auto-save data every 5 minutes
  setInterval(() => {
    dataStore.saveData();
  }, 5 * 60 * 1000);
});

// ==================== BOT LOGIN ====================
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';

if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
  console.error('❌ ERROR: Please set DISCORD_BOT_TOKEN environment variable!');
  console.error('💡 Railway pe jao: Project → Variables → Add DISCORD_BOT_TOKEN');
  process.exit(1);
}

client.login(BOT_TOKEN)
  .then(() => {
    console.log('🔑 Bot logged in successfully!');
  })
  .catch((error) => {
    console.error('❌ Failed to login:', error.message);
    console.error('💡 Check: 1) Bot Token  2) Bot Permissions');
    process.exit(1);
  });

// Export for testing
module.exports = { client };
