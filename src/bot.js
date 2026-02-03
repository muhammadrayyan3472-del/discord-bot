const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Partials, Collection, MessageMentions } = require('discord.js');
const { evaluate } = require('mathjs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PREFIX = '=';

// ==================== EXTREME HARD XP SYSTEM ====================
const XP_CONFIG = {
  PER_MESSAGE: 0.1,            // 10 messages = 1 XP
  PER_GAME_WIN: 2,            // Game jeetne par sirf 2 XP
  PER_GAME_PARTICIPATION: 0.5, // Khelne par 0.5 XP
  DAILY_BONUS: 5,             // Rozana sirf 5 XP
  LEVEL_MULTIPLIER: 500,      // Bahut zyada hard
  LEVEL_EXPONENT: 2,          // Exponential growth
  MAX_LEVEL: 1000,            // Maximum level 1000
  COOLDOWN_PER_MESSAGE: 60,   // 60 seconds cooldown per message XP
  COOLDOWN_PER_GAME: 300      // 5 minutes cooldown per game
};

// ==================== GLOBAL VARIABLES ====================
const activeGames = new Map();
const cooldowns = new Map();
const messageXPcooldown = new Map();
const gameCooldowns = new Map();
const userStats = new Map();
const serverStats = new Map();

// ==================== FLAG GAME COUNTRIES (150 countries) ====================
const COUNTRIES = {
  easy: [
    { name: 'United States', flag: '🇺🇸', code: 'us', image: 'https://flagcdn.com/w320/us.png', capital: 'Washington D.C.' },
    { name: 'United Kingdom', flag: '🇬🇧', code: 'gb', image: 'https://flagcdn.com/w320/gb.png', capital: 'London' },
    { name: 'Canada', flag: '🇨🇦', code: 'ca', image: 'https://flagcdn.com/w320/ca.png', capital: 'Ottawa' },
    { name: 'Australia', flag: '🇦🇺', code: 'au', image: 'https://flagcdn.com/w320/au.png', capital: 'Canberra' },
    { name: 'Germany', flag: '🇩🇪', code: 'de', image: 'https://flagcdn.com/w320/de.png', capital: 'Berlin' },
    { name: 'France', flag: '🇫🇷', code: 'fr', image: 'https://flagcdn.com/w320/fr.png', capital: 'Paris' },
    { name: 'Japan', flag: '🇯🇵', code: 'jp', image: 'https://flagcdn.com/w320/jp.png', capital: 'Tokyo' },
    { name: 'India', flag: '🇮🇳', code: 'in', image: 'https://flagcdn.com/w320/in.png', capital: 'New Delhi' },
    { name: 'Brazil', flag: '🇧🇷', code: 'br', image: 'https://flagcdn.com/w320/br.png', capital: 'Brasília' },
    { name: 'Italy', flag: '🇮🇹', code: 'it', image: 'https://flagcdn.com/w320/it.png', capital: 'Rome' },
    { name: 'Spain', flag: '🇪🇸', code: 'es', image: 'https://flagcdn.com/w320/es.png', capital: 'Madrid' },
    { name: 'Russia', flag: '🇷🇺', code: 'ru', image: 'https://flagcdn.com/w320/ru.png', capital: 'Moscow' },
    { name: 'China', flag: '🇨🇳', code: 'cn', image: 'https://flagcdn.com/w320/cn.png', capital: 'Beijing' },
    { name: 'South Korea', flag: '🇰🇷', code: 'kr', image: 'https://flagcdn.com/w320/kr.png', capital: 'Seoul' },
    { name: 'Mexico', flag: '🇲🇽', code: 'mx', image: 'https://flagcdn.com/w320/mx.png', capital: 'Mexico City' }
  ],
  medium: [
    { name: 'Argentina', flag: '🇦🇷', code: 'ar', image: 'https://flagcdn.com/w320/ar.png', capital: 'Buenos Aires' },
    { name: 'South Africa', flag: '🇿🇦', code: 'za', image: 'https://flagcdn.com/w320/za.png', capital: 'Pretoria' },
    { name: 'Egypt', flag: '🇪🇬', code: 'eg', image: 'https://flagcdn.com/w320/eg.png', capital: 'Cairo' },
    { name: 'Turkey', flag: '🇹🇷', code: 'tr', image: 'https://flagcdn.com/w320/tr.png', capital: 'Ankara' },
    { name: 'Saudi Arabia', flag: '🇸🇦', code: 'sa', image: 'https://flagcdn.com/w320/sa.png', capital: 'Riyadh' },
    { name: 'Pakistan', flag: '🇵🇰', code: 'pk', image: 'https://flagcdn.com/w320/pk.png', capital: 'Islamabad' },
    { name: 'Nigeria', flag: '🇳🇬', code: 'ng', image: 'https://flagcdn.com/w320/ng.png', capital: 'Abuja' },
    { name: 'Indonesia', flag: '🇮🇩', code: 'id', image: 'https://flagcdn.com/w320/id.png', capital: 'Jakarta' },
    { name: 'Netherlands', flag: '🇳🇱', code: 'nl', image: 'https://flagcdn.com/w320/nl.png', capital: 'Amsterdam' },
    { name: 'Switzerland', flag: '🇨🇭', code: 'ch', image: 'https://flagcdn.com/w320/ch.png', capital: 'Bern' },
    { name: 'Sweden', flag: '🇸🇪', code: 'se', image: 'https://flagcdn.com/w320/se.png', capital: 'Stockholm' },
    { name: 'Norway', flag: '🇳🇴', code: 'no', image: 'https://flagcdn.com/w320/no.png', capital: 'Oslo' },
    { name: 'Denmark', flag: '🇩🇰', code: 'dk', image: 'https://flagcdn.com/w320/dk.png', capital: 'Copenhagen' },
    { name: 'Finland', flag: '🇫🇮', code: 'fi', image: 'https://flagcdn.com/w320/fi.png', capital: 'Helsinki' },
    { name: 'Poland', flag: '🇵🇱', code: 'pl', image: 'https://flagcdn.com/w320/pl.png', capital: 'Warsaw' }
  ],
  hard: [
    { name: 'Portugal', flag: '🇵🇹', code: 'pt', image: 'https://flagcdn.com/w320/pt.png', capital: 'Lisbon' },
    { name: 'Greece', flag: '🇬🇷', code: 'gr', image: 'https://flagcdn.com/w320/gr.png', capital: 'Athens' },
    { name: 'Thailand', flag: '🇹🇭', code: 'th', image: 'https://flagcdn.com/w320/th.png', capital: 'Bangkok' },
    { name: 'Vietnam', flag: '🇻🇳', code: 'vn', image: 'https://flagcdn.com/w320/vn.png', capital: 'Hanoi' },
    { name: 'Philippines', flag: '🇵🇭', code: 'ph', image: 'https://flagcdn.com/w320/ph.png', capital: 'Manila' },
    { name: 'Malaysia', flag: '🇲🇾', code: 'my', image: 'https://flagcdn.com/w320/my.png', capital: 'Kuala Lumpur' },
    { name: 'Singapore', flag: '🇸🇬', code: 'sg', image: 'https://flagcdn.com/w320/sg.png', capital: 'Singapore' },
    { name: 'Israel', flag: '🇮🇱', code: 'il', image: 'https://flagcdn.com/w320/il.png', capital: 'Jerusalem' },
    { name: 'United Arab Emirates', flag: '🇦🇪', code: 'ae', image: 'https://flagcdn.com/w320/ae.png', capital: 'Abu Dhabi' },
    { name: 'Qatar', flag: '🇶🇦', code: 'qa', image: 'https://flagcdn.com/w320/qa.png', capital: 'Doha' },
    { name: 'Kuwait', flag: '🇰🇼', code: 'kw', image: 'https://flagcdn.com/w320/kw.png', capital: 'Kuwait City' },
    { name: 'Ukraine', flag: '🇺🇦', code: 'ua', image: 'https://flagcdn.com/w320/ua.png', capital: 'Kyiv' },
    { name: 'Czech Republic', flag: '🇨🇿', code: 'cz', image: 'https://flagcdn.com/w320/cz.png', capital: 'Prague' },
    { name: 'Hungary', flag: '🇭🇺', code: 'hu', image: 'https://flagcdn.com/w320/hu.png', capital: 'Budapest' },
    { name: 'Romania', flag: '🇷🇴', code: 'ro', image: 'https://flagcdn.com/w320/ro.png', capital: 'Bucharest' }
  ],
  extreme: [
    { name: 'Bangladesh', flag: '🇧🇩', code: 'bd', image: 'https://flagcdn.com/w320/bd.png', capital: 'Dhaka' },
    { name: 'Sri Lanka', flag: '🇱🇰', code: 'lk', image: 'https://flagcdn.com/w320/lk.png', capital: 'Colombo' },
    { name: 'Nepal', flag: '🇳🇵', code: 'np', image: 'https://flagcdn.com/w320/np.png', capital: 'Kathmandu' },
    { name: 'Myanmar', flag: '🇲🇲', code: 'mm', image: 'https://flagcdn.com/w320/mm.png', capital: 'Naypyidaw' },
    { name: 'Cambodia', flag: '🇰🇭', code: 'kh', image: 'https://flagcdn.com/w320/kh.png', capital: 'Phnom Penh' },
    { name: 'Laos', flag: '🇱🇦', code: 'la', image: 'https://flagcdn.com/w320/la.png', capital: 'Vientiane' },
    { name: 'Mongolia', flag: '🇲🇳', code: 'mn', image: 'https://flagcdn.com/w320/mn.png', capital: 'Ulaanbaatar' },
    { name: 'Kazakhstan', flag: '🇰🇿', code: 'kz', image: 'https://flagcdn.com/w320/kz.png', capital: 'Nur-Sultan' },
    { name: 'Uzbekistan', flag: '🇺🇿', code: 'uz', image: 'https://flagcdn.com/w320/uz.png', capital: 'Tashkent' },
    { name: 'Azerbaijan', flag: '🇦🇿', code: 'az', image: 'https://flagcdn.com/w320/az.png', capital: 'Baku' },
    { name: 'Georgia', flag: '🇬🇪', code: 'ge', image: 'https://flagcdn.com/w320/ge.png', capital: 'Tbilisi' },
    { name: 'Armenia', flag: '🇦🇲', code: 'am', image: 'https://flagcdn.com/w320/am.png', capital: 'Yerevan' },
    { name: 'Belarus', flag: '🇧🇾', code: 'by', image: 'https://flagcdn.com/w320/by.png', capital: 'Minsk' },
    { name: 'Slovakia', flag: '🇸🇰', code: 'sk', image: 'https://flagcdn.com/w320/sk.png', capital: 'Bratislava' },
    { name: 'Slovenia', flag: '🇸🇮', code: 'si', image: 'https://flagcdn.com/w320/si.png', capital: 'Ljubljana' }
  ]
};

// ==================== ANIMAL GAME (100 animals) ====================
const ANIMALS = {
  easy: [
    'lion', 'tiger', 'elephant', 'giraffe', 'zebra', 'bear', 'wolf', 'fox', 'monkey', 'kangaroo',
    'panda', 'koala', 'crocodile', 'hippo', 'rhino', 'cheetah', 'leopard', 'gorilla', 'chimpanzee', 'orangutan',
    'penguin', 'dolphin', 'whale', 'shark', 'octopus', 'eagle', 'hawk', 'owl', 'parrot', 'flamingo',
    'horse', 'cow', 'pig', 'sheep', 'goat', 'chicken', 'duck', 'goose', 'turkey', 'rabbit'
  ],
  medium: [
    'anteater', 'armadillo', 'platypus', 'wombat', 'meerkat', 'lynx', 'jaguar', 'puma', 'hyena', 'mongoose',
    'walrus', 'seal', 'otter', 'beaver', 'raccoon', 'skunk', 'porcupine', 'hedgehog', 'mole', 'bat',
    'pelican', 'swan', 'peacock', 'toucan', 'woodpecker', 'vulture', 'falcon', 'condor', 'ostrich', 'emu',
    'camel', 'llama', 'alpaca', 'yak', 'buffalo', 'deer', 'moose', 'elk', 'caribou', 'reindeer'
  ],
  hard: [
    'aardvark', 'okapi', 'narwhal', 'quokka', 'tarsier', 'axolotl', 'capybara', 'pangolin', 'lemur', 'tapir',
    'manatee', 'sloth', 'wolverine', 'marmoset', 'gibbon', 'baboon', 'mandrill', 'colobus', 'tamarin', 'loris',
    'cassowary', 'kiwi', 'kakapo', 'kea', 'takahe', 'hoatzin', 'hornbill', 'bird of paradise', 'lyrebird', 'bowerbird',
    'antechinus', 'bilby', 'bandicoot', 'quoll', 'numbat', 'tasmanian devil', 'thylacine', 'wombat', 'echidna', 'wallaby'
  ],
  extreme: [
    'aye-aye', 'fossa', 'tenrec', 'solenodon', 'dugong', 'saiga', 'takhi', 'bongo', 'gerenuk', 'dik-dik',
    'klipspringer', 'duiker', 'bushbaby', 'galago', 'potto', 'tarsier', 'slow loris', 'pygmy marmoset', 'silky sifaka', 'indri',
    'proboscis monkey', 'golden snub-nosed monkey', 'emperor tamarin', 'cotton-top tamarin', 'red-shanked douc', 'black howler', 'spider monkey', 'woolly monkey', 'saki monkey', 'uakari',
    'sun bear', 'spectacled bear', 'sloth bear', 'asiatic black bear', 'andean bear', 'malayan tapir', 'mountain tapir', 'lowland tapir', 'brazilian tapir', 'asian tapir'
  ]
};

// ==================== HANGMAN CATEGORIES ====================
const HANGMAN_WORDS = {
  animals: ['lion', 'tiger', 'elephant', 'giraffe', 'kangaroo', 'penguin', 'dolphin', 'octopus', 'butterfly', 'crocodile'],
  fruits: ['apple', 'banana', 'orange', 'mango', 'grape', 'strawberry', 'pineapple', 'watermelon', 'kiwi', 'coconut'],
  countries: ['india', 'china', 'brazil', 'canada', 'france', 'germany', 'japan', 'mexico', 'russia', 'spain'],
  movies: ['avatar', 'titanic', 'inception', 'jaws', 'frozen', 'gladiator', 'matrix', 'terminator', 'godfather', 'starwars'],
  sports: ['cricket', 'football', 'basketball', 'tennis', 'hockey', 'volleyball', 'baseball', 'rugby', 'golf', 'boxing'],
  colors: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black', 'white', 'brown'],
  programming: ['python', 'javascript', 'java', 'cplusplus', 'html', 'css', 'ruby', 'php', 'swift', 'kotlin']
};

// ==================== TRIVIA QUESTIONS ====================
const TRIVIA_QUESTIONS = {
  general: [
    { question: 'What is the capital of France?', answer: 'paris', options: ['London', 'Berlin', 'Paris', 'Madrid'], category: 'Geography' },
    { question: 'How many continents are there?', answer: '7', options: ['5', '6', '7', '8'], category: 'Geography' },
    { question: 'What is the largest ocean?', answer: 'pacific', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], category: 'Geography' },
    { question: 'What year did World War II end?', answer: '1945', options: ['1944', '1945', '1946', '1947'], category: 'History' },
    { question: 'Who painted the Mona Lisa?', answer: 'leonardo da vinci', options: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'], category: 'Art' },
    { question: 'What is the chemical symbol for gold?', answer: 'au', options: ['Go', 'Gd', 'Au', 'Ag'], category: 'Science' },
    { question: 'How many planets are in our solar system?', answer: '8', options: ['7', '8', '9', '10'], category: 'Science' },
    { question: 'What is the fastest land animal?', answer: 'cheetah', options: ['Lion', 'Cheetah', 'Leopard', 'Tiger'], category: 'Animals' },
    { question: 'What is the largest mammal?', answer: 'blue whale', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Hippo'], category: 'Animals' },
    { question: 'How many sides does a hexagon have?', answer: '6', options: ['5', '6', '7', '8'], category: 'Math' }
  ],
  science: [
    { question: 'What is H2O?', answer: 'water', options: ['Hydrogen', 'Oxygen', 'Water', 'Carbon Dioxide'], category: 'Chemistry' },
    { question: 'What planet is known as the Red Planet?', answer: 'mars', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], category: 'Astronomy' },
    { question: 'What is the hardest natural substance?', answer: 'diamond', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], category: 'Chemistry' },
    { question: 'How many bones are in the human body?', answer: '206', options: ['200', '206', '210', '215'], category: 'Biology' },
    { question: 'What gas do plants absorb?', answer: 'carbon dioxide', options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'], category: 'Biology' },
    { question: 'What is the speed of light?', answer: '299792458', options: ['299792458', '300000000', '250000000', '350000000'], category: 'Physics' },
    { question: 'What is the atomic number of oxygen?', answer: '8', options: ['6', '7', '8', '9'], category: 'Chemistry' },
    { question: 'What is the main gas in Earth\'s atmosphere?', answer: 'nitrogen', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], category: 'Geography' },
    { question: 'What is the closest star to Earth?', answer: 'sun', options: ['Proxima Centauri', 'Sun', 'Alpha Centauri', 'Sirius'], category: 'Astronomy' },
    { question: 'What is the study of fossils called?', answer: 'paleontology', options: ['Archeology', 'Paleontology', 'Geology', 'Anthropology'], category: 'Science' }
  ],
  sports: [
    { question: 'How many players are on a soccer team?', answer: '11', options: ['10', '11', '12', '13'], category: 'Soccer' },
    { question: 'Which country won the 2022 FIFA World Cup?', answer: 'argentina', options: ['Brazil', 'France', 'Argentina', 'Germany'], category: 'Soccer' },
    { question: 'In tennis, what is a zero score called?', answer: 'love', options: ['Zero', 'Nil', 'Love', 'None'], category: 'Tennis' },
    { question: 'How many periods are in a hockey game?', answer: '3', options: ['2', '3', '4', '5'], category: 'Hockey' },
    { question: 'Which sport uses a shuttlecock?', answer: 'badminton', options: ['Tennis', 'Badminton', 'Squash', 'Table Tennis'], category: 'Badminton' },
    { question: 'How many rings are in the Olympic symbol?', answer: '5', options: ['4', '5', '6', '7'], category: 'Olympics' },
    { question: 'What is the diameter of a basketball hoop?', answer: '18', options: ['16', '18', '20', '22'], category: 'Basketball' },
    { question: 'How many holes in a standard golf course?', answer: '18', options: ['9', '18', '27', '36'], category: 'Golf' },
    { question: 'Which country invented cricket?', answer: 'england', options: ['Australia', 'England', 'India', 'West Indies'], category: 'Cricket' },
    { question: 'How many players in a baseball team?', answer: '9', options: ['9', '10', '11', '12'], category: 'Baseball' }
  ]
};

