/**
 * @fileOverview A Discord Bot written in JavaScript!
 * @author Ak Yair Lin Cortek (northbrigdewon.dev) + Gemini (gemini.google.com)
 * @version 1.0.0
 * @license MIT
 *
 * This script provides utility function.
 *
 * For the full license text, please see the LICENSE.md file
 * or visit https://opensource.org/licenses/MIT
 */

(function() {
    'use strict';

// This file is now the conductor of our bot orchestra!
const fs = require('node:fs'); 
const path = require('node:path'); 
const { Client, GatewayIntentBits, Events, Collection, PermissionsBitField } = require('discord.js'); // Added PermissionsBitField

// Load configuration
let config;
try {
    const configPath = path.join(__dirname, 'config.json');
    config = require(configPath); 
} catch (error) {
    console.error("💀 Whoopsie! config.json is missing or malformed");
    console.error("Please create a config.json file in the root directory with your BOT_TOKEN.");
    console.error("You can copy config.example.json to config.json and fill in your details.");
    process.exit(1); 
}

const token = config.BOT_TOKEN;

if (!token) {
    console.error("💔 Major heartbreak! The BOT_TOKEN is missing from your config.json. Can't start without it");
    process.exit(1);
}

// Create a new Client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers // Required for some moderation actions like fetching members
    ]
});

// Storing our commands
client.commands = new Collection();

// Dynamically load command files
const commandsPath = path.join(__dirname, 'commands'); 
try {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js')); 

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath); 

        if ('name' in command && 'execute' in command) {
            client.commands.set(command.name, command);
            console.log(`✅ Command loaded: ${command.name} from ${file}`);
        } else {
            console.warn(`[WARNING] The command at ${filePath} is missing a required "name" or "execute" property. Skippin' it!`);
        }
    }
} catch (error) {
    console.error(`🚫 Oh noes! Could not read the commands directory at ${commandsPath}:`, error);
    console.error("Make sure you have a 'commands' folder with your command files in it.");
}


// ClientReady event
client.once(Events.ClientReady, readyClient => {
    console.log(`🚀 Logged in as ${readyClient.user.tag}! The modular bot with moderation is ready!`);
    readyClient.user.setActivity("enforcing peace and order");
});

// MessageCreate event
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return; 
    if (!message.guild) return; // Commands are guild-specific

    const prefix = config.PREFIX || "!"; 

    if (!message.content.startsWith(prefix)) return; 

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) {
        console.log(`Command not found: ${commandName}`);
        return;
    }

    // Check for command permissions (if defined in the command file)
    if (command.permissions) {
        if (!message.member.permissions.has(command.permissions)) {
            return message.reply("🚫 你没有权限使用此命令，亲爱的。(You don't have permission to use this command, dear.)").catch(console.error);
        }
        // Also check if the bot has the necessary permissions
        if (!message.guild.members.me.permissions.has(command.permissions)) {
             return message.reply("😥 我没有足够的权限来执行此操作。(I don't have enough permissions to perform this action.)").catch(console.error);
        }
    }
    

    try {
        await command.execute(message, args, client, config); 
        console.log(`Executed command '${command.name}' for ${message.author.tag} in server ${message.guild.name}`);
    } catch (error) {
        console.error(`💥 Error executing command '${command.name}':`, error);
        await message.reply('Yikes! There was an error trying to execute that command, my dear. My circuits are frazzled! 😵‍💫').catch(console.error);
    }
});

// Log in to Discord
client.login(token)
    .catch(error => {
        console.error("💀 Catastrophic failure to login! Double-check that BOT_TOKEN in config.json, love.", error);
    });

// Enhanced error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

console.log("尝试启动机器人... (Attempting to start the bot...)");

})(); 

/**
 * @license
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */