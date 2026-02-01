# Discord Bot - The Only Bot You Need

## Overview
A feature-rich Discord bot built with discord.js with 40+ commands including crypto utilities, translations, currency conversion, reaction roles, verification, moderation, fun commands, and more. Supports both prefix (=) and slash (/) commands.

## Recent Changes
- November 27, 2025: Added 20+ new commands (moderation, fun, utility, weather)
- November 27, 2025: Added full slash command (/) support
- November 27, 2025: Added admin commands (reaction roles, verification, message count)
- November 27, 2025: Professional UI upgrade with emojis and better embeds

## Project Architecture
- **index.js**: Entry point that initializes the bot
- **src/bot.js**: Main bot logic with all command handlers
- **src/data.js**: Data persistence for reaction roles, verification, message counts
- **data.json**: Stored data (auto-generated)
- **Prefix**: `=`
- **Dependencies**: discord.js, axios, mathjs

## All Commands (40+)
**Prefix: `=` or `/`**

### Crypto & Finance
| Command | Description |
|---------|-------------|
| `=bal` | Check crypto wallet balance (BTC, LTC, ETH, SOL) |
| `=txid` | View crypto transaction details |
| `=convert` | Convert currencies |
| `=vouch` | Generate a deal vouch |
| `=evouch` | Generate an exchange vouch |

### Utilities
| Command | Description |
|---------|-------------|
| `=calc` | Calculate mathematical expressions |
| `=remind` | Set a reminder |
| `=translate` | Translate text to other languages |
| `=weather` | Get weather for any city |
| `=poll` | Create a yes/no poll |

### User & Server Info
| Command | Description |
|---------|-------------|
| `=ui` / `/info` | View user information |
| `=avatar` / `/avatar` | Get user avatar |
| `=banner` | Get user banner |
| `=serverinfo` | View server information |
| `=botinfo` | View bot information & uptime |
| `=ping` | Check bot latency |
| `=rep` | Give someone reputation |
| `=getrep` | Check reputation points |

### Fun Commands
| Command | Description |
|---------|-------------|
| `=8ball` | Magic 8 Ball fortune |
| `=dice` | Roll dice (e.g., =dice 2d6) |
| `=coin` | Flip a coin |
| `=joke` | Get random advice/joke |
| `=quote` | Get random quote |

### Moderation (Admin Only)
| Command | Description |
|---------|-------------|
| `=warn <user> <reason>` | Warn a user |
| `=warnings <user>` | Check user warnings |
| `=clearwarn <user>` | Clear all warnings |
| `=kick <user> <reason>` | Kick a user |
| `=ban <user> <reason>` | Ban a user |
| `=unban <userid>` | Unban a user |
| `=mute <user> <minutes>` | Mute a user |
| `=unmute <user>` | Unmute a user |
| `=clear <number>` | Delete messages |

## Admin Commands (Requires Admin Permission)
| Command | Description |
|---------|-------------|
| `=rr <name> <roleId>` | Setup a reaction role |
| `=r <name>` | Deploy a reaction role panel |
| `=addar <name> <roleId> <emoji>` | Add role to existing reaction role |
| `=delar <name> <roleId>` | Remove role from reaction role |
| `=listar` | List all reaction roles |
| `=verify <user>` | Manually verify a user |
| `=unverify <user>` | Remove verification from user |
| `=verifypanel [roleId]` | Send the verification panel |
| `=msgcount` | Get the total message count |

## Environment Variables
- `DISCORD_BOT_TOKEN`: Your Discord bot token (required)

## Structure
```
/
├── index.js          # Bot entry point
├── src/
│   ├── bot.js        # Command handlers
│   └── data.js       # Data persistence
├── data.json         # Stored data (auto-generated)
├── package.json      # Dependencies
└── .gitignore        # Git ignore rules
```