// ==================== ALL COMMANDS DATA STRUCTURE ====================
const ALL_COMMANDS = {
  // ... (same as before but more detailed)
  CRYPTOCURRENCY: [
    { command: 'bal', description: 'Check your cryptocurrency balance', usage: '=bal', example: '=bal', category: 'crypto' },
    { command: 'txid', description: 'View transaction details', usage: '=txid <transaction_id>', example: '=txid abc123', category: 'crypto' },
    { command: 'convert', description: 'Convert between currencies', usage: '=convert <amount> <from> to <to>', example: '=convert 100 USD to EUR', category: 'crypto' }
  ],
  UTILITIES: [
    { command: 'calc', description: 'Advanced math calculator', usage: '=calc <expression>', example: '=calc 5*(10+3)', category: 'utility' },
    { command: 'remind', description: 'Set reminders for yourself', usage: '=remind <time> <message>', example: '=remind 1h do homework', category: 'utility' },
    { command: 'translate', description: 'Translate text between languages', usage: '=translate <text> to <language>', example: '=translate hello to spanish', category: 'utility' },
    { command: 'weather', description: 'Check weather for any city', usage: '=weather <city>', example: '=weather London', category: 'utility' },
    { command: 'poll', description: 'Create a poll with multiple options', usage: '=poll <question> | option1 | option2', example: '=poll Favorite color? | Red | Blue | Green', category: 'utility' }
  ],
  USER_SERVER: [
    { command: 'ui', description: 'View detailed user information', usage: '=ui [@user]', example: '=ui @username', category: 'user' },
    { command: 'avatar', description: 'Get user avatar in high quality', usage: '=avatar [@user]', example: '=avatar @username', category: 'user' },
    { command: 'banner', description: 'View user banner', usage: '=banner [@user]', example: '=banner @username', category: 'user' },
    { command: 'serverinfo', description: 'View server statistics and information', usage: '=serverinfo', example: '=serverinfo', category: 'server' },
    { command: 'botinfo', description: 'Get bot information and statistics', usage: '=botinfo', example: '=botinfo', category: 'bot' }
  ],
  INFO_STATS: [
    { command: 'ping', description: 'Check bot latency and response time', usage: '=ping', example: '=ping', category: 'info' },
    { command: 'rep', description: 'Give reputation to a user', usage: '=rep @user', example: '=rep @username', category: 'social' },
    { command: 'getrep', description: 'Check user reputation points', usage: '=getrep [@user]', example: '=getrep @username', category: 'social' },
    { command: 'msgcount', description: 'View message statistics', usage: '=msgcount [@user]', example: '=msgcount @username', category: 'stats' }
  ],
  ENTERTAINMENT: [
    { command: '8ball', description: 'Ask the magic 8-ball a question', usage: '=8ball <question>', example: '=8ball Will I win today?', category: 'fun' },
    { command: 'dice', description: 'Roll dice with custom sides', usage: '=dice [NdS]', example: '=dice 2d6', category: 'fun' },
    { command: 'coin', description: 'Flip a coin', usage: '=coin', example: '=coin', category: 'fun' },
    { command: 'joke', description: 'Get a random joke', usage: '=joke', example: '=joke', category: 'fun' },
    { command: 'quote', description: 'Get an inspirational quote', usage: '=quote', example: '=quote', category: 'fun' }
  ],
  VOUCH: [
    { command: 'vouch', description: 'Purchase vouch services', usage: '=vouch <service>', example: '=vouch boost', category: 'vouch' },
    { command: 'evouch', description: 'Exchange vouch points', usage: '=evouch <amount>', example: '=evouch 100', category: 'vouch' }
  ],
  MODERATION: [
    { command: 'warn', description: 'Warn a user for rule violation', usage: '=warn @user <reason>', example: '=warn @username spamming', category: 'moderation' },
    { command: 'warnings', description: 'View user warnings', usage: '=warnings [@user]', example: '=warnings @username', category: 'moderation' },
    { command: 'clearwarn', description: 'Clear warnings from a user', usage: '=clearwarn @user', example: '=clearwarn @username', category: 'moderation' },
    { command: 'kick', description: 'Kick a user from server', usage: '=kick @user [reason]', example: '=kick @username spamming', category: 'moderation' },
    { command: 'ban', description: 'Ban a user from server', usage: '=ban @user [reason]', example: '=ban @username hacking', category: 'moderation' },
    { command: 'unban', description: 'Unban a user', usage: '=unban <user_id>', example: '=unban 123456789', category: 'moderation' },
    { command: 'mute', description: 'Mute a user in text channels', usage: '=mute @user [duration]', example: '=mute @username 1h', category: 'moderation' },
    { command: 'unmute', description: 'Unmute a user', usage: '=unmute @user', example: '=unmute @username', category: 'moderation' },
    { command: 'timeout', description: 'Timeout a user', usage: '=timeout @user [duration]', example: '=timeout @username 30m', category: 'moderation' },
    { command: 'clear', description: 'Delete multiple messages', usage: '=clear <amount>', example: '=clear 50', category: 'moderation' }
  ],
  ROLE_MANAGEMENT: [
    { command: 'addrole', description: 'Add role to user', usage: '=addrole @user <role>', example: '=addrole @username Member', category: 'roles' },
    { command: 'removerole', description: 'Remove role from user', usage: '=removerole @user <role>', example: '=removerole @username Member', category: 'roles' },
    { command: 'changenick', description: 'Change user nickname', usage: '=changenick @user <nickname>', example: '=changenick @username NewNick', category: 'roles' },
    { command: 'rr', description: 'Setup reaction roles', usage: '=rr', example: '=rr', category: 'roles' },
    { command: 'r', description: 'Deploy role menu', usage: '=r', example: '=r', category: 'roles' },
    { command: 'addar', description: 'Add auto role', usage: '=addar <role>', example: '=addar @Member', category: 'roles' },
    { command: 'delar', description: 'Delete auto role', usage: '=delar <role>', example: '=delar @Member', category: 'roles' },
    { command: 'listar', description: 'List all auto roles', usage: '=listar', example: '=listar', category: 'roles' }
  ],
  VERIFICATION: [
    { command: 'verify', description: 'Verify a member', usage: '=verify @user', example: '=verify @username', category: 'verification' },
    { command: 'unverify', description: 'Unverify a member', usage: '=unverify @user', example: '=unverify @username', category: 'verification' },
    { command: 'verifypanel', description: 'Create verification panel', usage: '=verifypanel', example: '=verifypanel', category: 'verification' }
  ],
  GUESSING_GAMES: [
    { command: 'flag', description: 'Guess country flags with 5 options', usage: '=flag [easy|medium|hard|extreme]', example: '=flag hard', category: 'game' },
    { command: 'animal', description: 'Guess scrambled animal names', usage: '=animal [difficulty]', example: '=animal medium', category: 'game' },
    { command: 'hangman', description: 'Play hangman with categories', usage: '=hangman [category]', example: '=hangman movies', category: 'game' },
    { command: 'trivia', description: 'Answer trivia questions', usage: '=trivia [category]', example: '=trivia science', category: 'game' },
    { command: 'rps', description: 'Rock Paper Scissors vs bot', usage: '=rps <rock|paper|scissors>', example: '=rps rock', category: 'game' },
    { command: 'number', description: 'Guess the number game', usage: '=number [max]', example: '=number 1000', category: 'game' },
    { command: 'wordchain', description: 'Word chain game for everyone', usage: '=wordchain', example: '=wordchain', category: 'game' }
  ],
  XP_SYSTEM: [
    { command: 'rank', description: 'Check your XP rank and level', usage: '=rank [@user]', example: '=rank @username', category: 'xp' },
    { command: 'leaderboard', description: 'View server XP leaderboard', usage: '=leaderboard [page]', example: '=leaderboard 2', category: 'xp' },
    { command: 'daily', description: 'Claim daily XP reward', usage: '=daily', example: '=daily', category: 'xp' },
    { command: 'xp', description: 'View XP system information', usage: '=xp', example: '=xp', category: 'xp' }
  ],
  CHANNEL_CONTROLS: [
    { command: 'lock', description: 'Lock a channel', usage: '=lock [channel]', example: '=lock #general', category: 'channel' },
    { command: 'unlock', description: 'Unlock a channel', usage: '=unlock [channel]', example: '=unlock #general', category: 'channel' },
    { command: 'slowmode', description: 'Set channel slowmode', usage: '=slowmode <seconds>', example: '=slowmode 10', category: 'channel' },
    { command: 'nuke', description: 'Clone and clear channel', usage: '=nuke', example: '=nuke', category: 'channel' }
  ],
  TICKET_SYSTEM: [
    { command: 'ticket', description: 'Create a support ticket', usage: '=ticket <reason>', example: '=ticket Need help', category: 'ticket' },
    { command: 'close', description: 'Close a ticket', usage: '=close', example: '=close', category: 'ticket' }
  ],
  AUTO_MODERATION: [
    { command: 'automod', description: 'Setup auto moderation', usage: '=automod', example: '=automod', category: 'automod' },
    { command: 'blacklist', description: 'Manage blacklisted words', usage: '=blacklist <add|remove|list> <word>', example: '=blacklist add badword', category: 'automod' },
    { command: 'snipe', description: 'View deleted messages', usage: '=snipe', example: '=snipe', category: 'automod' },
    { command: 'editlogs', description: 'View edited messages', usage: '=editlogs', example: '=editlogs', category: 'automod' },
    { command: 'userlogs', description: 'View user moderation history', usage: '=userlogs @user', example: '=userlogs @username', category: 'automod' }
  ]
};

// ==================== HELPER FUNCTIONS ====================
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
    progress: Math.floor((xpInCurrent / currentLevelXP) * 100),
    totalXPForLevel: currentLevelXP
  };
}

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
  fun: 0xE91E63,
  crypto: 0xF7931A,
  moderation: 0x7289DA,
  utility: 0x3498DB,
  music: 0x1DB954
};

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

function createWarningEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function createInfoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`ℹ️ ${title}`)
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
         member.permissions.has(PermissionFlagsBits.BanMembers) ||
         member.permissions.has(PermissionFlagsBits.ManageRoles) ||
         member.permissions.has(PermissionFlagsBits.ManageChannels);
}

function isHighRole(member) {
  const highRoleNames = ['Admin', 'Administrator', 'Moderator', 'Mod', 'Staff', 'Owner', 'Manager', 'Leader', 'Head', 'Director'];
  const highRoleIds = [];
  
  return isAdmin(member) || 
         isMod(member) ||
         member.roles.cache.some(role => 
           highRoleNames.some(name => role.name.toLowerCase().includes(name.toLowerCase())) ||
           highRoleIds.includes(role.id) ||
           role.permissions.has(PermissionFlagsBits.ManageMessages)
         );
}

function checkCooldown(userId, type) {
  const now = Date.now();
  const key = `${userId}_${type}`;
  
  if (!cooldowns.has(key)) {
    cooldowns.set(key, now);
    return false;
  }
  
  const lastTime = cooldowns.get(key);
  let cooldownTime = 0;
  
  switch (type) {
    case 'message_xp': cooldownTime = XP_CONFIG.COOLDOWN_PER_MESSAGE * 1000; break;
    case 'game': cooldownTime = XP_CONFIG.COOLDOWN_PER_GAME * 1000; break;
    case 'daily': cooldownTime = 24 * 60 * 60 * 1000; break;
    default: cooldownTime = 1000; break;
  }
  
  if (now - lastTime < cooldownTime) {
    return Math.ceil((cooldownTime - (now - lastTime)) / 1000);
  }
  
  cooldowns.set(key, now);
  return false;
}

function scrambleWord(word) {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('').toUpperCase();
}

function generateProgressBar(current, max, length = 20) {
  const percentage = current / max;
  const filled = Math.round(length * percentage);
  const empty = length - filled;
  
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// ==================== DATA STORAGE CLASS ====================
class DataStore {
  constructor() {
    this.data = {
      xp: {},
      warnings: {},
      reputation: {},
      messageCounts: {},
      dailies: {},
      gameStats: {},
      userStats: {},
      serverStats: {},
      economy: {},
      inventory: {},
      settings: {},
      activeGames: new Map(),
      deletedMessages: new Map(),
      editedMessages: new Map(),
      snipeData: new Map(),
      lastUpdated: Date.now()
    };
    this.loadData();
  }
  
  loadData() {
    try {
      if (fs.existsSync('bot_data.json')) {
        const raw = fs.readFileSync('bot_data.json', 'utf8');
        const saved = JSON.parse(raw);
        
        // Merge data
        Object.keys(saved).forEach(key => {
          if (this.data[key] instanceof Map) {
            if (saved[key] && typeof saved[key] === 'object') {
              this.data[key] = new Map(Object.entries(saved[key]));
            }
          } else {
            this.data[key] = saved[key] || this.data[key];
          }
        });
        
        console.log('✅ Data loaded successfully');
      }
    } catch (error) {
      console.log('⚠️ Starting fresh database');
    }
  }
  
  saveData() {
    try {
      const toSave = { ...this.data };
      
      // Convert Maps to objects
      Object.keys(toSave).forEach(key => {
        if (toSave[key] instanceof Map) {
          toSave[key] = Object.fromEntries(toSave[key]);
        }
      });
      
      toSave.lastUpdated = Date.now();
      fs.writeFileSync('bot_data.json', JSON.stringify(toSave, null, 2));
    } catch (error) {
      console.error('❌ Save error:', error);
    }
  }
  
  // XP Methods
  getUserXP(guildId, userId) {
    if (!this.data.xp[guildId]) this.data.xp[guildId] = {};
    if (!this.data.xp[guildId][userId]) {
      this.data.xp[guildId][userId] = { 
        xp: 0, 
        level: 1, 
        messages: 0, 
        gamesWon: 0,
        gamesPlayed: 0,
        totalXP: 0,
        lastActive: Date.now(),
        joinDate: Date.now(),
        achievements: []
      };
    }
    return this.data.xp[guildId][userId];
  }
  
  setUserXP(guildId, userId, data) {
    if (!this.data.xp[guildId]) this.data.xp[guildId] = {};
    this.data.xp[guildId][userId] = data;
    this.saveData();
  }
  
  addXP(guildId, userId, amount, reason = '') {
    const userData = this.getUserXP(guildId, userId);
    userData.xp += amount;
    userData.totalXP += amount;
    userData.lastActive = Date.now();
    
    if (reason === 'message') {
      userData.messages++;
    } else if (reason.includes('game')) {
      userData.gamesPlayed++;
      if (reason.includes('win')) userData.gamesWon++;
    }
    
    this.setUserXP(guildId, userId, userData);
    return userData;
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
  
  // Game Stats
  updateGameStats(userId, gameType, won = false) {
    if (!this.data.gameStats[userId]) {
      this.data.gameStats[userId] = {};
    }
    
    if (!this.data.gameStats[userId][gameType]) {
      this.data.gameStats[userId][gameType] = { played: 0, won: 0, lost: 0, xpEarned: 0 };
    }
    
    this.data.gameStats[userId][gameType].played++;
    if (won) {
      this.data.gameStats[userId][gameType].won++;
    } else {
      this.data.gameStats[userId][gameType].lost++;
    }
    
    this.saveData();
  }
  
  // Warning System
  addWarning(guildId, userId, moderatorId, reason) {
    if (!this.data.warnings[guildId]) this.data.warnings[guildId] = {};
    if (!this.data.warnings[guildId][userId]) this.data.warnings[guildId][userId] = [];
    
    const warning = {
      id: Date.now().toString(),
      reason: reason,
      moderator: moderatorId,
      date: Date.now(),
      active: true
    };
    
    this.data.warnings[guildId][userId].push(warning);
    this.saveData();
    return warning;
  }
  
  getWarnings(guildId, userId) {
    if (!this.data.warnings[guildId] || !this.data.warnings[guildId][userId]) {
      return [];
    }
    return this.data.warnings[guildId][userId].filter(w => w.active);
  }
  
  clearWarnings(guildId, userId) {
    if (this.data.warnings[guildId] && this.data.warnings[guildId][userId]) {
      this.data.warnings[guildId][userId] = this.data.warnings[guildId][userId].map(w => ({
        ...w,
        active: false
      }));
      this.saveData();
      return true;
    }
    return false;
  }
  
  // Reputation System
  addReputation(guildId, userId, amount, giverId) {
    if (!this.data.reputation[guildId]) this.data.reputation[guildId] = {};
    if (!this.data.reputation[guildId][userId]) {
      this.data.reputation[guildId][userId] = { points: 0, given: 0, received: 0, history: [] };
    }
    
    this.data.reputation[guildId][userId].points += amount;
    this.data.reputation[guildId][userId].received += amount;
    
    const repEntry = {
      amount: amount,
      giver: giverId,
      date: Date.now(),
      reason: 'Given by user'
    };
    
    this.data.reputation[guildId][userId].history.push(repEntry);
    
    // Update giver stats
    if (!this.data.reputation[guildId][giverId]) {
      this.data.reputation[guildId][giverId] = { points: 0, given: 0, received: 0, history: [] };
    }
    this.data.reputation[guildId][giverId].given += amount;
    
    this.saveData();
    return this.data.reputation[guildId][userId].points;
  }
  
  getReputation(guildId, userId) {
    if (!this.data.reputation[guildId] || !this.data.reputation[guildId][userId]) {
      return { points: 0, given: 0, received: 0, history: [] };
    }
    return this.data.reputation[guildId][userId];
  }
  
  // Message Count
  incrementMessageCount(guildId, userId) {
    const userData = this.getUserXP(guildId, userId);
    userData.messages++;
    this.setUserXP(guildId, userId, userData);
    
    if (!this.data.messageCounts[guildId]) this.data.messageCounts[guildId] = 0;
    this.data.messageCounts[guildId]++;
    this.saveData();
  }
  
  getMessageCount(guildId) {
    return this.data.messageCounts[guildId] || 0;
  }
  
  // Snipe System
  addDeletedMessage(channelId, message) {
    if (!this.data.snipeData[channelId]) {
      this.data.snipeData[channelId] = [];
    }
    
    const snipeEntry = {
      content: message.content,
      author: message.author.id,
      authorName: message.author.tag,
      timestamp: Date.now(),
      attachments: message.attachments.size > 0 ? Array.from(message.attachments.values()).map(a => a.url) : []
    };
    
    this.data.snipeData[channelId].unshift(snipeEntry);
    
    // Keep only last 10 messages per channel
    if (this.data.snipeData[channelId].length > 10) {
      this.data.snipeData[channelId] = this.data.snipeData[channelId].slice(0, 10);
    }
    
    this.saveData();
  }
  
  getDeletedMessages(channelId, limit = 5) {
    if (!this.data.snipeData[channelId]) return [];
    return this.data.snipeData[channelId].slice(0, limit);
  }
  
  // Economy System (if needed)
  getEconomy(userId) {
    if (!this.data.economy[userId]) {
      this.data.economy[userId] = {
        balance: 1000,
        bank: 0,
        lastDaily: 0,
        lastWork: 0,
        inventory: [],
        transactions: []
      };
    }
    return this.data.economy[userId];
  }
  
  updateEconomy(userId, data) {
    this.data.economy[userId] = { ...this.getEconomy(userId), ...data };
    this.saveData();
  }
}

const dataStore = new DataStore();

// ==================== XP SYSTEM FUNCTIONS ====================
function addXP(userId, guildId, amount, reason = '') {
  const userData = dataStore.addXP(guildId, userId, amount, reason);
  const newLevelData = getLevelFromXP(userData.xp);
  
  const oldLevel = userData.level;
  userData.level = newLevelData.level;
  
  dataStore.setUserXP(guildId, userId, userData);
  
  // Update game stats if it's a game
  if (reason.includes('game')) {
    const gameType = reason.split('_')[0];
    dataStore.updateGameStats(userId, gameType, reason.includes('win'));
  }
  
  if (newLevelData.level > oldLevel) {
    return {
      levelUp: true,
      oldLevel: oldLevel,
      newLevel: newLevelData.level,
      xp: userData.xp,
      levelData: newLevelData
    };
  }
  
  return { levelUp: false, xp: userData.xp, level: newLevelData.level, levelData: newLevelData };
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
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildScheduledEvents,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember,
    Partials.ThreadMember
  ],
  allowedMentions: {
    parse: ['users', 'roles'],
    repliedUser: false
  }
});

// Global collections
client.commands = new Collection();
client.aliases = new Collection();
client.events = new Collection();
client.slashCommands = new Collection();
// ==================== FLAG GAME (PUBLIC - Anyone can answer) ====================
async function flagGameCommand(message, args) {
  const difficulty = args[0]?.toLowerCase() || 'easy';
  
  if (!['easy', 'medium', 'hard', 'extreme'].includes(difficulty)) {
    return message.reply({ 
      embeds: [createErrorEmbed('Invalid difficulty! Use: easy, medium, hard, extreme')] 
    });
  }
  
  const channelId = message.channel.id;
  
  // Check if there's already an active game in this channel
  if (activeGames.has(channelId)) {
    const existingGame = activeGames.get(channelId);
    if (existingGame.type === 'flag' && existingGame.active) {
      return message.reply({ 
        embeds: [createErrorEmbed(`A flag game is already active in this channel!`)] 
      });
    }
  }
  
  // Check cooldown for the channel
  const cooldownKey = `flag_${channelId}`;
  const cooldown = checkCooldown(channelId, 'channel_game');
  if (cooldown) {
    return message.reply({ 
      embeds: [createErrorEmbed(`Please wait ${cooldown} seconds before starting another game in this channel.`)] 
    });
  }
  
  // Get all countries for the difficulty
  const allCountries = COUNTRIES[difficulty];
  
  // Select 1 correct country
  const correctCountry = allCountries[Math.floor(Math.random() * allCountries.length)];
  
  // Get 4 wrong countries (different from correct)
  const wrongCountries = [];
  const availableCountries = allCountries.filter(c => c.name !== correctCountry.name);
  
  while (wrongCountries.length < 4 && availableCountries.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableCountries.length);
    const randomCountry = availableCountries[randomIndex];
    
    if (!wrongCountries.some(c => c.name === randomCountry.name)) {
      wrongCountries.push(randomCountry);
      availableCountries.splice(randomIndex, 1);
    }
  }
  
  // Combine all options and shuffle
  const allOptions = [correctCountry, ...wrongCountries];
  const shuffledOptions = shuffleArray(allOptions);
  
  // Create options text with numbers
  const optionsText = shuffledOptions.map((country, index) => 
    `${index + 1}. **${country.name}**`
  ).join('\n');
  
  // Store correct index
  const correctIndex = shuffledOptions.findIndex(c => c.name === correctCountry.name) + 1;
  
  const gameData = {
    type: 'flag',
    correctAnswer: correctCountry.name,
    correctCountry: correctCountry,
    correctIndex: correctIndex,
    options: shuffledOptions,
    difficulty: difficulty,
    channelId: channelId,
    messageId: null,
    startedBy: message.author.id,
    startTime: Date.now(),
    answeredBy: new Map(), // Track who answered
    winners: [],
    active: true,
    hintGiven: false,
    timeLeft: 30
  };
  
  activeGames.set(channelId, gameData);
  
  // Create the game embed with flag image
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ 
      name: `🎌 FLAG GUESSING GAME • Started by ${message.author.username}`, 
      iconURL: message.author.displayAvatarURL() 
    })
    .setTitle(`🏁 Difficulty: ${difficulty.toUpperCase()}`)
    .setImage(correctCountry.image) // Flag image
    .setDescription(`**Which country does this flag belong to?**\n\n**Select your answer by typing the number (1-5):**\n\n${optionsText}`)
    .addFields(
      { name: '⏱️ Time Remaining', value: '**30 seconds**', inline: true },
      { name: '🎯 Players Can Answer', value: '**Everyone in channel**', inline: true },
      { name: '🏆 XP Rewards', value: '1st: 2 XP\nOthers: 0.5 XP', inline: true }
    )
    .setFooter({ text: 'Type 1, 2, 3, 4, or 5 | First correct answer wins!' })
    .setTimestamp();
  
  // Send the game message
  const gameMessage = await message.channel.send({ embeds: [embed] });
  gameData.messageId = gameMessage.id;
  
  // Set up game timer
  gameData.interval = setInterval(async () => {
    if (!activeGames.has(channelId)) return;
    
    const currentGame = activeGames.get(channelId);
    if (!currentGame.active) return;
    
    currentGame.timeLeft--;
    
    // Update timer in embed
    if (currentGame.timeLeft % 5 === 0 || currentGame.timeLeft <= 10) {
      const updatedEmbed = EmbedBuilder.from(embed.data)
        .setFields(
          { name: '⏱️ Time Remaining', value: `**${currentGame.timeLeft} seconds**`, inline: true },
          { name: '🎯 Players Answered', value: `**${currentGame.answeredBy.size}** players`, inline: true },
          { name: '🏆 XP Rewards', value: '1st: 2 XP\nOthers: 0.5 XP', inline: true }
        );
      
      try {
        await gameMessage.edit({ embeds: [updatedEmbed] });
      } catch (err) {
        // Message might be deleted
      }
    }
    
    // Time's up
    if (currentGame.timeLeft <= 0) {
      endFlagGame(message.channel, true);
    }
    
    // Give hint at 15 seconds
    if (currentGame.timeLeft === 15 && !currentGame.hintGiven) {
      currentGame.hintGiven = true;
      const hint = `💡 **Hint:** The capital is **${currentGame.correctCountry.capital}**`;
      message.channel.send(hint).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      });
    }
  }, 1000);
  
  // Set timeout for game end
  gameData.timeout = setTimeout(() => {
    endFlagGame(message.channel, true);
  }, 30000);
  
  // Set channel cooldown
  cooldowns.set(cooldownKey, Date.now());
}

