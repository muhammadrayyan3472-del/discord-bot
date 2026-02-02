// data.js
const fs = require('fs');
const path = require('path');

class DataStore {
  constructor() {
    this.dataPath = path.join(__dirname, 'data.json');
    this.data = this.loadData();
    this.uptimeStart = Date.now();
  }

  loadData() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const rawData = fs.readFileSync(this.dataPath, 'utf8');
        return JSON.parse(rawData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    return {
      guilds: {},
      users: {},
      reactionRoles: {},
      warnings: {},
      verifiedUsers: {},
      messageCounts: {},
      xpData: {},
      dailyCooldowns: {},
      tickets: {},
      autoMod: {},
      blacklist: {},
      logs: {}
    };
  }

  saveData() {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  // Message Count
  incrementMessageCount(guildId) {
    if (!this.data.messageCounts[guildId]) {
      this.data.messageCounts[guildId] = 0;
    }
    this.data.messageCounts[guildId]++;
    this.saveData();
  }

  getMessageCount(guildId) {
    return this.data.messageCounts[guildId] || 0;
  }

  // Reaction Roles
  setReactionRole(name, config) {
    this.data.reactionRoles[name] = config;
    this.saveData();
  }

  getReactionRoles() {
    return this.data.reactionRoles || {};
  }

  deleteReactionRole(name) {
    delete this.data.reactionRoles[name];
    this.saveData();
  }

  // Verification
  addVerifiedUser(guildId, userId) {
    if (!this.data.verifiedUsers[guildId]) {
      this.data.verifiedUsers[guildId] = [];
    }
    if (!this.data.verifiedUsers[guildId].includes(userId)) {
      this.data.verifiedUsers[guildId].push(userId);
    }
    this.saveData();
  }

  removeVerifiedUser(guildId, userId) {
    if (this.data.verifiedUsers[guildId]) {
      this.data.verifiedUsers[guildId] = this.data.verifiedUsers[guildId].filter(id => id !== userId);
    }
    this.saveData();
  }

  isVerified(guildId, userId) {
    return this.data.verifiedUsers[guildId]?.includes(userId) || false;
  }

  setVerifyRole(guildId, roleId) {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = {};
    }
    this.data.guilds[guildId].verifyRole = roleId;
    this.saveData();
  }

  getVerifyRole(guildId) {
    return this.data.guilds[guildId]?.verifyRole || null;
  }

  // Warnings
  addWarning(guildId, userId, reason) {
    if (!this.data.warnings[guildId]) {
      this.data.warnings[guildId] = {};
    }
    if (!this.data.warnings[guildId][userId]) {
      this.data.warnings[guildId][userId] = [];
    }
    this.data.warnings[guildId][userId].push({
      reason,
      timestamp: Date.now(),
      moderator: 'System'
    });
    this.saveData();
  }

  getWarnings(guildId, userId) {
    return this.data.warnings[guildId]?.[userId] || [];
  }

  clearWarnings(guildId, userId) {
    if (this.data.warnings[guildId]) {
      delete this.data.warnings[guildId][userId];
    }
    this.saveData();
  }

  // Reputation
  addReputation(userId, amount = 1) {
    if (!this.data.users[userId]) {
      this.data.users[userId] = { reputation: 0 };
    }
    this.data.users[userId].reputation = (this.data.users[userId].reputation || 0) + amount;
    this.saveData();
    return this.data.users[userId].reputation;
  }

  getReputation(userId) {
    return this.data.users[userId]?.reputation || 0;
  }

  // XP System
  setUserXP(guildId, userId, xpData) {
    if (!this.data.xpData[guildId]) {
      this.data.xpData[guildId] = {};
    }
    this.data.xpData[guildId][userId] = xpData;
    this.saveData();
  }

  getUserXP(guildId, userId) {
    return this.data.xpData[guildId]?.[userId] || null;
  }

  getAllXP(guildId) {
    return this.data.xpData[guildId] || {};
  }

  // Daily Cooldown
  setDailyCooldown(userId, guildId) {
    if (!this.data.dailyCooldowns[guildId]) {
      this.data.dailyCooldowns[guildId] = {};
    }
    this.data.dailyCooldowns[guildId][userId] = Date.now();
    this.saveData();
  }

  getDailyCooldown(userId, guildId) {
    return this.data.dailyCooldowns[guildId]?.[userId] || 0;
  }

  // Uptime
  getUptime() {
    return this.uptimeStart;
  }
}

module.exports = new DataStore();
