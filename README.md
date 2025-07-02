# Cloudy - A Modular Discord Bot

Cloudy is a feature-rich, modular Discord bot designed to enhance your server with a wide array of functionalities, from moderation and community engagement to fun economy systems and utility features. Built with `discord.js`, Cloudy aims to provide a robust and customizable experience for server administrators and members alike.

## Features

Cloudy comes packed with the following features:

### Moderation & Automation
- **Bad Word Filter:** Automatically detects and deletes messages containing forbidden words, with configurable logging to a moderation channel.
- **Temporary Bans:** Manages temporary bans with automatic unbanning after a set duration.
- **Auto-Moderation:**
    - **Anti-Spam:** Prevents users from sending too many messages in a short period.
    - **Anti-Mention:** Limits the number of mentions in a single message to prevent mass pings.
    - **Anti-Caps:** Detects and deletes messages with excessive capitalization.
- **Audit Log Integration:** Logs important server events (channel creation/deletion, role creation/deletion) to a designated audit log channel.

### Community & Engagement
- **Leveling System:** Awards XP for messages sent and time spent in voice channels, allowing users to level up.
- **Reaction Roles:** Assigns or removes roles based on user reactions to specific messages.
- **Anonymous Confessions:** Allows users to send anonymous messages to a designated confessions channel.
- **Starboard:** Highlights popular messages by reposting them to a dedicated channel when they receive a configurable number of reactions (e.g., ⭐).

### Economy & Game Features
- **Server Economy:** Introduces a virtual currency (default: "Shekels") that users can earn through activity.
    - `/balance`: Check your current currency balance.
    - `/daily`: Claim a daily currency bonus.
    - `/shop`: View items available for purchase.
    - `/buy <item>`: Purchase an item from the shop.
    - `/additem <name> <price> <role>`: (Admin) Add a role to the shop for purchase.
    - `/removeitem <name>`: (Admin) Remove an item from the shop.

### Utility
- **Custom Commands:** Create custom text commands with predefined responses.
- **Temporary Voice Channels:** Users can join a designated "Join to Create" channel to automatically generate a private voice channel that disappears when empty.

## Installation

To get Cloudy up and running on your server, follow these steps:

### Prerequisites
- Node.js (v16.x or higher recommended)
- npm (Node Package Manager)

### Setup
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/Cloudy.git
    cd Cloudy
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure `config.json`:**
    Copy `config.example.json` to `config.json` and fill in your bot's token, client ID, guild ID, and other desired settings. Make sure to set up the channel IDs for features like moderation logs, welcome/farewell messages, confessions, starboard, and temporary voice channels.
    ```json
    {
        "BOT_TOKEN": "YOUR_BOT_TOKEN",
        "CLIENT_ID": "YOUR_BOT_CLIENT_ID",
        "GUILD_ID": "YOUR_SERVER_ID",
        "PREFIX": ";",
        "MOD_LOG_CHANNEL_ID": "",
        "WELCOME_CHANNEL_ID": "",
        "FAREWELL_CHANNEL_ID": "",
        "AUDIT_LOG_CHANNEL_ID": "",
        "CONFESSIONS_CHANNEL_ID": "",
        "autoModeration": {
            "antiSpam": {
                "enabled": true,
                "messageLimit": 5,
                "timeInterval": 10000
            },
            "antiMention": {
                "enabled": true,
                "mentionLimit": 5
            },
            "antiCaps": {
                "enabled": true,
                "capsLimit": 0.7
            }
        },
        "temporaryVoiceChannels": {
            "enabled": true,
            "creatorChannelId": "",
            "categoryId": "",
            "channelNamePrefix": "🔊 | "
        },
        "starboard": {
            "enabled": true,
            "channelId": "",
            "emoji": "⭐",
            "requiredStars": 5
        },
        "economy": {
            "enabled": true,
            "currencyName": "Shekels",
            "dailyAmount": 100
        }
    }
    ```
4.  **Run the bot:**
    ```bash
    npm start
    ```

## Usage

Once the bot is running and configured, you can interact with it using slash commands (`/`) and other automated features. Refer to the command list within Discord for specific command usage.

## File Structure

- `index.js`: The main entry point of the bot, handling events and core logic.
- `commands/`: Contains individual command files.
- `config.json`: Bot configuration settings.
- `badwords.json`: Stores the list of forbidden words for the filter.
- `customcommands.json`: Stores custom text commands.
- `giveaways.json`: Stores active giveaway data.
- `levels.json`: Stores user leveling data (XP and levels).
- `reactionroles.json`: Stores reaction role configurations.
- `tempbans.json`: Stores temporary ban data.
- `tickets.json`: Stores ticket system data.
- `warnings.json`: Stores user warning data.
- `economy.json`: Stores user economy data (balances, last daily claim).
- `shop.json`: Stores shop items for the economy system.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License - see the `LICENSE.md` file for details.