// ==================== END FLAG GAME ====================
async function endFlagGame(channel, timeout = false) {
  const channelId = channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'flag') return;
  
  // Clear timers
  if (gameData.interval) clearInterval(gameData.interval);
  if (gameData.timeout) clearTimeout(gameData.timeout);
  
  gameData.active = false;
  
  const correctCountry = gameData.correctCountry;
  const winners = gameData.winners;
  
  let resultDescription = '';
  let xpRewards = '';
  
  if (winners.length > 0) {
    // We have winners
    const firstWinner = winners[0];
    const firstUser = await channel.client.users.fetch(firstWinner.userId).catch(() => null);
    
    resultDescription = `**🎉 Winner: ${firstUser ? firstUser.tag : 'Unknown'}**\n`;
    resultDescription += `⏱️ Answered in **${firstWinner.time}s**\n`;
    
    if (winners.length > 1) {
      resultDescription += `\n**Other correct answers:**\n`;
      for (let i = 1; i < winners.length; i++) {
        const winner = winners[i];
        const user = await channel.client.users.fetch(winner.userId).catch(() => null);
        if (user) {
          resultDescription += `${i+1}. ${user.tag} (${winner.time}s)\n`;
        }
      }
    }
    
    // Distribute XP
    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      const xpEarned = i === 0 ? 2 : 0.5; // First gets 2 XP, others get 0.5 XP
      addXP(winner.userId, channel.guild.id, xpEarned, 'flag_game_win');
      
      if (i === 0) {
        xpRewards += `🥇 **${xpEarned} XP** to ${firstUser ? firstUser.tag : 'Winner'}\n`;
      } else {
        const user = await channel.client.users.fetch(winner.userId).catch(() => null);
        if (user) {
          xpRewards += `🎯 **${xpEarned} XP** to ${user.tag}\n`;
        }
      }
    }
    
  } else {
    // No winners
    resultDescription = '**😔 No one answered correctly!**\n';
  }
  
  const embed = new EmbedBuilder()
    .setColor(winners.length > 0 ? COLORS.success : COLORS.error)
    .setAuthor({ name: '🏁 FLAG GAME ENDED', iconURL: channel.client.user.displayAvatarURL() })
    .setTitle(`Answer: ${correctCountry.name} ${correctCountry.flag}`)
    .setDescription(resultDescription)
    .addFields(
      { name: '📊 Statistics', value: `**Total Players:** ${gameData.answeredBy.size}\n**Correct Answers:** ${winners.length}`, inline: true },
      { name: '🏆 Difficulty', value: gameData.difficulty.toUpperCase(), inline: true },
      { name: '💰 XP Distributed', value: xpRewards || 'None', inline: false }
    )
    .setImage(correctCountry.image)
    .setFooter({ text: timeout ? 'Game ended due to timeout' : 'Game ended' })
    .setTimestamp();
  
  await channel.send({ embeds: [embed] });
  
  // Clean up
  activeGames.delete(channelId);
}

// ==================== HANDLE FLAG GAME ANSWERS ====================
async function handleFlagGameAnswer(message) {
  const channelId = message.channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'flag' || !gameData.active) return false;
  
  const content = message.content.trim();
  
  // Check if user already answered
  if (gameData.answeredBy.has(message.author.id)) {
    // User already answered, maybe give hint
    if (Math.random() < 0.3) {
      const reply = await message.reply('You already answered this flag!').catch(() => null);
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
    }
    return true;
  }
  
  // Parse answer (could be number or country name)
  let answer = parseInt(content);
  let isNumberAnswer = !isNaN(answer);
  let isCorrect = false;
  
  if (isNumberAnswer) {
    // Answer is a number (1-5)
    if (answer < 1 || answer > 5) return false;
    
    const selectedCountry = gameData.options[answer - 1];
    isCorrect = selectedCountry.name === gameData.correctAnswer;
    
  } else {
    // Answer is text (country name)
    const userAnswer = content.toLowerCase();
    isCorrect = gameData.options.some(country => 
      country.name.toLowerCase() === userAnswer ||
      country.code.toLowerCase() === userAnswer
    );
    
    if (isCorrect) {
      // Find which number they would have chosen
      const correctOption = gameData.options.find(c => 
        c.name.toLowerCase() === userAnswer || c.code.toLowerCase() === userAnswer
      );
      answer = gameData.options.indexOf(correctOption) + 1;
    }
  }
  
  // Mark user as answered
  gameData.answeredBy.set(message.author.id, {
    answer: content,
    time: Date.now(),
    correct: isCorrect
  });
  
  if (isCorrect) {
    // User answered correctly!
    const answerTime = Date.now() - gameData.startTime;
    const seconds = (answerTime / 1000).toFixed(1);
    
    // Add to winners list
    gameData.winners.push({
      userId: message.author.id,
      time: seconds,
      answer: content
    });
    
    // End game immediately if first winner
    if (gameData.winners.length === 1) {
      // Clear timers
      if (gameData.interval) clearInterval(gameData.interval);
      if (gameData.timeout) clearTimeout(gameData.timeout);
      
      // Send immediate winner announcement
      const winnerEmbed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setAuthor({ name: '✅ CORRECT ANSWER!', iconURL: message.author.displayAvatarURL() })
        .setDescription(`**${message.author.tag}** got it right in **${seconds} seconds!**\n\n**Answer:** ${gameData.correctAnswer} ${gameData.correctCountry.flag}`)
        .addFields(
          { name: '🎯 Position', value: '#1 🥇', inline: true },
          { name: '⏱️ Time', value: `${seconds}s`, inline: true },
          { name: '⭐ XP Earned', value: '2 XP', inline: true }
        )
        .setFooter({ text: 'Game ending in 5 seconds...' })
        .setTimestamp();
      
      const winnerMsg = await message.channel.send({ embeds: [winnerEmbed] });
      
      // Wait 5 seconds then end game
      setTimeout(async () => {
        await endFlagGame(message.channel, false);
        try {
          await winnerMsg.delete();
        } catch (err) {}
      }, 5000);
      
      return true;
    } else {
      // Not first winner, just notify
      const position = gameData.winners.length;
      const reply = await message.reply(`✅ Correct! You're #${position} with ${(answerTime / 1000).toFixed(1)}s`).catch(() => null);
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
      return true;
    }
  } else {
    // Wrong answer
    if (Math.random() < 0.5) {
      const reply = await message.reply('❌ Wrong answer! Try again.').catch(() => null);
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
    }
    return true;
  }
}

// ==================== ANIMAL GAME (Public) ====================
async function animalGameCommand(message, args) {
  const difficulty = args[0]?.toLowerCase() || 'easy';
  
  if (!['easy', 'medium', 'hard', 'extreme'].includes(difficulty)) {
    return message.reply({ 
      embeds: [createErrorEmbed('Invalid difficulty! Use: easy, medium, hard, extreme')] 
    });
  }
  
  const channelId = message.channel.id;
  
  if (activeGames.has(channelId)) {
    return message.reply({ 
      embeds: [createErrorEmbed('Another game is already active in this channel!')] 
    });
  }
  
  const animals = ANIMALS[difficulty];
  const correctAnimal = animals[Math.floor(Math.random() * animals.length)];
  const scrambled = scrambleWord(correctAnimal);
  
  const gameData = {
    type: 'animal',
    correctAnswer: correctAnimal,
    scrambled: scrambled,
    difficulty: difficulty,
    channelId: channelId,
    startedBy: message.author.id,
    startTime: Date.now(),
    answeredBy: new Map(),
    winners: [],
    active: true,
    hintsGiven: 0,
    timeLeft: 45
  };
  
  activeGames.set(channelId, gameData);
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ 
      name: `🐾 ANIMAL GUESSING GAME • Started by ${message.author.username}`, 
      iconURL: message.author.displayAvatarURL() 
    })
    .setTitle(`🏁 Difficulty: ${difficulty.toUpperCase()}`)
    .setDescription(`**Unscramble this animal name:**\n\n\`${scrambled}\`\n\n**Type the animal name to answer!**`)
    .addFields(
      { name: '⏱️ Time', value: '**45 seconds**', inline: true },
      { name: '🔤 Letters', value: `**${correctAnimal.length}**`, inline: true },
      { name: '🏆 XP Reward', value: '**2 XP** for first correct', inline: true }
    )
    .setFooter({ text: 'Type the animal name | "hint" for help | "quit" to end game' })
    .setTimestamp();
  
  const gameMessage = await message.channel.send({ embeds: [embed] });
  gameData.messageId = gameMessage.id;
  
  // Game timer
  gameData.interval = setInterval(async () => {
    if (!activeGames.has(channelId)) return;
    
    const currentGame = activeGames.get(channelId);
    if (!currentGame.active) return;
    
    currentGame.timeLeft--;
    
    if (currentGame.timeLeft <= 0) {
      endAnimalGame(message.channel, true);
    }
  }, 1000);
  
  gameData.timeout = setTimeout(() => {
    endAnimalGame(message.channel, true);
  }, 45000);
}

async function endAnimalGame(channel, timeout = false) {
  const channelId = channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'animal') return;
  
  if (gameData.interval) clearInterval(gameData.interval);
  if (gameData.timeout) clearTimeout(gameData.timeout);
  
  gameData.active = false;
  
  const winners = gameData.winners;
  
  let resultDescription = `**Correct answer:** \`${gameData.correctAnswer.toUpperCase()}\`\n\n`;
  
  if (winners.length > 0) {
    const firstWinner = winners[0];
    const firstUser = await channel.client.users.fetch(firstWinner.userId).catch(() => null);
    
    resultDescription += `**🥇 Winner:** ${firstUser ? firstUser.tag : 'Unknown'}\n`;
    resultDescription += `⏱️ **Time:** ${firstWinner.time}s\n`;
    
    // Give XP to winner
    addXP(firstWinner.userId, channel.guild.id, 2, 'animal_game_win');
    
    // Give participation XP to others who tried
    gameData.answeredBy.forEach((data, userId) => {
      if (userId !== firstWinner.userId && data.correct) {
        addXP(userId, channel.guild.id, 0.5, 'animal_game_participation');
      }
    });
    
  } else {
    resultDescription += '**😔 No winners this time!**\n';
  }
  
  const embed = new EmbedBuilder()
    .setColor(winners.length > 0 ? COLORS.success : COLORS.error)
    .setAuthor({ name: '🏁 ANIMAL GAME ENDED', iconURL: channel.client.user.displayAvatarURL() })
    .setTitle(`Difficulty: ${gameData.difficulty.toUpperCase()}`)
    .setDescription(resultDescription)
    .addFields(
      { name: '📊 Players', value: `${gameData.answeredBy.size}`, inline: true },
      { name: '🎯 Correct', value: `${gameData.winners.length}`, inline: true },
      { name: '💡 Hints Used', value: `${gameData.hintsGiven}`, inline: true }
    )
    .setFooter({ text: timeout ? 'Game ended due to timeout' : 'Game ended' })
    .setTimestamp();
  
  await channel.send({ embeds: [embed] });
  
  activeGames.delete(channelId);
}

// ==================== HANGMAN GAME (Public) ====================
async function hangmanCommand(message, args) {
  const category = args[0]?.toLowerCase() || 'animals';
  
  if (!HANGMAN_WORDS[category]) {
    return message.reply({ 
      embeds: [createErrorEmbed(`Invalid category! Available: ${Object.keys(HANGMAN_WORDS).join(', ')}`)] 
    });
  }
  
  const channelId = message.channel.id;
  
  if (activeGames.has(channelId)) {
    return message.reply({ 
      embeds: [createErrorEmbed('Another game is already active in this channel!')] 
    });
  }
  
  const word = HANGMAN_WORDS[category][Math.floor(Math.random() * HANGMAN_WORDS[category].length)];
  const wordLength = word.length;
  
  const gameData = {
    type: 'hangman',
    word: word.toLowerCase(),
    category: category,
    guessed: [],
    wrong: 0,
    maxWrong: 6,
    channelId: channelId,
    startedBy: message.author.id,
    startTime: Date.now(),
    players: new Map(),
    active: true,
    timeLeft: 120
  };
  
  activeGames.set(channelId, gameData);
  
  const displayWord = word.split('').map(letter => gameData.guessed.includes(letter) ? letter : '_').join(' ');
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ 
      name: `🎯 HANGMAN • Started by ${message.author.username}`, 
      iconURL: message.author.displayAvatarURL() 
    })
    .setTitle(`Category: ${category.toUpperCase()}`)
    .setDescription(`**Guess the word:**\n\n\`${displayWord}\`\n\n**Wrong guesses:** ${gameData.wrong}/${gameData.maxWrong}`)
    .addFields(
      { name: '⏱️ Time', value: '**2 minutes**', inline: true },
      { name: '🔤 Length', value: `**${wordLength} letters**`, inline: true },
      { name: '🏆 XP Reward', value: '**3 XP** for winner', inline: true }
    )
    .setFooter({ text: 'Type a letter to guess | "quit" to end game' })
    .setTimestamp();
  
  const gameMessage = await message.channel.send({ embeds: [embed] });
  gameData.messageId = gameMessage.id;
  
  // Update game state periodically
  gameData.interval = setInterval(async () => {
    if (!activeGames.has(channelId)) return;
    
    const currentGame = activeGames.get(channelId);
    if (!currentGame.active) return;
    
    currentGame.timeLeft--;
    
    if (currentGame.timeLeft <= 0) {
      endHangmanGame(message.channel, true);
    }
  }, 1000);
  
  gameData.timeout = setTimeout(() => {
    endHangmanGame(message.channel, true);
  }, 120000);
}

async function endHangmanGame(channel, timeout = false) {
  const channelId = channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'hangman') return;
  
  if (gameData.interval) clearInterval(gameData.interval);
  if (gameData.timeout) clearTimeout(gameData.timeout);
  
  gameData.active = false;
  
  const word = gameData.word;
  const displayWord = word.split('').map(letter => gameData.guessed.includes(letter) ? letter : '_').join(' ');
  const isSolved = !displayWord.includes('_');
  
  let resultDescription = `**The word was:** \`${word.toUpperCase()}\`\n\n`;
  
  if (isSolved) {
    // Find who guessed the last letter
    let winnerId = null;
    let winnerLetter = '';
    
    gameData.players.forEach((guesses, userId) => {
      guesses.forEach(guess => {
        if (guess.letter === word[word.length - 1] || guess.letter === word[0]) {
          winnerId = userId;
          winnerLetter = guess.letter;
        }
      });
    });
    
    if (winnerId) {
      const winner = await channel.client.users.fetch(winnerId).catch(() => null);
      resultDescription += `**🎉 Solved by:** ${winner ? winner.tag : 'Unknown'}\n`;
      resultDescription += `**🔤 Final letter:** ${winnerLetter.toUpperCase()}\n`;
      
      // Give XP to winner
      addXP(winnerId, channel.guild.id, 3, 'hangman_win');
    }
    
  } else {
    resultDescription += `**💀 Game Over!**\n`;
    resultDescription += `**Word progress:** \`${displayWord}\`\n`;
  }
  
  const embed = new EmbedBuilder()
    .setColor(isSolved ? COLORS.success : COLORS.error)
    .setAuthor({ name: '🏁 HANGMAN ENDED', iconURL: channel.client.user.displayAvatarURL() })
    .setTitle(`Category: ${gameData.category.toUpperCase()}`)
    .setDescription(resultDescription)
    .addFields(
      { name: '📊 Players', value: `${gameData.players.size}`, inline: true },
      { name: '🎯 Wrong Guesses', value: `${gameData.wrong}/${gameData.maxWrong}`, inline: true },
      { name: '🔤 Letters Guessed', value: `${gameData.guessed.length}`, inline: true }
    )
    .setFooter({ text: timeout ? 'Game ended due to timeout' : 'Game ended' })
    .setTimestamp();
  
  await channel.send({ embeds: [embed] });
  
  activeGames.delete(channelId);
}

// ==================== TRIVIA GAME (Public) ====================
async function triviaGameCommand(message, args) {
  const category = args[0]?.toLowerCase() || 'general';
  
  if (!TRIVIA_QUESTIONS[category]) {
    return message.reply({ 
      embeds: [createErrorEmbed(`Invalid category! Available: ${Object.keys(TRIVIA_QUESTIONS).join(', ')}`)] 
    });
  }
  
  const channelId = message.channel.id;
  
  if (activeGames.has(channelId)) {
    return message.reply({ 
      embeds: [createErrorEmbed('Another game is already active in this channel!')] 
    });
  }
  
  const questions = TRIVIA_QUESTIONS[category];
  const selectedQuestions = [];
  
  // Select 5 random questions
  while (selectedQuestions.length < 5 && selectedQuestions.length < questions.length) {
    const randomQ = questions[Math.floor(Math.random() * questions.length)];
    if (!selectedQuestions.some(q => q.question === randomQ.question)) {
      selectedQuestions.push(randomQ);
    }
  }
  
  const gameData = {
    type: 'trivia',
    questions: selectedQuestions,
    currentQuestion: 0,
    category: category,
    channelId: channelId,
    startedBy: message.author.id,
    startTime: Date.now(),
    players: new Map(),
    scores: new Map(),
    active: true,
    currentQuestionStart: Date.now(),
    questionTimeLeft: 20
  };
  
  activeGames.set(channelId, gameData);
  
  // Start first question
  await askTriviaQuestion(channel);
}

async function askTriviaQuestion(channel) {
  const channelId = channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'trivia') return;
  
  if (gameData.currentQuestion >= gameData.questions.length) {
    endTriviaGame(channel);
    return;
  }
  
  const question = gameData.questions[gameData.currentQuestion];
  gameData.currentQuestionStart = Date.now();
  gameData.questionTimeLeft = 20;
  
  const optionsText = question.options.map((opt, idx) => {
    const letter = String.fromCharCode(65 + idx);
    return `${letter}) ${opt}`;
  }).join('\n');
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ 
      name: `🧠 TRIVIA • Question ${gameData.currentQuestion + 1}/${gameData.questions.length}`, 
      iconURL: channel.client.user.displayAvatarURL() 
    })
    .setTitle(`Category: ${question.category}`)
    .setDescription(`**${question.question}**\n\n${optionsText}`)
    .addFields(
      { name: '⏱️ Time', value: '**20 seconds**', inline: true },
      { name: '🏆 Points', value: '**2 XP** per correct answer', inline: true },
      { name: '📊 Scores', value: getTriviaScores(gameData), inline: false }
    )
    .setFooter({ text: 'Reply with A, B, C, or D' })
    .setTimestamp();
  
  const questionMsg = await channel.send({ embeds: [embed] });
  gameData.currentMessageId = questionMsg.id;
  
  // Question timer
  gameData.questionInterval = setInterval(async () => {
    if (!activeGames.has(channelId)) return;
    
    const currentGame = activeGames.get(channelId);
    if (!currentGame.active) return;
    
    currentGame.questionTimeLeft--;
    
    if (currentGame.questionTimeLeft <= 0) {
      clearInterval(currentGame.questionInterval);
      revealTriviaAnswer(channel);
    }
  }, 1000);
  
  gameData.questionTimeout = setTimeout(() => {
    revealTriviaAnswer(channel);
  }, 20000);
}

async function revealTriviaAnswer(channel) {
  const channelId = channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'trivia') return;
  
  if (gameData.questionInterval) clearInterval(gameData.questionInterval);
  if (gameData.questionTimeout) clearTimeout(gameData.questionTimeout);
  
  const question = gameData.questions[gameData.currentQuestion];
  const correctLetter = String.fromCharCode(65 + question.options.indexOf(question.options.find(opt => opt.toLowerCase() === question.answer)));
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setAuthor({ name: '📝 ANSWER REVEALED', iconURL: channel.client.user.displayAvatarURL() })
    .setDescription(`**${question.question}**\n\n**Correct answer:** ${correctLetter}) ${question.answer.toUpperCase()}`)
    .addFields(
      { name: '📊 Scores', value: getTriviaScores(gameData), inline: false }
    )
    .setFooter({ text: 'Next question in 5 seconds...' })
    .setTimestamp();
  
  await channel.send({ embeds: [embed] });
  
  // Move to next question after delay
  gameData.currentQuestion++;
  
  if (gameData.currentQuestion < gameData.questions.length) {
    setTimeout(() => {
      askTriviaQuestion(channel);
    }, 5000);
  } else {
    setTimeout(() => {
      endTriviaGame(channel);
    }, 5000);
  }
}

function getTriviaScores(gameData) {
  let scoresText = '';
  const sortedScores = Array.from(gameData.scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  if (sortedScores.length === 0) {
    return 'No scores yet';
  }
  
  sortedScores.forEach(([userId, score], index) => {
    scoresText += `${index + 1}. <@${userId}>: ${score} points\n`;
  });
  
  return scoresText;
}

async function endTriviaGame(channel) {
  const channelId = channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'trivia') return;
  
  gameData.active = false;
  
  // Calculate final scores and give XP
  const sortedScores = Array.from(gameData.scores.entries())
    .sort((a, b) => b[1] - a[1]);
  
  let resultDescription = '**🏆 FINAL RESULTS 🏆**\n\n';
  
  for (let i = 0; i < Math.min(3, sortedScores.length); i++) {
    const [userId, score] = sortedScores[i];
    const user = await channel.client.users.fetch(userId).catch(() => null);
    const xpEarned = (3 - i) * 2; // 1st: 6 XP, 2nd: 4 XP, 3rd: 2 XP
    
    if (user) {
      resultDescription += `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} **${user.tag}**\n`;
      resultDescription += `   Points: ${score} | XP: +${xpEarned}\n\n`;
      
      addXP(userId, channel.guild.id, xpEarned, 'trivia_win');
    }
  }
  
  if (sortedScores.length === 0) {
    resultDescription = '**😔 No one participated!**';
  }
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({ name: '🏁 TRIVIA GAME ENDED', iconURL: channel.client.user.displayAvatarURL() })
    .setTitle(`Category: ${gameData.category.toUpperCase()}`)
    .setDescription(resultDescription)
    .addFields(
      { name: '📊 Total Players', value: `${gameData.players.size}`, inline: true },
      { name: '❓ Questions', value: `${gameData.questions.length}`, inline: true },
      { name: '⏱️ Duration', value: `${Math.round((Date.now() - gameData.startTime) / 1000)}s`, inline: true }
    )
    .setFooter({ text: 'Thanks for playing!' })
    .setTimestamp();
  
  await channel.send({ embeds: [embed] });
  
  activeGames.delete(channelId);
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
        { name: '🏆 XP Rewards', value: 'Win: 1 XP\nDraw: 0.5 XP\nLose: 0.2 XP', inline: false }
      )
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
  
  const botChoice = choices[Math.floor(Math.random() * 3)];
  const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
  
  let result, xpEarned;
  
  if (choice === botChoice) {
    result = '**🤝 DRAW!**';
    xpEarned = 0.5;
  } else if (
    (choice === 'rock' && botChoice === 'scissors') ||
    (choice === 'paper' && botChoice === 'rock') ||
    (choice === 'scissors' && botChoice === 'paper')
  ) {
    result = '**🎉 YOU WIN!**';
    xpEarned = 1;
  } else {
    result = '**😢 YOU LOSE!**';
    xpEarned = 0.2;
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

async function numberGameCommand(message, args) {
  const max = parseInt(args[0]) || 100;
  
  if (max < 10 || max > 1000) {
    return message.reply({ 
      embeds: [createErrorEmbed('Max number must be between 10 and 1000! Example: `=number 100`')] 
    });
  }
  
  const channelId = message.channel.id;
  
  if (activeGames.has(channelId)) {
    return message.reply({ embeds: [createErrorEmbed('Another game is already active in this channel!')] });
  }
  
  const number = Math.floor(Math.random() * max) + 1;
  
  const gameData = {
    type: 'number',
    number: number,
    max: max,
    attempts: new Map(),
    channelId: channelId,
    startedBy: message.author.id,
    startTime: Date.now(),
    active: true,
    timeLeft: 60,
    hintGiven: false
  };
  
  activeGames.set(channelId, gameData);
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ 
      name: `🔢 NUMBER GUESSING • Started by ${message.author.username}`, 
      iconURL: message.author.displayAvatarURL() 
    })
    .setDescription(`**Guess the number between 1 and ${max}!**\n\nEveryone can guess!\nI'll tell you if you're too high or too low.`)
    .addFields(
      { name: '⏱️ Time', value: '**60 seconds**', inline: true },
      { name: '🏆 XP Reward', value: '**3 XP** for winner', inline: true },
      { name: '🎯 Attempts', value: '**Unlimited**', inline: true }
    )
    .setFooter({ text: 'Type your guess | "quit" to end game' })
    .setTimestamp();
  
  const gameMessage = await message.channel.send({ embeds: [embed] });
  gameData.messageId = gameMessage.id;
  
  // Game timer
  gameData.interval = setInterval(async () => {
    if (!activeGames.has(channelId)) return;
    
    const currentGame = activeGames.get(channelId);
    if (!currentGame.active) return;
    
    currentGame.timeLeft--;
    
    // Give hint at 30 seconds
    if (currentGame.timeLeft === 30 && !currentGame.hintGiven) {
      currentGame.hintGiven = true;
      const range = Math.floor(currentGame.max / 4);
      const hint = `💡 **Hint:** The number is between **${Math.max(1, currentGame.number - range)}** and **${Math.min(currentGame.max, currentGame.number + range)}**`;
      message.channel.send(hint).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      });
    }
    
    if (currentGame.timeLeft <= 0) {
      endNumberGame(message.channel, true);
    }
  }, 1000);
  
  gameData.timeout = setTimeout(() => {
    endNumberGame(message.channel, true);
  }, 60000);
}

async function endNumberGame(channel, timeout = false) {
  const channelId = channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'number') return;
  
  if (gameData.interval) clearInterval(gameData.interval);
  if (gameData.timeout) clearTimeout(gameData.timeout);
  
  gameData.active = false;
  
  let winnerId = null;
  let minDifference = Infinity;
  let winnerAttempts = 0;
  
  // Find closest guess
  gameData.attempts.forEach((attempts, userId) => {
    attempts.forEach(attempt => {
      const difference = Math.abs(attempt.guess - gameData.number);
      if (difference < minDifference || 
          (difference === minDifference && attempt.time < winnerAttempts)) {
        minDifference = difference;
        winnerId = userId;
        winnerAttempts = attempt.time;
      }
    });
  });
  
  let resultDescription = `**The number was:** \`${gameData.number}\`\n\n`;
  
  if (winnerId) {
    const winner = await channel.client.users.fetch(winnerId).catch(() => null);
    const attempts = gameData.attempts.get(winnerId);
    const closestGuess = attempts.reduce((closest, attempt) => {
      return Math.abs(attempt.guess - gameData.number) < Math.abs(closest - gameData.number) ? attempt.guess : closest;
    }, attempts[0].guess);
    
    resultDescription += `**🎉 Closest guess:** ${winner ? winner.tag : 'Unknown'}\n`;
    resultDescription += `**🎯 Guess:** ${closestGuess} (off by ${minDifference})\n`;
    resultDescription += `**⏱️ Time:** ${((winnerAttempts - gameData.startTime) / 1000).toFixed(1)}s\n`;
    
    // Give XP based on how close they were
    let xpEarned = 3;
    if (minDifference === 0) xpEarned = 5; // Exact guess
    else if (minDifference <= 5) xpEarned = 4;
    else if (minDifference <= 10) xpEarned = 3;
    else if (minDifference <= 20) xpEarned = 2;
    else xpEarned = 1;
    
    addXP(winnerId, channel.guild.id, xpEarned, 'number_game_win');
    
    resultDescription += `**⭐ XP Earned:** ${xpEarned} XP\n`;
    
  } else {
    resultDescription += '**😔 No one guessed!**\n';
  }
  
  const embed = new EmbedBuilder()
    .setColor(winnerId ? COLORS.success : COLORS.error)
    .setAuthor({ name: '🏁 NUMBER GAME ENDED', iconURL: channel.client.user.displayAvatarURL() })
    .setTitle(`Range: 1-${gameData.max}`)
    .setDescription(resultDescription)
    .addFields(
      { name: '📊 Total Guesses', value: `${Array.from(gameData.attempts.values()).reduce((sum, attempts) => sum + attempts.length, 0)}`, inline: true },
      { name: '👥 Players', value: `${gameData.attempts.size}`, inline: true },
      { name: '⏱️ Duration', value: `${Math.round((Date.now() - gameData.startTime) / 1000)}s`, inline: true }
    )
    .setFooter({ text: timeout ? 'Game ended due to timeout' : 'Game ended' })
    .setTimestamp();
  
  await channel.send({ embeds: [embed] });
  
  activeGames.delete(channelId);
}

// ==================== WORD CHAIN GAME ====================
async function wordchainCommand(message, args) {
  const channelId = message.channel.id;
  
  if (activeGames.has(channelId)) {
    return message.reply({ 
      embeds: [createErrorEmbed('Another game is already active in this channel!')] 
    });
  }
  
  // Common English words
  const startingWords = ['apple', 'earth', 'house', 'water', 'light', 'music', 'paper', 'stone', 'table', 'chair'];
  const startWord = startingWords[Math.floor(Math.random() * startingWords.length)];
  const lastLetter = startWord[startWord.length - 1];
  
  const gameData = {
    type: 'wordchain',
    currentWord: startWord,
    lastLetter: lastLetter,
    usedWords: new Set([startWord]),
    players: new Map(),
    channelId: channelId,
    startedBy: message.author.id,
    startTime: Date.now(),
    active: true,
    timeLeft: 300, // 5 minutes
    currentPlayer: message.author.id,
    streak: 0,
    maxStreak: 0
  };
  
  activeGames.set(channelId, gameData);
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.game)
    .setAuthor({ 
      name: `🔤 WORD CHAIN • Started by ${message.author.username}`, 
      iconURL: message.author.displayAvatarURL() 
    })
    .setDescription(`**Word Chain Game Started!**\n\n**Current word:** \`${startWord.toUpperCase()}\`\n**Next word must start with:** \`${lastLetter.toUpperCase()}\``)
    .addFields(
      { name: '📝 Rules', value: '1. Say a word starting with last letter of previous word\n2. No repeating words\n3. Minimum 3 letters\n4. English words only', inline: false },
      { name: '⏱️ Time', value: '**5 minutes**', inline: true },
      { name: '🏆 XP Reward', value: '**0.1 XP per valid word**', inline: true },
      { name: '🔥 Current Streak', value: '**0**', inline: true }
    )
    .setFooter({ text: 'Type a word starting with ' + lastLetter.toUpperCase() })
    .setTimestamp();
  
  const gameMessage = await message.channel.send({ embeds: [embed] });
  gameData.messageId = gameMessage.id;
  
  // Game timer
  gameData.interval = setInterval(async () => {
    if (!activeGames.has(channelId)) return;
    
    const currentGame = activeGames.get(channelId);
    if (!currentGame.active) return;
    
    currentGame.timeLeft--;
    
    if (currentGame.timeLeft <= 0) {
      endWordChainGame(message.channel, true);
    }
  }, 1000);
  
  gameData.timeout = setTimeout(() => {
    endWordChainGame(message.channel, true);
  }, 300000);
}

async function endWordChainGame(channel, timeout = false) {
  const channelId = channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'wordchain') return;
  
  if (gameData.interval) clearInterval(gameData.interval);
  if (gameData.timeout) clearTimeout(gameData.timeout);
  
  gameData.active = false;
  
  // Calculate scores
  const playerScores = Array.from(gameData.players.entries())
    .sort((a, b) => b[1].words - a[1].words);
  
  let resultDescription = `**🏁 FINAL WORD: **\`${gameData.currentWord.toUpperCase()}\`\n\n`;
  resultDescription += `**📊 STATISTICS**\n`;
  resultDescription += `• Total Words: ${gameData.usedWords.size}\n`;
  resultDescription += `• Unique Players: ${gameData.players.size}\n`;
  resultDescription += `• Longest Streak: ${gameData.maxStreak}\n\n`;
  
  resultDescription += `**🏆 LEADERBOARD**\n`;
  
  // Give XP and create leaderboard
  for (let i = 0; i < Math.min(5, playerScores.length); i++) {
    const [userId, stats] = playerScores[i];
    const user = await channel.client.users.fetch(userId).catch(() => null);
    
    if (user) {
      const xpEarned = stats.words * 0.1; // 0.1 XP per word
      addXP(userId, channel.guild.id, xpEarned, 'wordchain');
      
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔸';
      resultDescription += `${medal} **${user.tag}**\n`;
      resultDescription += `   Words: ${stats.words} | XP: +${xpEarned.toFixed(1)}\n`;
    }
  }
  
  if (playerScores.length === 0) {
    resultDescription = '**😔 No one participated!**';
  }
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({ name: '🏁 WORD CHAIN ENDED', iconURL: channel.client.user.displayAvatarURL() })
    .setDescription(resultDescription)
    .addFields(
      { name: '⏱️ Duration', value: `${Math.round((Date.now() - gameData.startTime) / 1000)}s`, inline: true },
      { name: '🔤 Words Used', value: `${gameData.usedWords.size}`, inline: true },
      { name: '👥 Players', value: `${gameData.players.size}`, inline: true }
    )
    .setFooter({ text: timeout ? 'Game ended due to timeout' : 'Game ended' })
    .setTimestamp();
  
  await channel.send({ embeds: [embed] });
  
  activeGames.delete(channelId);
}

// ==================== GAME RESPONSE HANDLER ====================
async function handleGameResponse(message) {
  const channelId = message.channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || !gameData.active) return;
  
  const content = message.content.trim().toLowerCase();
  
  // Quit command for game starters
  if (content === 'quit' || content === 'end' || content === 'stop') {
    if (message.author.id === gameData.startedBy || isMod(message.member)) {
      switch (gameData.type) {
        case 'flag': await endFlagGame(message.channel, false); break;
        case 'animal': await endAnimalGame(message.channel, false); break;
        case 'hangman': await endHangmanGame(message.channel, false); break;
        case 'trivia': await endTriviaGame(message.channel); break;
        case 'number': await endNumberGame(message.channel, false); break;
        case 'wordchain': await endWordChainGame(message.channel, false); break;
      }
      return;
    }
  }
  
  // Handle different game types
  switch (gameData.type) {
    case 'flag':
      await handleFlagGameAnswer(message);
      break;
      
    case 'animal':
      await handleAnimalGameAnswer(message);
      break;
      
    case 'hangman':
      await handleHangmanAnswer(message);
      break;
      
    case 'trivia':
      await handleTriviaAnswer(message);
      break;
      
    case 'number':
      await handleNumberGameAnswer(message);
      break;
      
    case 'wordchain':
      await handleWordChainAnswer(message);
      break;
  }
}

// Animal game answer handler
async function handleAnimalGameAnswer(message) {
  const channelId = message.channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'animal') return;
  
  const content = message.content.trim().toLowerCase();
  
  // Check for hint request
  if (content === 'hint') {
    if (gameData.hintsGiven >= 3) {
      const reply = await message.reply('No more hints available!').catch(() => null);
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
      return;
    }
    
    gameData.hintsGiven++;
    const hintLength = Math.min(gameData.hintsGiven + 2, gameData.correctAnswer.length);
    const hint = gameData.correctAnswer.substring(0, hintLength);
    
    const hintMsg = await message.reply(`💡 Hint (${gameData.hintsGiven}/3): \`${hint.toUpperCase()}${'_'.repeat(gameData.correctAnswer.length - hintLength)}\``);
    setTimeout(() => hintMsg.delete().catch(() => {}), 5000);
    return;
  }
  
  // Check if already answered
  if (gameData.answeredBy.has(message.author.id)) {
    const reply = await message.reply('You already answered!').catch(() => null);
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
    return;
  }
  
  // Check answer
  const isCorrect = content === gameData.correctAnswer.toLowerCase();
  gameData.answeredBy.set(message.author.id, {
    answer: content,
    time: Date.now(),
    correct: isCorrect
  });
  
  if (isCorrect) {
    const answerTime = Date.now() - gameData.startTime;
    const seconds = (answerTime / 1000).toFixed(1);
    
    gameData.winners.push({
      userId: message.author.id,
      time: seconds,
      answer: content
    });
    
    // End game if first winner
    if (gameData.winners.length === 1) {
      if (gameData.interval) clearInterval(gameData.interval);
      if (gameData.timeout) clearTimeout(gameData.timeout);
      
      const winnerMsg = await message.channel.send(`🎉 **${message.author.tag}** solved it in **${seconds}s**! Game ending in 5 seconds...`);
      setTimeout(async () => {
        await endAnimalGame(message.channel, false);
        try {
          await winnerMsg.delete();
        } catch (err) {}
      }, 5000);
    } else {
      const position = gameData.winners.length;
      const reply = await message.reply(`✅ Correct! You're #${position}`).catch(() => null);
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
    }
  } else {
    const reply = await message.reply('❌ Wrong animal!').catch(() => null);
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
  }
}

// Hangman answer handler
async function handleHangmanAnswer(message) {
  const channelId = message.channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'hangman') return;
  
  const content = message.content.trim().toLowerCase();
  
  // Single letter guess
  if (content.length === 1 && /[a-z]/.test(content)) {
    const letter = content;
    
    // Check if already guessed
    if (gameData.guessed.includes(letter)) {
      const reply = await message.reply(`Letter **${letter.toUpperCase()}** was already guessed!`).catch(() => null);
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
      return;
    }
    
    // Add to guessed letters
    gameData.guessed.push(letter);
    
    // Track player's guess
    if (!gameData.players.has(message.author.id)) {
      gameData.players.set(message.author.id, []);
    }
    gameData.players.get(message.author.id).push({
      letter: letter,
      time: Date.now()
    });
    
    // Check if letter is in word
    if (gameData.word.includes(letter)) {
      // Correct guess
      const displayWord = gameData.word.split('').map(l => gameData.guessed.includes(l) ? l : '_').join(' ');
      
      // Check if word is complete
      if (!displayWord.includes('_')) {
        // Word solved!
        if (gameData.interval) clearInterval(gameData.interval);
        if (gameData.timeout) clearTimeout(gameData.timeout);
        
        const solvedMsg = await message.channel.send(`🎉 **${message.author.tag}** completed the word: **${gameData.word.toUpperCase()}**!`);
        setTimeout(async () => {
          await endHangmanGame(message.channel, false);
          try {
            await solvedMsg.delete();
          } catch (err) {}
        }, 3000);
      } else {
        // Update game message
        const embed = EmbedBuilder.from((await message.channel.messages.fetch(gameData.messageId)).embeds[0].data)
          .setDescription(`**Guess the word:**\n\n\`${displayWord}\`\n\n**Wrong guesses:** ${gameData.wrong}/${gameData.maxWrong}\n**Guessed:** ${gameData.guessed.join(', ').toUpperCase()}`);
        
        try {
          await message.channel.messages.edit(gameData.messageId, { embeds: [embed] });
        } catch (err) {}
        
        const reply = await message.reply(`✅ Letter **${letter.toUpperCase()}** is correct!`).catch(() => null);
        if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
      }
    } else {
      // Wrong guess
      gameData.wrong++;
      
      if (gameData.wrong >= gameData.maxWrong) {
        // Game over
        if (gameData.interval) clearInterval(gameData.interval);
        if (gameData.timeout) clearTimeout(gameData.timeout);
        
        const gameOverMsg = await message.channel.send(`💀 **Game Over!** The word was: **${gameData.word.toUpperCase()}**`);
        setTimeout(async () => {
          await endHangmanGame(message.channel, false);
          try {
            await gameOverMsg.delete();
          } catch (err) {}
        }, 3000);
      } else {
        // Update game message
        const displayWord = gameData.word.split('').map(l => gameData.guessed.includes(l) ? l : '_').join(' ');
        const embed = EmbedBuilder.from((await message.channel.messages.fetch(gameData.messageId)).embeds[0].data)
          .setDescription(`**Guess the word:**\n\n\`${displayWord}\`\n\n**Wrong guesses:** ${gameData.wrong}/${gameData.maxWrong}\n**Guessed:** ${gameData.guessed.join(', ').toUpperCase()}`);
        
        try {
          await message.channel.messages.edit(gameData.messageId, { embeds: [embed] });
        } catch (err) {}
        
        const reply = await message.reply(`❌ Letter **${letter.toUpperCase()}** is wrong! (${gameData.wrong}/${gameData.maxWrong})`).catch(() => null);
        if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
      }
    }
  }
}

