const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data.json');

const defaultData = {
  reactionRoles: {},
  verifiedUsers: {},
  messageCounts: {},
  verifyRole: null,
  warnings: {},
  reputation: {},
  vouches: [],
  uptime: Date.now()
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return { ...defaultData, ...JSON.parse(raw) };
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return { ...defaultData };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

let data = loadData();

module.exports = {
  getData: () => data,
  saveData: () => saveData(data),
  
  getReactionRoles: () => data.reactionRoles,
  setReactionRole: (name, config) => {
    data.reactionRoles[name.toLowerCase()] = config;
    saveData(data);
  },
  deleteReactionRole: (name) => {
    delete data.reactionRoles[name.toLowerCase()];
    saveData(data);
  },
  
  getVerifiedUsers: (guildId) => data.verifiedUsers[guildId] || [],
  addVerifiedUser: (guildId, userId) => {
    if (!data.verifiedUsers[guildId]) data.verifiedUsers[guildId] = [];
    if (!data.verifiedUsers[guildId].includes(userId)) {
      data.verifiedUsers[guildId].push(userId);
      saveData(data);
    }
  },
  removeVerifiedUser: (guildId, userId) => {
    if (data.verifiedUsers[guildId]) {
      data.verifiedUsers[guildId] = data.verifiedUsers[guildId].filter(id => id !== userId);
      saveData(data);
    }
  },
  isVerified: (guildId, userId) => {
    return data.verifiedUsers[guildId]?.includes(userId) || false;
  },
  
  getVerifyRole: (guildId) => data.verifyRole?.[guildId],
  setVerifyRole: (guildId, roleId) => {
    if (!data.verifyRole) data.verifyRole = {};
    data.verifyRole[guildId] = roleId;
    saveData(data);
  },
  
  getMessageCount: (guildId) => data.messageCounts[guildId] || 0,
  incrementMessageCount: (guildId) => {
    if (!data.messageCounts[guildId]) data.messageCounts[guildId] = 0;
    data.messageCounts[guildId]++;
    if (data.messageCounts[guildId] % 10 === 0) {
      saveData(data);
    }
  },
  getAllMessageCounts: () => data.messageCounts,
  
  addWarning: (guildId, userId, reason) => {
    if (!data.warnings[guildId]) data.warnings[guildId] = {};
    if (!data.warnings[guildId][userId]) data.warnings[guildId][userId] = [];
    data.warnings[guildId][userId].push({ reason, date: new Date().toISOString() });
    saveData(data);
  },
  getWarnings: (guildId, userId) => data.warnings[guildId]?.[userId] || [],
  clearWarnings: (guildId, userId) => {
    if (data.warnings[guildId]) delete data.warnings[guildId][userId];
    saveData(data);
  },
  
  addReputation: (userId, amount) => {
    if (!data.reputation[userId]) data.reputation[userId] = 0;
    data.reputation[userId] += amount;
    saveData(data);
  },
  getReputation: (userId) => data.reputation[userId] || 0,
  
  addVouch: (vouchData) => {
    if (!data.vouches) data.vouches = [];
    data.vouches.push(vouchData);
    saveData(data);
  },
  getVouches: () => data.vouches || [],
  
  getUptime: () => data.uptime,
  forceSave: () => saveData(data)
};