// Trivia answer handler
async function handleTriviaAnswer(message) {
  const channelId = message.channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'trivia') return;
  
  const content = message.content.trim().toUpperCase();
  
  // Check if valid answer (A, B, C, D)
  if (!['A', 'B', 'C', 'D'].includes(content)) return;
  
  // Check if already answered this question
  if (!gameData.players.has(message.author.id)) {
    gameData.players.set(message.author.id, []);
  }
  
  const playerAnswers = gameData.players.get(message.author.id);
  const alreadyAnswered = playerAnswers.some(answer => 
    answer.questionIndex === gameData.currentQuestion
  );
  
  if (alreadyAnswered) {
    const reply = await message.reply('You already answered this question!').catch(() => null);
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
    return;
  }
  
  // Get current question
  const question = gameData.questions[gameData.currentQuestion];
  const answerIndex = content.charCodeAt(0) - 65; // A=0, B=1, etc.
  const isCorrect = question.options[answerIndex].toLowerCase() === question.answer;
  
  // Record answer
  playerAnswers.push({
    questionIndex: gameData.currentQuestion,
    answer: content,
    correct: isCorrect,
    time: Date.now() - gameData.currentQuestionStart
  });
  
  // Update score
  if (!gameData.scores.has(message.author.id)) {
    gameData.scores.set(message.author.id, 0);
  }
  
  if (isCorrect) {
    const currentScore = gameData.scores.get(message.author.id);
    const pointsEarned = 2;
    gameData.scores.set(message.author.id, currentScore + pointsEarned);
    
    const reply = await message.reply(`✅ Correct! +${pointsEarned} points`).catch(() => null);
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
  } else {
    const reply = await message.reply('❌ Wrong answer!').catch(() => null);
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
  }
}

// Number game answer handler
async function handleNumberGameAnswer(message) {
  const channelId = message.channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'number') return;
  
  const guess = parseInt(message.content.trim());
  
  if (isNaN(guess) || guess < 1 || guess > gameData.max) {
    const reply = await message.reply(`Please guess a number between 1 and ${gameData.max}`).catch(() => null);
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
    return;
  }
  
  // Track attempt
  if (!gameData.attempts.has(message.author.id)) {
    gameData.attempts.set(message.author.id, []);
  }
  
  gameData.attempts.get(message.author.id).push({
    guess: guess,
    time: Date.now()
  });
  
  // Give feedback
  if (guess === gameData.number) {
    // Exact guess - end game immediately
    if (gameData.interval) clearInterval(gameData.interval);
    if (gameData.timeout) clearTimeout(gameData.timeout);
    
    const winnerMsg = await message.channel.send(`🎉 **${message.author.tag}** guessed the exact number **${gameData.number}**!`);
    setTimeout(async () => {
      await endNumberGame(message.channel, false);
      try {
        await winnerMsg.delete();
      } catch (err) {}
    }, 3000);
  } else {
    // Give hint
    const difference = Math.abs(guess - gameData.number);
    let hint = '';
    
    if (difference <= 5) hint = '🔥 Very hot!';
    else if (difference <= 10) hint = '🔥 Hot!';
    else if (difference <= 20) hint = '💨 Warm';
    else if (difference <= 50) hint = '❄️ Cold';
    else hint = '🧊 Very cold!';
    
    const direction = guess < gameData.number ? 'higher' : 'lower';
    const reply = await message.reply(`${hint} (Try ${direction})`).catch(() => null);
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
  }
}

// Word chain answer handler
async function handleWordChainAnswer(message) {
  const channelId = message.channel.id;
  const gameData = activeGames.get(channelId);
  
  if (!gameData || gameData.type !== 'wordchain') return;
  
  const word = message.content.trim().toLowerCase();
  
  // Basic validation
  if (word.length < 3) {
    const reply = await message.reply('Word must be at least 3 letters!').catch(() => null);
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
    return;
  }
  
  // Check if word starts with correct letter
  if (word[0] !== gameData.lastLetter) {
    const reply = await message.reply(`Word must start with **${gameData.lastLetter.toUpperCase()}**!`).catch(() => null);
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
    return;
  }
  
  // Check if word was already used
  if (gameData.usedWords.has(word)) {
    const reply = await message.reply(`Word **${word.toUpperCase()}** was already used!`).catch(() => null);
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 3000);
    return;
  }
  
  // Add word to used words
  gameData.usedWords.add(word);
  gameData.currentWord = word;
  gameData.lastLetter = word[word.length - 1];
  
  // Update player stats
  if (!gameData.players.has(message.author.id)) {
    gameData.players.set(message.author.id, {
      words: 0,
      lastWord: null,
      streak: 0
    });
  }
  
  const playerStats = gameData.players.get(message.author.id);
  playerStats.words++;
  playerStats.lastWord = word;
  
  // Check streak
  if (gameData.currentPlayer === message.author.id) {
    playerStats.streak++;
    gameData.streak++;
  } else {
    gameData.currentPlayer = message.author.id;
    gameData.streak = 1;
    playerStats.streak = 1;
  }
  
  // Update max streak
  if (gameData.streak > gameData.maxStreak) {
    gameData.maxStreak = gameData.streak;
  }
  
  // Update game message
  const embed = EmbedBuilder.from((await message.channel.messages.fetch(gameData.messageId)).embeds[0].data)
    .setDescription(`**Current word:** \`${word.toUpperCase()}\`\n**Next word must start with:** \`${gameData.lastLetter.toUpperCase()}\``)
    .setFields(
      { name: '📝 Rules', value: '1. Say a word starting with last letter of previous word\n2. No repeating words\n3. Minimum 3 letters\n4. English words only', inline: false },
      { name: '⏱️ Time Left', value: `${Math.floor(gameData.timeLeft / 60)}:${(gameData.timeLeft % 60).toString().padStart(2, '0')}`, inline: true },
      { name: '🏆 XP Reward', value: '**0.1 XP per valid word**', inline: true },
      { name: '🔥 Current Streak', value: `**${gameData.streak}** by ${message.author.username}`, inline: true }
    )
    .setFooter({ text: 'Type a word starting with ' + gameData.lastLetter.toUpperCase() });
  
  try {
    await message.channel.messages.edit(gameData.messageId, { embeds: [embed] });
  } catch (err) {}
  
  // Give immediate feedback
  const reply = await message.reply(`✅ **${word.toUpperCase()}** accepted! Next letter: **${gameData.lastLetter.toUpperCase()}**`).catch(() => null);
  if (reply) setTimeout(() => reply.delete().catch(() => {}), 5000);
}
// ==================== HELP COMMAND SYSTEM ====================
// ==================== HELP COMMAND SYSTEM (FIXED) ====================
async function helpCommand(message) {
  try {
    const prefix = '='; // Hardcode since you said it's =
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⚡ WORLD OF GAMERS BOT - HELP')
      .setDescription(`**Prefix:** \`${prefix}\``)
      .addFields(
        {
          name: '🎮 GAMES',
          value: 
            `\`${prefix}flag\` - Guess country flags\n` +
            `\`${prefix}animal\` - Animal guessing game\n` +
            `\`${prefix}hangman\` - Hangman game\n` +
            `\`${prefix}trivia\` - Trivia questions\n` +
            `\`${prefix}number\` - Number guessing\n` +
            `\`${prefix}wordchain\` - Word chain game\n` +
            `\`${prefix}rps\` - Rock Paper Scissors`
        },
        {
          name: '📊 XP SYSTEM',
          value: 
            `\`${prefix}rank\` - Check your level\n` +
            `\`${prefix}leaderboard\` - Server rankings\n` +
            `\`${prefix}daily\` - Daily reward`
        },
        {
          name: '👤 UTILITY',
          value: 
            `\`${prefix}ui\` - User info\n` +
            `\`${prefix}avatar\` - Get avatar\n` +
            `\`${prefix}serverinfo\` - Server info\n` +
            `\`${prefix}ping\` - Check latency`
        }
      )
      .setFooter({ 
        text: `Requested by ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL() 
      })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Help command error:', error);
    // Fallback to simple message
    await message.reply(
      `**Basic Commands:**\n` +
      `\`=flag\` - Flag game\n` +
      `\`=animal\` - Animal game\n` +
      `\`=rank\` - Check XP\n` +
      `\`=leaderboard\` - Rankings\n` +
      `\n*Full help menu failed to load*`
    );
  }
}
// ==================== XP COMMANDS ====================
async function rankCommand(message, args) {
  let targetUser = message.author;
  let targetMember = message.member;
  
  if (args.length > 0) {
    const userId = extractId(args[0]);
    if (userId) {
      try {
        targetUser = await client.users.fetch(userId);
        targetMember = await message.guild.members.fetch(userId).catch(() => null);
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
  
  // Progress calculations
  const progressBar = generateProgressBar(levelData.xpInCurrentLevel, levelData.totalXPForLevel, 20);
  const xpForNextLevel = levelData.requiredForNext;
  const xpPercent = levelData.progress;
  
  // Get game stats
  const gameStats = dataStore.data.gameStats?.[targetUser.id] || {};
  const totalGames = Object.values(gameStats).reduce((sum, stat) => sum + (stat.played || 0), 0);
  const gamesWon = Object.values(gameStats).reduce((sum, stat) => sum + (stat.won || 0), 0);
  const winRate = totalGames > 0 ? ((gamesWon / totalGames) * 100).toFixed(1) : 0;
  
  // Calculate activity
  const daysSinceJoin = Math.floor((Date.now() - (xpData.joinDate || Date.now())) / (1000 * 60 * 60 * 24));
  const avgDailyXP = daysSinceJoin > 0 ? (xpData.xp / daysSinceJoin).toFixed(1) : xpData.xp;
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.xp)
    .setAuthor({ 
      name: `📊 RANK CARD - ${targetUser.username}`, 
      iconURL: targetUser.displayAvatarURL({ size: 256 }) 
    })
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .addFields(
      { 
        name: '🏆 RANKING', 
        value: `**#${rank}** / ${sortedUsers.length}\n` +
               `**Level:** ${levelData.level}\n` +
               `**XP:** ${xpData.xp.toFixed(1)}`,
        inline: true 
      },
      { 
        name: '📈 PROGRESS', 
        value: `${progressBar}\n` +
               `**${xpPercent}%** to Level ${levelData.level + 1}\n` +
               `**${xpForNextLevel.toFixed(1)} XP** needed`,
        inline: true 
      },
      { 
        name: '🎮 STATS', 
        value: `**Games:** ${totalGames}\n` +
               `**Wins:** ${gamesWon} (${winRate}%)\n` +
               `**Messages:** ${xpData.messages || 0}`,
        inline: true 
      }
    );
  
  // Add badges if any
  const badges = [];
  if (targetMember) {
    if (isAdmin(targetMember)) badges.push('👑 Admin');
    else if (isMod(targetMember)) badges.push('⚔️ Mod');
    if (targetMember.premiumSince) badges.push('🌟 Booster');
    if (xpData.messages > 1000) badges.push('💬 Chatter');
    if (gamesWon > 50) badges.push('🏆 Pro Gamer');
    if (levelData.level > 50) badges.push('⭐ Veteran');
  }
  
  if (badges.length > 0) {
    embed.addFields({
      name: '🎖️ BADGES',
      value: badges.join(' • '),
      inline: false
    });
  }
  
  // Add activity info
  embed.addFields({
    name: '📅 ACTIVITY',
    value: `**Joined:** <t:${Math.floor((xpData.joinDate || Date.now()) / 1000)}:R>\n` +
           `**Last Active:** <t:${Math.floor((xpData.lastActive || Date.now()) / 1000)}:R>\n` +
           `**Avg Daily XP:** ${avgDailyXP}`,
    inline: false
  });
  
  embed.setFooter({ 
    text: `Extreme Hard XP System • Level ${levelData.level} • Rank #${rank}`, 
    iconURL: message.guild.iconURL() 
  })
  .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function leaderboardCommand(message, args) {
  const page = Math.max(1, parseInt(args[0]) || 1);
  const perPage = 10;
  
  const allXP = dataStore.getAllXP(message.guild.id);
  const sortedUsers = Object.entries(allXP)
    .filter(([userId, data]) => data.xp > 0)
    .sort((a, b) => b[1].xp - a[1].xp);
  
  const totalPages = Math.ceil(sortedUsers.length / perPage);
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const pageUsers = sortedUsers.slice(startIndex, endIndex);
  
  if (pageUsers.length === 0) {
    return message.reply({ 
      embeds: [createErrorEmbed(`No users found on page ${page}!`)] 
    });
  }
  
  let leaderboardText = '';
  
  for (let i = 0; i < pageUsers.length; i++) {
    const [userId, data] = pageUsers[i];
    const globalRank = startIndex + i + 1;
    
    try {
      const user = await client.users.fetch(userId).catch(() => ({ tag: 'Unknown User', displayAvatarURL: () => '' }));
      const levelData = getLevelFromXP(data.xp);
      
      const medals = ['🥇', '🥈', '🥉'];
      const medal = globalRank <= 3 ? medals[globalRank - 1] : `**${globalRank}.**`;
      
      leaderboardText += `${medal} **${user.tag}**\n`;
      leaderboardText += `   ⭐ Level ${levelData.level} • 📊 ${data.xp.toFixed(1)} XP • 🎮 ${data.gamesWon || 0} wins\n`;
      
    } catch (error) {
      continue;
    }
  }
  
  // Get top 3 for display
  let top3Text = '';
  const top3 = sortedUsers.slice(0, 3);
  for (let i = 0; i < top3.length; i++) {
    const [userId, data] = top3[i];
    const user = await client.users.fetch(userId).catch(() => ({ tag: 'Unknown' }));
    const levelData = getLevelFromXP(data.xp);
    top3Text += `${['🥇', '🥈', '🥉'][i]} **${user.tag}** - Level ${levelData.level} (${data.xp.toFixed(1)} XP)\n`;
  }
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.xp)
    .setAuthor({ 
      name: `🏆 XP LEADERBOARD - ${message.guild.name}`, 
      iconURL: message.guild.iconURL() 
    })
    .setDescription(leaderboardText || 'No XP data yet!')
    .addFields(
      { 
        name: '👑 TOP 3 PLAYERS', 
        value: top3Text || 'No top players yet',
        inline: false 
      },
      { 
        name: '📊 STATISTICS', 
        value: `**Total Players:** ${sortedUsers.length}\n` +
               `**Total XP in Server:** ${sortedUsers.reduce((sum, [_, data]) => sum + data.xp, 0).toFixed(1)}\n` +
               `**Average Level:** ${(sortedUsers.reduce((sum, [_, data]) => sum + getLevelFromXP(data.xp).level, 0) / sortedUsers.length).toFixed(1)}`,
        inline: false 
      }
    )
    .setFooter({ 
      text: `Page ${page}/${totalPages} • Extreme Hard XP System • ${sortedUsers.length} total players`, 
      iconURL: message.author.displayAvatarURL() 
    })
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
    const minutesLeft = Math.ceil(((nextDaily - now) % (60 * 60 * 1000)) / (60 * 1000));
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setAuthor({ 
        name: '⏰ DAILY REWARD', 
        iconURL: message.author.displayAvatarURL() 
      })
      .setDescription(`**Daily reward already claimed!**\n\n⏳ **Next daily reward available in:**\n**${hoursLeft}h ${minutesLeft}m**`)
      .addFields(
        { 
          name: '🕒 Last Claimed', 
          value: `<t:${Math.floor(lastDaily / 1000)}:R>\n<t:${Math.floor(lastDaily / 1000)}:f>`,
          inline: true 
        },
        { 
          name: '⏰ Next Available', 
          value: `<t:${Math.floor(nextDaily / 1000)}:R>\n<t:${Math.floor(nextDaily / 1000)}:f>`,
          inline: true 
        }
      )
      .setFooter({ text: 'Come back tomorrow for your daily reward!' })
      .setTimestamp();
    
    return message.reply({ embeds: [embed] });
  }
  
  // Give daily reward
  const xpEarned = XP_CONFIG.DAILY_BONUS;
  const xpResult = addXP(userId, guildId, xpEarned, 'daily_reward');
  dataStore.setDailyCooldown(userId, guildId);
  
  // Check for streak
  const xpData = dataStore.getUserXP(guildId, userId);
  const daysActive = Math.floor((now - (xpData.joinDate || now)) / (1000 * 60 * 60 * 24));
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.xp)
    .setAuthor({ 
      name: '🎁 DAILY REWARD CLAIMED!', 
      iconURL: message.author.displayAvatarURL() 
    })
    .setDescription(`**+${xpEarned} XP** added to your account!\n\nYour dedication is appreciated! 🎉`)
    .addFields(
      { 
        name: '💰 REWARD DETAILS', 
        value: `**Daily Bonus:** ${xpEarned} XP\n` +
               `**Total XP:** ${xpResult.xp.toFixed(1)}\n` +
               `**Current Level:** ${xpResult.level}`,
        inline: true 
      },
      { 
        name: '📅 ACTIVITY', 
        value: `**Days Active:** ${daysActive}\n` +
               `**Total Messages:** ${xpData.messages || 0}\n` +
               `**Games Won:** ${xpData.gamesWon || 0}`,
        inline: true 
      }
    );
  
  if (xpResult.levelUp) {
    embed.addFields({
      name: '🎉 LEVEL UP!',
      value: `**${xpResult.oldLevel} → ${xpResult.newLevel}**\nCongratulations on leveling up!`,
      inline: false
    });
  }
  
  embed.setFooter({ 
    text: `Come back in 24 hours for your next reward!`, 
    iconURL: message.guild.iconURL() 
  })
  .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function xpInfoCommand(message) {
  // Calculate XP requirements for first few levels
  let levelExamples = '';
  for (let level = 1; level <= 10; level++) {
    const xpNeeded = calculateXPForLevel(level);
    levelExamples += `**Level ${level}:** ${xpNeeded.toLocaleString()} XP\n`;
  }
  
  // Add some higher levels
  levelExamples += `\n**Level 20:** ${calculateXPForLevel(20).toLocaleString()} XP\n`;
  levelExamples += `**Level 50:** ${calculateXPForLevel(50).toLocaleString()} XP\n`;
  levelExamples += `**Level 100:** ${calculateXPForLevel(100).toLocaleString()} XP\n`;
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.xp)
    .setAuthor({ 
      name: '📊 EXTREME HARD XP SYSTEM', 
      iconURL: client.user.displayAvatarURL() 
    })
    .setTitle('⚡ LEVELING SYSTEM INFORMATION')
    .setDescription(`**⚠️ WARNING: This is an EXTREME HARD XP System!**\nLeveling up will take serious dedication and time.`)
    .addFields(
      {
        name: '🎮 GAME REWARDS',
        value: 
          `• **Game Win:** ${XP_CONFIG.PER_GAME_WIN} XP\n` +
          `• **Game Participation:** ${XP_CONFIG.PER_GAME_PARTICIPATION} XP\n` +
          `• **First Place Bonus:** Up to 2 XP extra`,
        inline: true
      },
      {
        name: '💬 MESSAGING',
        value: 
          `• **Per Message:** ${XP_CONFIG.PER_MESSAGE} XP\n` +
          `• **Cooldown:** ${XP_CONFIG.COOLDOWN_PER_MESSAGE} seconds\n` +
          `• **Effective Rate:** ~${(XP_CONFIG.PER_MESSAGE * (60/XP_CONFIG.COOLDOWN_PER_MESSAGE)).toFixed(1)} XP/hour`,
        inline: true
      },
      {
        name: '🎁 DAILY BONUS',
        value: 
          `• **Amount:** ${XP_CONFIG.DAILY_BONUS} XP\n` +
          `• **Cooldown:** 24 hours\n` +
          `• **Best Strategy:** Claim daily!`,
        inline: true
      },
      {
        name: '📈 LEVEL FORMULA',
        value: 
          `\`XP Required = ${XP_CONFIG.LEVEL_MULTIPLIER} × Level^${XP_CONFIG.LEVEL_EXPONENT}\`\n\n` +
          `**Example Calculations:**\n${levelExamples}`,
        inline: false
      },
      {
        name: '🏆 MAXIMUM LEVEL',
        value: 
          `• **Max Level:** ${XP_CONFIG.MAX_LEVEL}\n` +
          `• **XP for Max Level:** ${calculateXPForLevel(XP_CONFIG.MAX_LEVEL).toLocaleString()} XP\n` +
          `• **Estimated Time:** Years of active play`,
        inline: true
      },
      {
        name: '📊 COMMANDS',
        value: 
          `\`${PREFIX}rank [@user]\` - Check level and XP\n` +
          `\`${PREFIX}leaderboard [page]\` - Server rankings\n` +
          `\`${PREFIX}daily\` - Claim daily reward\n` +
          `\`${PREFIX}stats [@user]\` - Game statistics`,
        inline: true
      }
    )
    .setFooter({ 
      text: 'Good luck on your grinding journey! This system is designed to be extremely challenging.', 
      iconURL: message.guild.iconURL() 
    })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function statsCommand(message, args) {
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
  const gameStats = dataStore.data.gameStats?.[targetUser.id] || {};
  const levelData = getLevelFromXP(xpData.xp);
  
  // Calculate statistics
  const totalGames = Object.values(gameStats).reduce((sum, stat) => sum + (stat.played || 0), 0);
  const totalWins = Object.values(gameStats).reduce((sum, stat) => sum + (stat.won || 0), 0);
  const totalXPFromGames = Object.values(gameStats).reduce((sum, stat) => sum + (stat.xpEarned || 0), 0);
  const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : 0;
  
  // Get favorite game
  let favoriteGame = 'None';
  let mostPlayed = 0;
  
  Object.entries(gameStats).forEach(([game, stats]) => {
    if (stats.played > mostPlayed) {
      mostPlayed = stats.played;
      favoriteGame = game.charAt(0).toUpperCase() + game.slice(1);
    }
  });
  
  // Calculate accuracy for guessing games
  let guessingAccuracy = 0;
  let guessingGames = 0;
  
  ['flag', 'animal', 'hangman', 'trivia', 'number'].forEach(game => {
    if (gameStats[game]) {
      guessingGames++;
      const accuracy = gameStats[game].played > 0 ? 
        (gameStats[game].won / gameStats[game].played) * 100 : 0;
      guessingAccuracy += accuracy;
    }
  });
  
  guessingAccuracy = guessingGames > 0 ? (guessingAccuracy / guessingGames).toFixed(1) : 0;
  
  let statsText = `**📊 GAME STATISTICS**\n\n`;
  statsText += `**Total Games:** ${totalGames}\n`;
  statsText += `**Games Won:** ${totalWins} (${winRate}% win rate)\n`;
  statsText += `**Favorite Game:** ${favoriteGame}\n`;
  statsText += `**Guessing Accuracy:** ${guessingAccuracy}%\n`;
  statsText += `**XP from Games:** ${totalXPFromGames.toFixed(1)}\n\n`;
  
  // Add individual game stats
  Object.entries(gameStats).forEach(([game, stats]) => {
    const gameName = game.charAt(0).toUpperCase() + game.slice(1);
    const winRate = stats.played > 0 ? ((stats.won / stats.played) * 100).toFixed(1) : 0;
    statsText += `**${gameName}:** ${stats.won}/${stats.played} (${winRate}%)\n`;
  });
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setAuthor({ 
      name: `📈 PLAYER STATISTICS - ${targetUser.username}`, 
      iconURL: targetUser.displayAvatarURL() 
    })
    .setDescription(statsText)
    .addFields(
      {
        name: '⭐ LEVEL INFO',
        value: 
          `**Level:** ${levelData.level}\n` +
          `**XP:** ${xpData.xp.toFixed(1)}\n` +
          `**Progress:** ${levelData.progress}%\n` +
          `**Next Level:** ${levelData.requiredForNext.toFixed(1)} XP needed`,
        inline: true
      },
      {
        name: '💬 ACTIVITY',
        value: 
          `**Messages:** ${xpData.messages || 0}\n` +
          `**Daily Claims:** ${Object.keys(dataStore.data.dailies || {}).filter(key => key.startsWith(targetUser.id)).length}\n` +
          `**Last Active:** <t:${Math.floor((xpData.lastActive || Date.now()) / 1000)}:R>`,
        inline: true
      }
    )
    .setFooter({ 
      text: `Player ID: ${targetUser.id}`, 
      iconURL: message.guild.iconURL() 
    })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// ==================== UTILITY COMMANDS ====================
async function calcCommand(message, args) {
  if (!args.length) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '🧮 ADVANCED CALCULATOR', iconURL: client.user.displayAvatarURL() })
      .setTitle('Math Calculator')
      .setDescription(`**Usage:** \`${PREFIX}calc <expression>\``)
      .addFields(
        {
          name: '📋 SUPPORTED OPERATIONS',
          value: 
            '• **Basic:** `+ - * / ^`\n' +
            '• **Functions:** `sqrt(), sin(), cos(), tan(), log(), abs()`\n' +
            '• **Constants:** `pi, e`\n' +
            '• **Parentheses:** `( )`',
          inline: false
        },
        {
          name: '📝 EXAMPLES',
          value: 
            `\`${PREFIX}calc 5 * (10 + 3)\`\n` +
            `\`${PREFIX}calc sqrt(144) + 5^2\`\n` +
            `\`${PREFIX}calc sin(pi/2) * 100\`\n` +
            `\`${PREFIX}calc log(100) / log(10)\``,
          inline: false
        }
      )
      .setFooter({ text: 'Supports complex mathematical expressions' })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
  
  const expression = args.join(' ');
  
  try {
    const result = evaluate(expression);
    
    // Format the result
    let formattedResult = result;
    if (typeof result === 'number') {
      if (Number.isInteger(result)) {
        formattedResult = result.toLocaleString();
      } else {
        formattedResult = result.toFixed(6).replace(/\.?0+$/, '');
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '🧮 CALCULATION RESULT', iconURL: client.user.displayAvatarURL() })
      .addFields(
        { 
          name: '📝 EXPRESSION', 
          value: `\`\`\`${expression}\`\`\``, 
          inline: false 
        },
        { 
          name: '✨ RESULT', 
          value: `\`\`\`${formattedResult}\`\`\``, 
          inline: false 
        }
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ 
      embeds: [createErrorEmbed(`Invalid expression: \`${expression}\`\n\n**Common errors:**\n• Unbalanced parentheses\n• Invalid functions\n• Division by zero\n• Syntax errors`)] 
    });
  }
}

async function weatherCommand(message, args) {
  if (!args.length) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '🌤️ WEATHER FORECAST', iconURL: client.user.displayAvatarURL() })
      .setDescription(`**Usage:** \`${PREFIX}weather <city>\``)
      .addFields(
        {
          name: '📋 EXAMPLES',
          value: 
            `\`${PREFIX}weather Karachi\`\n` +
            `\`${PREFIX}weather London\`\n` +
            `\`${PREFIX}weather New York\`\n` +
            `\`${PREFIX}weather Tokyo\``,
          inline: false
        },
        {
          name: 'ℹ️ INFORMATION',
          value: 
            '• Provides current weather conditions\n' +
            '• Temperature in Celsius\n' +
            '• Humidity and wind speed\n' +
            '• Weather description',
          inline: false
        }
      )
      .setFooter({ text: 'Powered by weather data API' })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
  
  const city = args.join(' ');
  
  try {
    const response = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'DiscordBot/3.0 (https://github.com/yourusername/yourbot)'
      }
    });
    
    const data = response.data;
    const current = data.current_condition[0];
    const area = data.nearest_area[0];
    
    const tempC = current.temp_C;
    const feelsLike = current.FeelsLikeC;
    const humidity = current.humidity;
    const windSpeed = current.windspeedKmph;
    const windDir = current.winddir16Point;
    const pressure = current.pressure;
    const visibility = current.visibility;
    const condition = current.weatherDesc[0].value;
    
    // Get emoji for condition
    const conditionLower = condition.toLowerCase();
    let emoji = '🌡️';
    
    if (conditionLower.includes('sunny') || conditionLower.includes('clear')) emoji = '☀️';
    else if (conditionLower.includes('cloud')) emoji = '☁️';
    else if (conditionLower.includes('rain')) emoji = '🌧️';
    else if (conditionLower.includes('storm')) emoji = '⛈️';
    else if (conditionLower.includes('snow')) emoji = '❄️';
    else if (conditionLower.includes('fog') || conditionLower.includes('mist')) emoji = '🌫️';
    else if (conditionLower.includes('wind')) emoji = '💨';
    
    // Get color based on temperature
    let color = 0x3498db; // Default blue
    
    if (tempC > 30) color = 0xe74c3c; // Hot - red
    else if (tempC > 25) color = 0xe67e22; // Warm - orange
    else if (tempC > 20) color = 0xf1c40f; // Pleasant - yellow
    else if (tempC > 15) color = 0x2ecc71; // Cool - green
    else if (tempC > 5) color = 0x3498db; // Cold - blue
    else color = 0x9b59b6; // Freezing - purple
    
    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ 
        name: `${emoji} WEATHER - ${area.areaName[0].value}, ${area.country[0].value}`, 
        iconURL: 'https://cdn-icons-png.flaticon.com/512/1163/1163661.png' 
      })
      .setDescription(`**${condition}**`)
      .addFields(
        { 
          name: '🌡️ TEMPERATURE', 
          value: `**${tempC}°C**\nFeels like: **${feelsLike}°C**`, 
          inline: true 
        },
        { 
          name: '💧 HUMIDITY', 
          value: `**${humidity}%**`, 
          inline: true 
        },
        { 
          name: '💨 WIND', 
          value: `**${windSpeed} km/h**\nDirection: ${windDir}`, 
          inline: true 
        },
        { 
          name: '📊 PRESSURE', 
          value: `**${pressure} hPa**`, 
          inline: true 
        },
        { 
          name: '👁️ VISIBILITY', 
          value: `**${visibility} km**`, 
          inline: true 
        },
        { 
          name: '📍 LOCATION', 
          value: `**${area.areaName[0].value}**\n${area.country[0].value}`, 
          inline: true 
        }
      )
      .setFooter({ 
        text: `Live Weather Data • Requested by ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL() 
      })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Weather error:', error.message);
    
    // Fallback to simulated weather
    const simulatedTemps = {
      'karachi': 32, 'lahore': 28, 'islamabad': 24,
      'london': 15, 'new york': 22, 'tokyo': 20,
      'dubai': 38, 'mumbai': 30, 'paris': 18
    };
    
    const cityLower = city.toLowerCase();
    const temp = simulatedTemps[cityLower] || 20 + Math.floor(Math.random() * 15);
    
    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Clear', 'Light Rain'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setAuthor({ 
        name: `🌤️ WEATHER - ${city}`, 
        iconURL: 'https://cdn-icons-png.flaticon.com/512/1163/1163661.png' 
      })
      .setDescription(`**${condition}**`)
      .addFields(
        { name: '🌡️ TEMPERATURE', value: `**${temp}°C**`, inline: true },
        { name: '💧 HUMIDITY', value: `**${50 + Math.floor(Math.random() * 30)}%**`, inline: true },
        { name: '💨 WIND SPEED', value: `**${5 + Math.floor(Math.random() * 15)} km/h**`, inline: true }
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
      .setAuthor({ name: '🌐 LANGUAGE TRANSLATOR', iconURL: client.user.displayAvatarURL() })
      .setDescription(`**Usage:** \`${PREFIX}translate <text> to <language>\``)
      .addFields(
        {
          name: '📋 EXAMPLES',
          value: 
            `\`${PREFIX}translate hello to spanish\`\n` +
            `\`${PREFIX}translate good morning to french\`\n` +
            `\`${PREFIX}translate how are you to german\``,
          inline: false
        },
        {
          name: '🌍 SUPPORTED LANGUAGES',
          value: 
            '**Common Languages:**\n' +
            '• English, Spanish, French, German\n' +
            '• Italian, Portuguese, Russian, Japanese\n' +
            '• Korean, Chinese, Arabic, Hindi, Urdu\n\n' +
            '**Note:** Use full language names',
          inline: false
        }
      )
      .setFooter({ text: 'Powered by translation API' })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
  
  const text = args.slice(0, toIndex).join(' ');
  const targetLang = args.slice(toIndex + 1).join(' ').toLowerCase();
  
  if (text.length > 500) {
    return message.reply({ 
      embeds: [createErrorEmbed('Text too long! Maximum 500 characters.')] 
    });
  }
  
  const langCodes = {
    'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de',
    'italian': 'it', 'portuguese': 'pt', 'russian': 'ru', 'japanese': 'ja',
    'korean': 'ko', 'chinese': 'zh', 'arabic': 'ar', 'hindi': 'hi',
    'urdu': 'ur', 'turkish': 'tr', 'dutch': 'nl', 'polish': 'pl',
    'swedish': 'sv', 'danish': 'da', 'norwegian': 'no', 'finnish': 'fi'
  };
  
  const targetCode = langCodes[targetLang] || targetLang;
  
  if (!langCodes[targetLang] && targetLang.length !== 2) {
    return message.reply({ 
      embeds: [createErrorEmbed(`Unsupported language: ${targetLang}\n\n**Supported:** ${Object.keys(langCodes).join(', ')}`)] 
    });
  }
  
  try {
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: { 
        q: text, 
        langpair: `en|${targetCode}`,
        de: 'discord@bot.com'
      },
      timeout: 10000
    });
    
    const translatedText = response.data.responseData.translatedText;
    const match = response.data.responseData.match;
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '🌐 TRANSLATION COMPLETE', iconURL: client.user.displayAvatarURL() })
      .addFields(
        { 
          name: '🇬🇧 ORIGINAL TEXT', 
          value: `\`\`\`${text}\`\`\``, 
          inline: false 
        },
        { 
          name: `🌍 TRANSLATED (${targetLang.toUpperCase()})`, 
          value: `\`\`\`${translatedText}\`\`\``, 
          inline: false 
        }
      )
      .setFooter({ 
        text: `Translation Accuracy: ${match ? Math.round(match * 100) : 'Unknown'}% • Requested by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL() 
      })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply({ 
      embeds: [createErrorEmbed('Translation failed. Please try again with different text or language.')] 
    });
  }
}

async function remindCommand(message, args) {
  if (args.length < 2) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '⏰ REMINDER SYSTEM', iconURL: client.user.displayAvatarURL() })
      .setDescription(`**Usage:** \`${PREFIX}remind <time> <message>\``)
      .addFields(
        {
          name: '⏱️ TIME FORMATS',
          value: 
            '• **Seconds:** `30s`, `60s`\n' +
            '• **Minutes:** `5m`, `10m`, `30m`\n' +
            '• **Hours:** `1h`, `2h`, `6h`\n' +
            '• **Days:** `1d`, `2d`, `7d`\n' +
            '• **Combined:** `1h30m`, `2d6h`',
          inline: false
        },
        {
          name: '📋 EXAMPLES',
          value: 
            `\`${PREFIX}remind 30m take a break\`\n` +
            `\`${PREFIX}remind 2h do homework\`\n` +
            `\`${PREFIX}remind 1d call mom\`\n` +
            `\`${PREFIX}remind 1h30m meeting starts\``,
          inline: false
        }
      )
      .setFooter({ text: 'Maximum reminder time: 7 days' })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
  
  const timeArg = args[0].toLowerCase();
  const reminderMessage = args.slice(1).join(' ');
  
  // Parse time
  let totalSeconds = 0;
  const timeRegex = /(\d+)([smhd])/g;
  let match;
  
  while ((match = timeRegex.exec(timeArg)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': totalSeconds += value; break;
      case 'm': totalSeconds += value * 60; break;
      case 'h': totalSeconds += value * 60 * 60; break;
      case 'd': totalSeconds += value * 60 * 60 * 24; break;
    }
  }
  
  if (totalSeconds === 0) {
    return message.reply({ 
      embeds: [createErrorEmbed('Invalid time format! Use formats like: 30s, 5m, 1h, 2d')] 
    });
  }
  
  // Check maximum time (7 days)
  if (totalSeconds > 7 * 24 * 60 * 60) {
    return message.reply({ 
      embeds: [createErrorEmbed('Maximum reminder time is 7 days!')] 
    });
  }
  
  // Format time display
  let timeDisplay = '';
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  
  if (days > 0) timeDisplay += `${days}d `;
  if (hours > 0) timeDisplay += `${hours}h `;
  if (minutes > 0) timeDisplay += `${minutes}m `;
  if (seconds > 0) timeDisplay += `${seconds}s`;
  
  const reminderTime = Date.now() + (totalSeconds * 1000);
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({ name: '⏰ REMINDER SET', iconURL: message.author.displayAvatarURL() })
    .setDescription(`**Reminder has been set!**`)
    .addFields(
      { 
        name: '📝 MESSAGE', 
        value: `\`\`\`${reminderMessage}\`\`\``, 
        inline: false 
      },
      { 
        name: '⏱️ TIME', 
        value: `**${timeDisplay.trim()}**\nReminder will trigger: <t:${Math.floor(reminderTime / 1000)}:R>`, 
        inline: true 
      },
      { 
        name: '👤 SET BY', 
        value: `${message.author.tag}`, 
        inline: true 
      }
    )
    .setFooter({ text: 'You will be mentioned when the reminder triggers' })
    .setTimestamp();
  
  const reply = await message.reply({ embeds: [embed] });
  
  // Set the reminder
  setTimeout(async () => {
    try {
      const reminderEmbed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setAuthor({ name: '🔔 REMINDER', iconURL: message.author.displayAvatarURL() })
        .setDescription(`**⏰ Time's up!**\n\n**Your reminder:**\n\`\`\`${reminderMessage}\`\`\``)
        .addFields(
          { 
            name: '📅 SET ON', 
            value: `<t:${Math.floor(Date.now() / 1000) - totalSeconds}:f>`, 
            inline: true 
          },
          { 
            name: '⏱️ DURATION', 
            value: timeDisplay.trim(), 
            inline: true 
          }
        )
        .setFooter({ text: 'Reminder triggered' })
        .setTimestamp();
      
      await message.channel.send({
        content: `${message.author}`,
        embeds: [reminderEmbed]
      });
      
    } catch (error) {
      console.error('Reminder error:', error);
    }
  }, totalSeconds * 1000);
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
    "Why did the math book look so sad? Because it had too many problems.",
    "What do you call a fish wearing a bowtie? Sofishticated!",
    "Why don't skeletons fight each other? They don't have the guts.",
    "What do you call a sleeping bull? A bulldozer!",
    "Why did the tomato turn red? Because it saw the salad dressing!",
    "What do you call a factory that makes okay products? A satisfactory.",
    "Why did the golfer bring two pairs of pants? In case he got a hole in one!"
  ];
  
  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.fun)
    .setAuthor({ name: '😂 RANDOM JOKE', iconURL: client.user.displayAvatarURL() })
    .setDescription(`**${joke}**`)
    .setFooter({ text: `Requested by ${message.author.tag} • Hope you laughed!` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function quoteCommand(message) {
  const quotes = [
    { 
      text: "The only way to do great work is to love what you do.", 
      author: "Steve Jobs",
      category: "Motivation"
    },
    { 
      text: "Life is what happens to you while you're busy making other plans.", 
      author: "John Lennon",
      category: "Life"
    },
    { 
      text: "The future belongs to those who believe in the beauty of their dreams.", 
      author: "Eleanor Roosevelt",
      category: "Dreams"
    },
    { 
      text: "It is during our darkest moments that we must focus to see the light.", 
      author: "Aristotle",
      category: "Perseverance"
    },
    { 
      text: "Whoever is happy will make others happy too.", 
      author: "Anne Frank",
      category: "Happiness"
    },
    { 
      text: "You must be the change you wish to see in the world.", 
      author: "Mahatma Gandhi",
      category: "Change"
    },
    { 
      text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", 
      author: "Mother Teresa",
      category: "Love"
    },
    { 
      text: "The only thing we have to fear is fear itself.", 
      author: "Franklin D. Roosevelt",
      category: "Courage"
    },
    { 
      text: "Do not go where the path may lead, go instead where there is no path and leave a trail.", 
      author: "Ralph Waldo Emerson",
      category: "Innovation"
    },
    { 
      text: "Be yourself; everyone else is already taken.", 
      author: "Oscar Wilde",
      category: "Individuality"
    }
  ];
  
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setAuthor({ name: '💭 INSPIRATIONAL QUOTE', iconURL: client.user.displayAvatarURL() })
    .setDescription(`*"${quote.text}"*\n\n**— ${quote.author}**`)
    .setFooter({ text: `Category: ${quote.category} • Requested by ${message.author.tag}` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function coinFlipCommand(message) {
  const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
  const emoji = result === 'Heads' ? '👑' : '🦅';
  const gif = result === 'Heads' 
    ? 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif'
    : 'https://media.giphy.com/media/3o7TKsQ8gTp3WqXqjq/giphy.gif';
  
  // Add some fun messages
  const messages = {
    'Heads': ['Heads it is!', 'The coin says Heads!', 'Heads wins!', 'It landed on Heads!'],
    'Tails': ['Tails never fails!', 'Tails is the winner!', 'It\'s Tails!', 'Tails it is!']
  };
  
  const randomMessage = messages[result][Math.floor(Math.random() * messages[result].length)];
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.fun)
    .setAuthor({ name: '🪙 COIN FLIP', iconURL: message.author.displayAvatarURL() })
    .setDescription(`${emoji} **${randomMessage}**\n\nThe coin landed on: **${result}**`)
    .setImage(gif)
    .setFooter({ text: `Flipped by ${message.author.tag}` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function diceRollCommand(message, args) {
  const dice = args[0] || '1d6';
  const diceRegex = /^(\d+)d(\d+)$/i;
  const match = dice.match(diceRegex);
  
  if (!match) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '🎲 DICE ROLLER', iconURL: client.user.displayAvatarURL() })
      .setDescription(`**Usage:** \`${PREFIX}dice [NdS]\``)
      .addFields(
        {
          name: '📋 FORMAT',
          value: '`NdS` where:\n• **N** = Number of dice (1-10)\n• **S** = Number of sides (2-100)',
          inline: false
        },
        {
          name: '🎯 EXAMPLES',
          value: 
            `\`${PREFIX}dice 1d6\` - One 6-sided die\n` +
            `\`${PREFIX}dice 2d6\` - Two 6-sided dice\n` +
            `\`${PREFIX}dice 1d20\` - One 20-sided die\n` +
            `\`${PREFIX}dice 5d10\` - Five 10-sided dice`,
          inline: false
        },
        {
          name: '🎮 COMMON DICE',
          value: 
            '• **d4** - 4 sides\n' +
            '• **d6** - 6 sides (standard)\n' +
            '• **d8** - 8 sides\n' +
            '• **d10** - 10 sides\n' +
            '• **d12** - 12 sides\n' +
            '• **d20** - 20 sides',
          inline: false
        }
      )
      .setFooter({ text: 'Perfect for tabletop RPGs and games!' })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
  
  const num = parseInt(match[1]);
  const sides = parseInt(match[2]);
  
  if (num < 1 || num > 10) {
    return message.reply({ 
      embeds: [createErrorEmbed('Number of dice must be between 1 and 10!')] 
    });
  }
  
  if (sides < 2 || sides > 100) {
    return message.reply({ 
      embeds: [createErrorEmbed('Number of sides must be between 2 and 100!')] 
    });
  }
  
  let total = 0;
  const rolls = [];
  const emojis = [];
  
  for (let i = 0; i < num; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    total += roll;
    
    // Add emoji for the roll
    if (roll === sides) emojis.push('🎯'); // Max roll
    else if (roll === 1) emojis.push('💀'); // Min roll
    else if (roll > sides * 0.8) emojis.push('🔥'); // High roll
    else if (roll < sides * 0.2) emojis.push('😢'); // Low roll
    else emojis.push('🎲'); // Normal roll
  }
  
  // Determine special outcomes
  let specialOutcome = '';
  if (num === 1) {
    if (rolls[0] === sides) specialOutcome = '**CRITICAL SUCCESS!** 🎯';
    else if (rolls[0] === 1) specialOutcome = '**CRITICAL FAILURE!** 💀';
  } else if (num > 1) {
    const allSame = rolls.every(val => val === rolls[0]);
    if (allSame) specialOutcome = '**ALL DICE SAME!** 🤯';
  }
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.fun)
    .setAuthor({ name: '🎲 DICE ROLL', iconURL: message.author.displayAvatarURL() })
    .setDescription(`**Rolling: ${dice.toUpperCase()}**\n\n${specialOutcome}`)
    .addFields(
      { 
        name: '🎯 ROLLS', 
        value: rolls.map((roll, idx) => `${emojis[idx]} Die ${idx + 1}: **${roll}**`).join('\n'), 
        inline: true 
      },
      { 
        name: '💰 TOTAL', 
        value: `**${total}**`, 
        inline: true 
      },
      { 
        name: '📊 STATS', 
        value: `**Average:** ${(total / num).toFixed(1)}\n**High:** ${Math.max(...rolls)}\n**Low:** ${Math.min(...rolls)}`, 
        inline: true 
      }
    )
    .setFooter({ text: `Rolled by ${message.author.tag} • ${num} dice with ${sides} sides each` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function eightBallCommand(message, args) {
  if (!args.length) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setAuthor({ name: '🎱 MAGIC 8 BALL', iconURL: client.user.displayAvatarURL() })
      .setDescription(`**Usage:** \`${PREFIX}8ball <question>\``)
      .addFields(
        {
          name: '❓ ASK A QUESTION',
          value: 'The Magic 8 Ball will give you a mysterious answer to your question.',
          inline: false
        },
        {
          name: '📋 EXAMPLES',
          value: 
            `\`${PREFIX}8ball Will I win today?\`\n` +
            `\`${PREFIX}8ball Is today my lucky day?\`\n` +
            `\`${PREFIX}8ball Should I go out tonight?\`\n` +
            `\`${PREFIX}8ball Am I making the right decision?\``,
          inline: false
        },
        {
          name: '⚡ TIP',
          value: 'Ask yes/no questions for the best results!',
          inline: false
        }
      )
      .setFooter({ text: 'The Magic 8 Ball knows all...' })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
  
  const question = args.join(' ');
  
  const responses = [
    // Positive
    { text: 'It is certain.', type: 'positive', emoji: '🎱' },
    { text: 'It is decidedly so.', type: 'positive', emoji: '🎱' },
    { text: 'Without a doubt.', type: 'positive', emoji: '🎱' },
    { text: 'Yes definitely.', type: 'positive', emoji: '🎱' },
    { text: 'You may rely on it.', type: 'positive', emoji: '🎱' },
    { text: 'As I see it, yes.', type: 'positive', emoji: '🎱' },
    { text: 'Most likely.', type: 'positive', emoji: '🎱' },
    { text: 'Outlook good.', type: 'positive', emoji: '🎱' },
    { text: 'Yes.', type: 'positive', emoji: '🎱' },
    { text: 'Signs point to yes.', type: 'positive', emoji: '🎱' },
    
    // Neutral
    { text: 'Reply hazy, try again.', type: 'neutral', emoji: '🌀' },
    { text: 'Ask again later.', type: 'neutral', emoji: '⏳' },
    { text: 'Better not tell you now.', type: 'neutral', emoji: '🤫' },
    { text: 'Cannot predict now.', type: 'neutral', emoji: '🔮' },
    { text: 'Concentrate and ask again.', type: 'neutral', emoji: '🧘' },
    
    // Negative
    { text: 'Don\'t count on it.', type: 'negative', emoji: '🙅' },
    { text: 'My reply is no.', type: 'negative', emoji: '❌' },
    { text: 'My sources say no.', type: 'negative', emoji: '📡' },
    { text: 'Outlook not so good.', type: 'negative', emoji: '🌫️' },
    { text: 'Very doubtful.', type: 'negative', emoji: '🤔' }
  ];
  
  const response = responses[Math.floor(Math.random() * responses.length)];
  
  // Determine color based on response type
  let color = COLORS.info;
  if (response.type === 'positive') color = COLORS.success;
  else if (response.type === 'negative') color = COLORS.error;
  
  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: '🎱 MAGIC 8 BALL', iconURL: message.author.displayAvatarURL() })
    .addFields(
      { 
        name: '❓ QUESTION', 
        value: `*"${question}"*`, 
        inline: false 
      },
      { 
        name: `${response.emoji} ANSWER`, 
        value: `**${response.text}**`, 
        inline: false 
      }
    )
    .setFooter({ 
      text: `Type: ${response.type.toUpperCase()} • Asked by ${message.author.tag}`, 
      iconURL: message.author.displayAvatarURL() 
    })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// ==================== USER COMMANDS ====================
async function userInfoCommand(message, args) {
  let targetUser = message.author;
  let targetMember = message.member;
  
  if (args.length > 0) {
    const userId = extractId(args[0]);
    if (userId) {
      try {
        targetUser = await client.users.fetch(userId);
        targetMember = await message.guild.members.fetch(userId).catch(() => null);
      } catch {
        return message.reply({ embeds: [createErrorEmbed('User not found!')] });
      }
    }
  }
  
  const xpData = dataStore.getUserXP(message.guild.id, targetUser.id);
  const levelData = getLevelFromXP(xpData.xp);
  
  // Get badges
  const badges = [];
  if (targetMember) {
    if (targetMember.premiumSince) badges.push('🌟 Booster');
    if (isAdmin(targetMember)) badges.push('👑 Admin');
    else if (isMod(targetMember)) badges.push('⚔️ Mod');
    if (targetMember.permissions.has(PermissionFlagsBits.ManageMessages)) badges.push('📝 Staff');
    if (targetUser.bot) badges.push('🤖 Bot');
    
    // Custom role badges (if any special roles)
    const specialRoles = ['VIP', 'Donator', 'Premium', 'Pro', 'Elite', 'Legend'];
    targetMember.roles.cache.forEach(role => {
      if (specialRoles.some(special => role.name.toLowerCase().includes(special.toLowerCase()))) {
        badges.push(role.name);
      }
    });
  }
  
  // Get join position
  let joinPosition = 'N/A';
  if (targetMember && targetMember.joinedTimestamp) {
    const members = await message.guild.members.fetch();
    const sortedMembers = Array.from(members.values())
      .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp)
      .filter(m => m.joinedTimestamp);
    
    const position = sortedMembers.findIndex(m => m.id === targetUser.id) + 1;
    if (position > 0) {
      joinPosition = `#${position}`;
    }
  }
  
  // Get roles (limited to 10)
  const roles = targetMember ? 
    targetMember.roles.cache
      .filter(role => role.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(role => role.toString())
      .slice(0, 10) : [];
  
  const embed = new EmbedBuilder()
    .setColor(targetMember?.displayHexColor || COLORS.primary)
    .setAuthor({ 
      name: `👤 USER INFORMATION - ${targetUser.tag}`, 
      iconURL: targetUser.displayAvatarURL({ size: 256 }) 
    })
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .addFields(
      { 
        name: '📝 BASIC INFO', 
        value: 
          `**Username:** \`${targetUser.tag}\`\n` +
          `**ID:** \`${targetUser.id}\`\n` +
          `**Bot:** ${targetUser.bot ? 'Yes 🤖' : 'No 👤'}\n` +
          `**Account Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>\n` +
          `**Age:** ${Math.floor((Date.now() - targetUser.createdTimestamp) / (1000 * 60 * 60 * 24 * 365.25))} years`,
        inline: false 
      }
    );
  
  if (targetMember) {
    embed.addFields(
      { 
        name: '🏰 SERVER INFO', 
        value: 
          `**Joined Server:** ${targetMember.joinedTimestamp ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` : 'Unknown'}\n` +
          `**Join Position:** ${joinPosition}\n` +
          `**Nickname:** ${targetMember.nickname || 'None'}\n` +
          `**Highest Role:** ${targetMember.roles.highest.toString()}`,
        inline: false 
      }
    );
  }
  
  embed.addFields(
    { 
      name: '📊 XP STATS', 
      value: 
        `**Level:** ${levelData.level}\n` +
        `**XP:** ${xpData.xp.toFixed(1)}\n` +
        `**Rank:** #${Object.entries(dataStore.getAllXP(message.guild.id))
          .sort((a, b) => b[1].xp - a[1].xp)
          .findIndex(([id]) => id === targetUser.id) + 1}\n` +
        `**Messages:** ${xpData.messages || 0}\n` +
        `**Games Won:** ${xpData.gamesWon || 0}`,
      inline: true 
    },
    { 
      name: '🎮 ACTIVITY', 
      value: 
        `**Last Active:** <t:${Math.floor((xpData.lastActive || Date.now()) / 1000)}:R>\n` +
        `**Days in Server:** ${targetMember?.joinedTimestamp ? 
          Math.floor((Date.now() - targetMember.joinedTimestamp) / (1000 * 60 * 60 * 24)) : 
          'N/A'}\n` +
        `**Status:** ${targetMember?.presence?.status || 'offline'}\n` +
        `**Activity:** ${targetMember?.presence?.activities[0]?.name || 'None'}`,
      inline: true 
    }
  );
  
  if (badges.length > 0) {
    embed.addFields({
      name: '🎖️ BADGES & ROLES',
      value: badges.join(' • '),
      inline: false
    });
  }
  
  if (roles.length > 0) {
    embed.addFields({
      name: `🏷️ ROLES [${targetMember ? targetMember.roles.cache.size - 1 : 0}]`,
      value: roles.join(' ') + (roles.length < (targetMember?.roles.cache.size - 1 || 0) ? `\n...and ${(targetMember?.roles.cache.size - 1 || 0) - roles.length} more` : ''),
      inline: false
    });
  }
  
  embed.setFooter({ 
    text: `Requested by ${message.author.tag} • User ID: ${targetUser.id}`, 
    iconURL: message.author.displayAvatarURL() 
  })
  .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function avatarCommand(message, args) {
  let targetUser = message.author;
  let targetMember = message.member;
  
  if (args.length > 0) {
    const userId = extractId(args[0]);
    if (userId) {
      try {
        targetUser = await client.users.fetch(userId);
        targetMember = await message.guild.members.fetch(userId).catch(() => null);
      } catch {
        return message.reply({ embeds: [createErrorEmbed('User not found!')] });
      }
    }
  }
  
  const avatarURL = targetUser.displayAvatarURL({ 
    size: 4096, 
    dynamic: true,
    extension: 'png'
  });
  
  // Check for different formats
  const formats = ['png', 'jpg', 'webp'];
  if (targetUser.avatar?.startsWith('a_')) formats.push('gif');
  
  const links = formats.map(f => 
    `[\`${f.toUpperCase()}\`](${targetUser.displayAvatarURL({ extension: f, size: 4096 })})`
  ).join(' • ');
  
  // Get banner if available
  let bannerURL = null;
  try {
    const user = await client.users.fetch(targetUser.id, { force: true });
    if (user.banner) {
      bannerURL = user.bannerURL({ size: 4096, dynamic: true });
    }
  } catch (error) {
    // Banner not available
  }
  
  const embed = new EmbedBuilder()
    .setColor(targetMember?.displayHexColor || COLORS.primary)
    .setAuthor({ 
      name: `📸 AVATAR - ${targetUser.tag}`, 
      iconURL: targetUser.displayAvatarURL() 
    })
    .setImage(avatarURL)
    .setDescription(`**📥 Download:** ${links}\n**🔗 Direct Link:** [Click Here](${avatarURL})`)
    .setFooter({ 
      text: `Requested by ${message.author.tag} • User ID: ${targetUser.id}`, 
      iconURL: message.author.displayAvatarURL() 
    })
    .setTimestamp();
  
  const reply = await message.reply({ embeds: [embed] });
  
  // If banner exists, send it in a separate embed
  if (bannerURL) {
    const bannerEmbed = new EmbedBuilder()
      .setColor(targetMember?.displayHexColor || COLORS.primary)
      .setAuthor({ 
        name: `🚩 BANNER - ${targetUser.tag}`, 
        iconURL: targetUser.displayAvatarURL() 
      })
      .setImage(bannerURL)
      .setDescription(`**📥 Banner URL:** [Click Here](${bannerURL})`)
      .setFooter({ text: 'User Banner' })
      .setTimestamp();
    
    await message.channel.send({ embeds: [bannerEmbed] });
  }
}

async function serverinfoCommand(message) {
  const guild = message.guild;
  const owner = await guild.fetchOwner().catch(() => null);
  
  // Calculate server stats
  const memberCount = guild.memberCount;
  const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;
  const offlineMembers = guild.members.cache.filter(m => !m.presence || m.presence.status === 'offline').size;
  const botCount = guild.members.cache.filter(m => m.user.bot).size;
  
  const channels = guild.channels.cache;
  const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
  const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
  const categoryChannels = channels.filter(c => c.type === ChannelType.GuildCategory).size;
  
  const roles = guild.roles.cache.size;
  const emojis = guild.emojis.cache.size;
  const stickers = guild.stickers.cache.size;
  
  const boosts = guild.premiumSubscriptionCount || 0;
  const boostLevel = guild.premiumTier;
  
  // Calculate server age
  const serverAge = Math.floor((Date.now() - guild.createdTimestamp) / (1000 * 60 * 60 * 24));
  
  // Get verification level text
  const verificationLevels = {
    0: 'None',
    1: 'Low',
    2: 'Medium',
    3: 'High',
    4: 'Highest'
  };
  
  const embed = new EmbedBuilder()
    .setColor(guild.roles.highest.color || 0x5865F2)
    .setAuthor({ 
      name: `🏰 SERVER INFORMATION - ${guild.name}`, 
      iconURL: guild.iconURL({ size: 256 }) 
    })
    .setThumbnail(guild.iconURL({ size: 256 }))
    .setImage(guild.bannerURL({ size: 1024 }))
    .addFields(
      { 
        name: '📝 BASIC INFO', 
        value: 
          `**Server Name:** \`${guild.name}\`\n` +
          `**Server ID:** \`${guild.id}\`\n` +
          `**Owner:** ${owner ? owner.user.tag : 'Unknown'}\n` +
          `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\n` +
          `**Age:** ${serverAge} days`,
        inline: false 
      },
      { 
        name: '👥 MEMBERS', 
        value: 
          `**Total:** ${memberCount.toLocaleString()}\n` +
          `**Online:** ${onlineMembers.toLocaleString()}\n` +
          `**Offline:** ${offlineMembers.toLocaleString()}\n` +
          `**Bots:** ${botCount.toLocaleString()}`,
        inline: true 
      },
      { 
        name: '📊 CHANNELS', 
        value: 
          `**Text:** ${textChannels}\n` +
          `**Voice:** ${voiceChannels}\n` +
          `**Categories:** ${categoryChannels}\n` +
          `**Total:** ${channels.size}`,
        inline: true 
      },
      { 
        name: '🎨 SERVER FEATURES', 
        value: 
          `**Roles:** ${roles}\n` +
          `**Emojis:** ${emojis}\n` +
          `**Stickers:** ${stickers}\n` +
          `**Boosts:** ${boosts} (Level ${boostLevel})`,
        inline: true 
      }
    );
  
  // Add server features if any
  const features = guild.features;
  if (features.length > 0) {
    const featureNames = features
      .map(f => f.toLowerCase().replace(/_/g, ' '))
      .map(f => f.charAt(0).toUpperCase() + f.slice(1));
    
    embed.addFields({
      name: '⚙️ SERVER FEATURES',
      value: featureNames.slice(0, 10).join(', ') + (featureNames.length > 10 ? `\n...and ${featureNames.length - 10} more` : ''),
      inline: false
    });
  }
  
  // Add verification level
  embed.addFields({
    name: '🛡️ SECURITY',
    value: `**Verification Level:** ${verificationLevels[guild.verificationLevel] || 'Unknown'}`,
    inline: true
  });
  
  // Add XP stats if available
  const xpData = dataStore.getAllXP(guild.id);
  if (Object.keys(xpData).length > 0) {
    const totalXP = Object.values(xpData).reduce((sum, data) => sum + data.xp, 0);
    const avgLevel = Object.values(xpData).reduce((sum, data) => sum + getLevelFromXP(data.xp).level, 0) / Object.keys(xpData).length;
    
    embed.addFields({
      name: '📈 XP STATISTICS',
      value: 
        `**Active Users:** ${Object.keys(xpData).length}\n` +
        `**Total XP:** ${totalXP.toFixed(1)}\n` +
        `**Average Level:** ${avgLevel.toFixed(1)}`,
      inline: true
    });
  }
  
  embed.setFooter({ 
    text: `Server ID: ${guild.id} • Requested by ${message.author.tag}`, 
    iconURL: message.author.displayAvatarURL() 
  })
  .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function botinfoCommand(message) {
  const uptime = client.uptime;
  const days = Math.floor(uptime / 86400000);
  const hours = Math.floor((uptime % 86400000) / 3600000);
  const minutes = Math.floor((uptime % 3600000) / 60000);
  const seconds = Math.floor((uptime % 60000) / 1000);
  
  const memoryUsage = process.memoryUsage();
  const usedMemory = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const totalMemory = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  
  const guildCount = client.guilds.cache.size;
  const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  const channelCount = client.guilds.cache.reduce((acc, guild) => acc + guild.channels.cache.size, 0);
  
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ 
      name: '🤖 BOT INFORMATION', 
      iconURL: client.user.displayAvatarURL({ size: 256 }) 
    })
    .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
    .addFields(
      { 
        name: '📝 BOT INFO', 
        value: 
          `**Bot Name:** \`${client.user.tag}\`\n` +
          `**Bot ID:** \`${client.user.id}\`\n` +
          `**Created:** <t:${Math.floor(client.user.createdTimestamp / 1000)}:R>\n` +
          `**Developer:** \`Unknown\`\n` +
          `**Library:** Discord.js v14`,
        inline: false 
      },
      { 
        name: '📊 STATISTICS', 
        value: 
          `**Servers:** ${guildCount.toLocaleString()}\n` +
          `**Users:** ${userCount.toLocaleString()}\n` +
          `**Channels:** ${channelCount.toLocaleString()}\n` +
          `**Commands:** 60+`,
        inline: true 
      },
      { 
        name: '⚡ PERFORMANCE', 
        value: 
          `**Uptime:** ${days}d ${hours}h ${minutes}m ${seconds}s\n` +
          `**Memory:** ${usedMemory}MB / ${totalMemory}MB\n` +
          `**Ping:** ${client.ws.ping}ms\n` +
          `**Node.js:** ${process.version}`,
        inline: true 
      },
      { 
        name: '🎮 FEATURES', 
        value: 
          '• **Public Games System**\n' +
          '• **Extreme Hard XP System**\n' +
          '• **Role-based Help Commands**\n' +
          '• **Advanced Moderation**\n' +
          '• **Utility Commands**\n' +
          '• **Fun Commands**',
        inline: false 
      }
    )
    .setFooter({ 
      text: `Bot Version 3.0 • ${client.user.tag}`, 
      iconURL: client.user.displayAvatarURL() 
    })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// ==================== BASIC COMMANDS ====================
async function pingCommand(message) {
  const sent = await message.reply({ 
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.info)
        .setDescription('📡 **Measuring latency...**')
        .setTimestamp()
    ] 
  });
  
  const latency = sent.createdTimestamp - message.createdTimestamp;
  const apiLatency = Math.round(client.ws.ping);
  
  // Determine status
  const getStatus = (ms) => {
    if (ms < 100) return { text: '🟢 Excellent', color: COLORS.success };
    if (ms < 200) return { text: '🟡 Good', color: COLORS.warning };
    if (ms < 500) return { text: '🟠 Average', color: 0xFFA500 };
    return { text: '🔴 Poor', color: COLORS.error };
  };
  
  const botStatus = getStatus(latency);
  const apiStatus = getStatus(apiLatency);
  
  const embed = new EmbedBuilder()
    .setColor(botStatus.color)
    .setAuthor({ name: '📡 PING & LATENCY', iconURL: client.user.displayAvatarURL() })
    .addFields(
      { 
        name: '🤖 BOT LATENCY', 
        value: `${latency}ms \`${botStatus.text}\`\n*Time taken to process command*`, 
        inline: true 
      },
      { 
        name: '🌐 API LATENCY', 
        value: `${apiLatency}ms \`${apiStatus.text}\`\n*Discord API response time*`, 
        inline: true 
      },
      { 
        name: '⚡ STATUS', 
        value: latency < 100 ? '✨ **Super Fast!**' : 
               latency < 200 ? '🚀 **Fast**' : 
               latency < 500 ? '👍 **Normal**' : '🐌 **Slow**', 
        inline: true 
      }
    )
    .setFooter({ 
      text: `Requested by ${message.author.tag} • ${client.ws.gateway}`, 
      iconURL: message.author.displayAvatarURL() 
    })
    .setTimestamp();
  
  await sent.edit({ embeds: [embed] });
}

// ==================== MODERATION COMMANDS ====================
async function clearCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions to use this command.')] });
  }
  
  const amount = parseInt(args[0]) || 10;
  
  if (isNaN(amount) || amount < 1 || amount > 100) {
    return message.reply({ 
      embeds: [createErrorEmbed('Please specify a number between 1 and 100.')] 
    });
  }
  
  try {
    const deleted = await message.channel.bulkDelete(Math.min(amount, 100), true);
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '🗑️ MESSAGES CLEARED', iconURL: message.author.displayAvatarURL() })
      .setDescription(`**${deleted.size}** messages have been deleted.`)
      .addFields(
        { name: '📌 CHANNEL', value: `${message.channel}`, inline: true },
        { name: '👮 MODERATOR', value: `${message.author}`, inline: true },
        { name: '⏱️ TIME', value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true }
      )
      .setFooter({ text: 'Messages successfully deleted' })
      .setTimestamp();
    
    const reply = await message.channel.send({ embeds: [embed] });
    
    // Delete confirmation after 5 seconds
    setTimeout(() => {
      reply.delete().catch(() => {});
    }, 5000);
    
  } catch (error) {
    console.error('Clear error:', error);
    message.reply({ 
      embeds: [createErrorEmbed('Cannot delete messages. Messages may be older than 14 days or I lack permissions.')] 
    });
  }
}

async function kickCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions to use this command.')] });
  }
  
  if (args.length < 1) {
    return message.reply({ 
      embeds: [createErrorEmbed(`Usage: ${PREFIX}kick <@user> [reason]`)] 
    });
  }
  
  const userId = extractId(args[0]);
  if (!userId) {
    return message.reply({ embeds: [createErrorEmbed('Please mention a valid user.')] });
  }
  
  try {
    const member = await message.guild.members.fetch(userId);
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    // Check if the bot can kick the user
    if (!member.kickable) {
      return message.reply({ 
        embeds: [createErrorEmbed('I cannot kick this user. They may have higher permissions than me.')] 
      });
    }
    
    // Check if the moderator can kick the user
    if (member.roles.highest.position >= message.member.roles.highest.position && !isAdmin(message.member)) {
      return message.reply({ 
        embeds: [createErrorEmbed('You cannot kick someone with a higher or equal role.')] 
      });
    }
    
    // DM the user before kicking
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setAuthor({ name: `🚫 KICKED FROM ${message.guild.name}`, iconURL: message.guild.iconURL() })
        .setDescription(`You have been kicked from **${message.guild.name}**`)
        .addFields(
          { name: '👮 MODERATOR', value: `${message.author.tag} (${message.author.id})`, inline: true },
          { name: '📝 REASON', value: reason, inline: true },
          { name: '⏱️ TIME', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: 'You can rejoin if the server allows it' })
        .setTimestamp();
      
      await member.send({ embeds: [dmEmbed] });
    } catch (dmError) {
      // User has DMs closed, that's okay
    }
    
    // Kick the user
    await member.kick(reason);
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setAuthor({ name: '👢 USER KICKED', iconURL: member.user.displayAvatarURL() })
      .addFields(
        { name: '👤 USER', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
        { name: '👮 MODERATOR', value: `${message.author}`, inline: true },
        { name: '📝 REASON', value: reason, inline: false }
      )
      .setFooter({ text: `User ID: ${member.id}` })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Kick error:', error);
    message.reply({ 
      embeds: [createErrorEmbed('Cannot kick user. They may have left the server or I lack permissions.')] 
    });
  }
}

async function banCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions to use this command.')] });
  }
  
  if (args.length < 1) {
    return message.reply({ 
      embeds: [createErrorEmbed(`Usage: ${PREFIX}ban <@user> [reason]`)] 
    });
  }
  
  const userId = extractId(args[0]);
  if (!userId) {
    return message.reply({ embeds: [createErrorEmbed('Please provide a valid user ID or mention.')] });
  }
  
  try {
    const reason = args.slice(1).join(' ') || 'No reason provided';
    const user = await client.users.fetch(userId).catch(() => null);
    
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('User not found.')] });
    }
    
    // Check if user is in the server
    const member = await message.guild.members.fetch(userId).catch(() => null);
    
    if (member) {
      // Check if the bot can ban the user
      if (!member.bannable) {
        return message.reply({ 
          embeds: [createErrorEmbed('I cannot ban this user. They may have higher permissions than me.')] 
        });
      }
      
      // Check if the moderator can ban the user
      if (member.roles.highest.position >= message.member.roles.highest.position && !isAdmin(message.member)) {
        return message.reply({ 
          embeds: [createErrorEmbed('You cannot ban someone with a higher or equal role.')] 
        });
      }
    }
    
    // DM the user before banning (if they're in the server)
    if (member) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(COLORS.error)
          .setAuthor({ name: `🔨 BANNED FROM ${message.guild.name}`, iconURL: message.guild.iconURL() })
          .setDescription(`You have been banned from **${message.guild.name}**`)
          .addFields(
            { name: '👮 MODERATOR', value: `${message.author.tag} (${message.author.id})`, inline: true },
            { name: '📝 REASON', value: reason, inline: true },
            { name: '⏱️ TIME', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: 'This ban is permanent unless appealed' })
          .setTimestamp();
        
        await member.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        // User has DMs closed, that's okay
      }
    }
    
    // Ban the user
    await message.guild.members.ban(userId, { reason: `${message.author.tag}: ${reason}` });
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setAuthor({ name: '🔨 USER BANNED', iconURL: user.displayAvatarURL() })
      .addFields(
        { name: '👤 USER', value: `${user.tag} (\`${userId}\`)`, inline: true },
        { name: '👮 MODERATOR', value: `${message.author}`, inline: true },
        { name: '📝 REASON', value: reason, inline: false }
      )
      .setFooter({ text: `User ID: ${userId}` })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Ban error:', error);
    message.reply({ 
      embeds: [createErrorEmbed('Cannot ban user. They may already be banned or I lack permissions.')] 
    });
  }
}

async function warnCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions to use this command.')] });
  }
  
  if (args.length < 2) {
    return message.reply({ 
      embeds: [createErrorEmbed(`Usage: ${PREFIX}warn <@user> <reason>`)] 
    });
  }
  
  const userId = extractId(args[0]);
  if (!userId) {
    return message.reply({ embeds: [createErrorEmbed('Please mention a valid user.')] });
  }
  
  try {
    const member = await message.guild.members.fetch(userId);
    const reason = args.slice(1).join(' ');
    
    // Add warning to database
    const warning = dataStore.addWarning(
      message.guild.id,
      member.id,
      message.author.id,
      reason
    );
    
    // Get user's current warnings
    const warnings = dataStore.getWarnings(message.guild.id, member.id);
    
    // DM the user
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setAuthor({ name: `⚠️ WARNING IN ${message.guild.name}`, iconURL: message.guild.iconURL() })
        .setDescription(`You have received a warning in **${message.guild.name}**`)
        .addFields(
          { name: '👮 MODERATOR', value: `${message.author.tag}`, inline: true },
          { name: '📝 REASON', value: reason, inline: true },
          { name: '⚠️ TOTAL WARNINGS', value: `${warnings.length}`, inline: true },
          { name: '🆔 WARNING ID', value: `\`${warning.id}\``, inline: false },
          { name: '⏱️ TIME', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: 'Please follow server rules to avoid further action' })
        .setTimestamp();
      
      await member.send({ embeds: [dmEmbed] });
    } catch (dmError) {
      // User has DMs closed, that's okay
    }
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setAuthor({ name: '⚠️ USER WARNED', iconURL: member.user.displayAvatarURL() })
      .addFields(
        { name: '👤 USER', value: `${member}`, inline: true },
        { name: '👮 MODERATOR', value: `${message.author}`, inline: true },
        { name: '📝 REASON', value: reason, inline: false },
        { name: '⚠️ TOTAL WARNINGS', value: `${warnings.length}`, inline: true },
        { name: '🆔 WARNING ID', value: `\`${warning.id}\``, inline: true }
      )
      .setFooter({ text: `User ID: ${member.id}` })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Warn error:', error);
    message.reply({ 
      embeds: [createErrorEmbed('User not found or an error occurred.')] 
    });
  }
}

async function warningsCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions to use this command.')] });
  }
  
  let targetUser = message.author;
  let targetMember = message.member;
  
  if (args.length > 0) {
    const userId = extractId(args[0]);
    if (userId) {
      try {
        targetUser = await client.users.fetch(userId);
        targetMember = await message.guild.members.fetch(userId).catch(() => null);
      } catch {
        return message.reply({ embeds: [createErrorEmbed('User not found!')] });
      }
    }
  }
  
  const warnings = dataStore.getWarnings(message.guild.id, targetUser.id);
  
  if (warnings.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '✅ NO WARNINGS', iconURL: targetUser.displayAvatarURL() })
      .setDescription(`**${targetUser.tag}** has no warnings.`)
      .setFooter({ text: 'Clean record!' })
      .setTimestamp();
    
    return message.reply({ embeds: [embed] });
  }
  
  let warningsText = '';
  warnings.forEach((warning, index) => {
    warningsText += `**#${index + 1}** - <t:${Math.floor(warning.date / 1000)}:R>\n`;
    warningsText += `**Moderator:** <@${warning.moderator}>\n`;
    warningsText += `**Reason:** ${warning.reason}\n`;
    warningsText += `**ID:** \`${warning.id}\`\n\n`;
  });
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setAuthor({ name: `⚠️ WARNINGS - ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL() })
    .setDescription(`**Total Warnings:** ${warnings.length}\n\n${warningsText}`)
    .setFooter({ text: `User ID: ${targetUser.id}` })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

async function clearwarnCommand(message, args) {
  if (!isMod(message.member)) {
    return message.reply({ embeds: [createErrorEmbed('You need moderation permissions to use this command.')] });
  }
  
  if (args.length < 1) {
    return message.reply({ 
      embeds: [createErrorEmbed(`Usage: ${PREFIX}clearwarn <@user>`)] 
    });
  }
  
  const userId = extractId(args[0]);
  if (!userId) {
    return message.reply({ embeds: [createErrorEmbed('Please mention a valid user.')] });
  }
  
  try {
    const member = await message.guild.members.fetch(userId);
    const cleared = dataStore.clearWarnings(message.guild.id, member.id);
    
    if (!cleared) {
      return message.reply({ 
        embeds: [createErrorEmbed('No warnings found for this user.')] 
      });
    }
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: '✅ WARNINGS CLEARED', iconURL: member.user.displayAvatarURL() })
      .setDescription(`All warnings have been cleared for **${member.user.tag}**.`)
      .addFields(
        { name: '👤 USER', value: `${member}`, inline: true },
        { name: '👮 MODERATOR', value: `${message.author}`, inline: true }
      )
      .setFooter({ text: 'Clean slate!' })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Clearwarn error:', error);
    message.reply({ 
      embeds: [createErrorEmbed('User not found or an error occurred.')] 
    });
  }
}

// ==================== EVENT HANDLERS ====================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  try {
    // Track message for snipe
    if (message.content && message.content.trim().length > 0) {
      dataStore.addDeletedMessage(message.channel.id, message);
    }
    
    // Add XP for message (with cooldown)
    if (message.guild) {
      const cooldownKey = `msg_xp_${message.author.id}`;
      const now = Date.now();
      
      if (!messageXPcooldown.has(cooldownKey) || 
          now - messageXPcooldown.get(cooldownKey) >= XP_CONFIG.COOLDOWN_PER_MESSAGE * 1000) {
        
        // Small chance to give XP per message
        if (Math.random() < 0.3) {
          addXP(message.author.id, message.guild.id, XP_CONFIG.PER_MESSAGE, 'message');
          dataStore.incrementMessageCount(message.guild.id, message.author.id);
        }
        
        messageXPcooldown.set(cooldownKey, now);
      }
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
      case 'botinfo': await botinfoCommand(message); break;
      
      // Games
      case 'flag': await flagGameCommand(message, args); break;
      case 'animal': await animalGameCommand(message, args); break;
      case 'hangman': await hangmanCommand(message, args); break;
      case 'trivia': await triviaGameCommand(message, args); break;
      case 'rps': await rpsGameCommand(message, args); break;
      case 'number': await numberGameCommand(message, args); break;
      case 'wordchain': await wordchainCommand(message, args); break;
      
      // XP System
      case 'rank': await rankCommand(message, args); break;
      case 'leaderboard': 
      case 'lb': await leaderboardCommand(message, args); break;
      case 'daily': await dailyCommand(message); break;
      case 'xp': 
      case 'xpinfo': await xpInfoCommand(message); break;
      case 'stats': await statsCommand(message, args); break;
      
      // User Info
      case 'ui': 
      case 'userinfo': await userInfoCommand(message, args); break;
      case 'avatar': await avatarCommand(message, args); break;
      case 'serverinfo': await serverinfoCommand(message); break;
      
      // Utility
      case 'calc': await calcCommand(message, args); break;
      case 'weather': await weatherCommand(message, args); break;
      case 'translate': await translateCommand(message, args); break;
      case 'remind': await remindCommand(message, args); break;
      
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
      case 'warnings': await warningsCommand(message, args); break;
      case 'clearwarn': await clearwarnCommand(message, args); break;
      
      // Placeholders for other commands
      case 'bal': 
      case 'txid': 
      case 'convert': 
      case 'poll': 
      case 'banner': 
      case 'rep': 
      case 'getrep': 
      case 'msgcount': 
      case 'vouch': 
      case 'evouch': 
      case 'unban': 
      case 'mute': 
      case 'unmute': 
      case 'timeout': 
      case 'addrole': 
      case 'removerole': 
      case 'changenick': 
      case 'rr': 
      case 'r': 
      case 'addar': 
      case 'delar': 
      case 'listar': 
      case 'verify': 
      case 'unverify': 
      case 'verifypanel': 
      case 'lock': 
      case 'unlock': 
      case 'slowmode': 
      case 'nuke': 
      case 'ticket': 
      case 'close': 
      case 'automod': 
      case 'blacklist': 
      case 'snipe': 
      case 'editlogs': 
      case 'userlogs': 
        await message.reply({ 
          embeds: [
            createInfoEmbed('🚧 UNDER DEVELOPMENT', 
              `The \`${PREFIX}${command}\` command is currently under development.\n\n` +
              `**Coming soon in future updates!**\n` +
              `Check \`${PREFIX}help\` for available commands.`
            )
          ] 
        });
        break;
      
      default:
        await message.reply({ 
          embeds: [createErrorEmbed(`Command \`${command}\` not found!\n\nUse \`${PREFIX}help\` to see all available commands.`)] 
        });
        break;
    }
    
  } catch (error) {
    console.error('Command error:', error);
    message.reply({ 
      embeds: [createErrorEmbed('An error occurred while processing your command. Please try again.')] 
    });
  }
});

// Handle deleted messages for snipe
client.on('messageDelete', async (message) => {
  if (message.author?.bot || !message.content || message.content.trim().length === 0) return;
  
  dataStore.addDeletedMessage(message.channel.id, message);
});

// ==================== BOT STARTUP ====================
client.on('ready', () => {
  console.log('='.repeat(60));
  console.log(`✅ BOT IS ONLINE!`);
  console.log(`🤖 Logged in as: ${client.user.tag}`);
  console.log(`🆔 Bot ID: ${client.user.id}`);
  console.log(`📅 Created: ${new Date(client.user.createdTimestamp).toLocaleDateString()}`);
  console.log('='.repeat(60));
  console.log(`📊 SERVERS: ${client.guilds.cache.size.toLocaleString()}`);
  console.log(`👥 USERS: ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toLocaleString()}`);
  console.log(`📁 CHANNELS: ${client.guilds.cache.reduce((a, g) => a + g.channels.cache.size, 0).toLocaleString()}`);
  console.log('='.repeat(60));
  console.log(`🎮 GAMES SYSTEM: READY`);
  console.log(`• Flag Game: ${Object.values(COUNTRIES).reduce((a, b) => a + b.length, 0)} countries`);
  console.log(`• Animal Game: ${Object.values(ANIMALS).reduce((a, b) => a + b.length, 0)} animals`);
  console.log(`• Hangman: ${Object.values(HANGMAN_WORDS).reduce((a, b) => a + b.length, 0)} words`);
  console.log(`• Trivia: ${Object.values(TRIVIA_QUESTIONS).reduce((a, b) => a + b.length, 0)} questions`);
  console.log('='.repeat(60));
  console.log(`📊 XP SYSTEM: EXTREME HARD MODE`);
  console.log(`• Max Level: ${XP_CONFIG.MAX_LEVEL}`);
  console.log(`• Level Formula: ${XP_CONFIG.LEVEL_MULTIPLIER} × Level^${XP_CONFIG.LEVEL_EXPONENT}`);
  console.log(`• Daily Bonus: ${XP_CONFIG.DAILY_BONUS} XP`);
  console.log(`• Game Win: ${XP_CONFIG.PER_GAME_WIN} XP`);
  console.log('='.repeat(60));
  console.log(`⚡ COMMANDS: ${Object.values(ALL_COMMANDS).reduce((a, b) => a + b.length, 0)}+`);
  console.log(`🎯 PREFIX: ${PREFIX}`);
  console.log(`🕒 STARTUP TIME: ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(60));
  
  // Set bot activity
  const activities = [
    `${PREFIX}help | ${client.guilds.cache.size} servers`,
    'PUBLIC Games | Anyone can join!',
    'Extreme Hard XP System',
    'Flag Game with 5 options',
    'Multiple Game Categories'
  ];
  
  let activityIndex = 0;
  
  client.user.setPresence({
    activities: [{
      name: activities[0],
      type: ActivityType.Playing
    }],
    status: 'online'
  });
  
  // Rotate activities every 30 seconds
  setInterval(() => {
    activityIndex = (activityIndex + 1) % activities.length;
    client.user.setActivity({
      name: activities[activityIndex],
      type: ActivityType.Playing
    });
  }, 30000);
  
  // Auto-save data every 3 minutes
  setInterval(() => {
    dataStore.saveData();
    console.log(`💾 Data saved at ${new Date().toLocaleTimeString()}`);
  }, 3 * 60 * 1000);
  
  // Clear old cooldowns every hour
  setInterval(() => {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    // Clean message XP cooldowns
    for (const [key, time] of messageXPcooldown.entries()) {
      if (time < hourAgo) {
        messageXPcooldown.delete(key);
      }
    }
    
    // Clean game cooldowns
    for (const [key, time] of cooldowns.entries()) {
      if (time < hourAgo) {
        cooldowns.delete(key);
      }
    }
  }, 60 * 60 * 1000);
});

// ==================== BOT LOGIN ====================
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ ERROR: DISCORD_BOT_TOKEN environment variable is not set!');
  console.error('💡 Railway Setup:');
  console.error('1. Go to Railway dashboard');
  console.error('2. Select your project');
  console.error('3. Go to Variables tab');
  console.error('4. Add new variable:');
  console.error('   Key: DISCORD_BOT_TOKEN');
  console.error('   Value: Your Discord bot token');
  console.error('5. Redeploy the project');
  process.exit(1);
}

client.login(BOT_TOKEN)
  .then(() => {
    console.log('🔑 Bot logged in successfully!');
    console.log('🚀 Bot is now ready to use!');
  })
  .catch((error) => {
    console.error('❌ Failed to login:', error.message);
    console.error('💡 Possible issues:');
    console.error('1. Invalid bot token');
    console.error('2. Bot permissions');
    console.error('3. Network issues');
    console.error('4. Discord API issues');
    process.exit(1);
  });

// Export for testing
module.exports = { client, dataStore, activeGames };
