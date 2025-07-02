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
const { Client, GatewayIntentBits, Events, Collection, PermissionsBitField, EmbedBuilder } = require('discord.js'); // Added PermissionsBitField

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
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent, // Required for bad word filter and leveling system
        GatewayIntentBits.GuildVoiceStates // Required for music commands to detect user voice channels
    ]
});

// Storing our commands
client.commands = new Collection();

// Storing music queues
client.queue = new Map();

// Dynamically load command files
const commandsPath = path.join(__dirname, 'commands'); 
try {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js')); 

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath); 

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Command loaded: ${command.data.name} from ${file}`);
        } else {
            console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property. Skippin' it!`);
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

    // Start checking for expired tempbans
    setInterval(async () => {
        const tempBansPath = path.join(__dirname, 'tempbans.json');
        let tempBans = [];
        try {
            const data = fs.readFileSync(tempBansPath, 'utf8');
            tempBans = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading tempbans.json for unban check:', readError);
            return;
        }

        const now = Date.now();
        const updatedTempBans = [];
        let unbannedCount = 0;

        for (const ban of tempBans) {
            if (ban.unbanTime <= now) {
                try {
                    const guild = await client.guilds.fetch(ban.guildId);
                    if (guild) {
                        const bannedUser = await guild.bans.fetch(ban.userId);
                        if (bannedUser) {
                            await guild.members.unban(ban.userId, 'Temporary ban expired');
                            console.log(`Automatically unbanned ${bannedUser.user.tag} from ${guild.name}.`);
                            unbannedCount++;

                            // Send log to moderation channel
                            if (config.MOD_LOG_CHANNEL_ID) {
                                const logChannel = guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                                if (logChannel) {
                                    const logEmbed = new EmbedBuilder()
                                        .setColor('#00FF00')
                                        .setTitle('✅ Member Unbanned (自动日志)')
                                        .setDescription(`${bannedUser.user.tag} has been automatically unbanned.`)
                                        .addFields(
                                            { name: 'Unbanned User (被解除封禁用户)', value: `${bannedUser.user.tag} (${bannedUser.user.id})`, inline: true },
                                            { name: 'Reason (理由)', value: 'Temporary ban expired' }
                                        )
                                        .setTimestamp()
                                        .setFooter({ text: `User ID: ${bannedUser.user.id}` });
                                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error during automatic unban for user ${ban.userId} in guild ${ban.guildId}:`, error);
                }
            } else {
                updatedTempBans.push(ban);
            }
        }

        if (unbannedCount > 0) {
            fs.writeFileSync(tempBansPath, JSON.stringify(updatedTempBans, null, 2), 'utf8');
        }
    }, 60 * 1000); // Check every 1 minute

    // Start checking for ended giveaways
    setInterval(async () => {
        const giveawaysPath = path.join(__dirname, 'giveaways.json');
        let giveaways = [];
        try {
            const data = fs.readFileSync(giveawaysPath, 'utf8');
            giveaways = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading giveaways.json for giveaway check:', readError);
            return;
        }

        const now = Date.now();
        const updatedGiveaways = [];
        for (const giveaway of giveaways) {
            if (giveaway.status === 'active' && giveaway.endTime <= now) {
                try {
                    const guild = await client.guilds.fetch(giveaway.guildId);
                    const channel = guild.channels.cache.get(giveaway.channelId);
                    const message = await channel.messages.fetch(giveaway.messageId);
                    const reaction = message.reactions.cache.get('🎉');
                    if (!reaction) {
                        console.warn(`Giveaway message ${giveaway.messageId} has no 🎉 reaction.`);
                        continue; // Skip to next giveaway, effectively removing it
                    }
                    const users = await reaction.users.fetch();
                    const participants = users.filter(user => !user.bot).map(user => user);
                    if (participants.length === 0) {
                        const noWinnerEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('🎉 GIVEAWAY ENDED! 🎉')
                            .setDescription(`**${giveaway.prize}**\n\n没有参与者，所以没有赢家。(No participants, so no winner.)`)
                            .setTimestamp();
                        await channel.send({ embeds: [noWinnerEmbed] });
                        continue; // Skip to next giveaway, effectively removing it
                    }
                    const winners = [];
                    for (let i = 0; i < giveaway.winnerCount; i++) {
                        if (participants.length === 0) break;
                        const randomIndex = Math.floor(Math.random() * participants.length);
                        winners.push(participants.splice(randomIndex, 1)[0]);
                    }
                    const winnerMentions = winners.map(winner => `<@${winner.id}>`).join(', ');
                    const winnerEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🎉 GIVEAWAY ENDED! 🎉')
                        .setDescription(`恭喜 ${winnerMentions}！你赢得了 **${giveaway.prize}**！\n(Congratulations ${winnerMentions}! You won the **${giveaway.prize}**!)\n\n[前往抽奖消息](<${message.url}>)`)
                        .setTimestamp();
                    await channel.send({ embeds: [winnerEmbed] });
                    // Giveaway is now complete and announced, so it should be removed from the list
                    // Do NOT push to updatedGiveaways
                } catch (error) {
                    console.error(`Error ending giveaway ${giveaway.messageId}:`, error);
                    // If there's an error, it's still considered processed and should be removed
                    // Do NOT push to updatedGiveaways
                }
            } else {
                // If the giveaway is not active or not yet ended, keep it in the list
                updatedGiveaways.push(giveaway);
            }
        }
        if (giveaways.length !== updatedGiveaways.length) {
            fs.writeFileSync(giveawaysPath, JSON.stringify(updatedGiveaways, null, 2), 'utf8');
        }
    }, 30 * 1000); // Check every 30 seconds

    setInterval(() => {
        fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2), 'utf8');
    }, 30 * 1000); // Save levels every 30 seconds

    client.on(Events.GuildMemberAdd, async member => {
        if (config.WELCOME_CHANNEL_ID) {
            const channel = member.guild.channels.cache.get(config.WELCOME_CHANNEL_ID);
            if (channel) {
                channel.send(`欢迎 ${member} 加入 ${member.guild.name}！(Welcome ${member} to ${member.guild.name}!)`);
            }
        }
    });

    client.on(Events.GuildMemberRemove, async member => {
        if (config.FAREWELL_CHANNEL_ID) {
            const channel = member.guild.channels.cache.get(config.FAREWELL_CHANNEL_ID);
            if (channel) {
                channel.send(`${member.user.tag} 离开了服务器。( ${member.user.tag} has left the server.)`);
            }
        }
    });
});


let customCommands = [];
try {
    const customCommandsPath = path.join(__dirname, 'customcommands.json');
    const data = fs.readFileSync(customCommandsPath, 'utf8');
    customCommands = JSON.parse(data);
} catch (readError) {
    console.error('Error reading customcommands.json on startup:', readError);
}

const levelsPath = path.join(__dirname, 'levels.json');
let levels = {};
try {
    const data = fs.readFileSync(levelsPath, 'utf8');
    levels = JSON.parse(data);
} catch (readError) {
    console.error('Error reading levels.json on startup:', readError);
    if (readError.code === 'ENOENT') {
        fs.writeFileSync(levelsPath, JSON.stringify({}, null, 2));
    }
}

const badwordsPath = path.join(__dirname, 'badwords.json');
let badwords = [];
try {
    const data = fs.readFileSync(badwordsPath, 'utf8');
    badwords = JSON.parse(data);
} catch (readError) {
    console.error('Error reading badwords.json on startup:', readError);
    if (readError.code === 'ENOENT') {
        fs.writeFileSync(badwordsPath, JSON.stringify([], null, 2));
    }
}

const reactionRolesPath = path.join(__dirname, 'reactionroles.json');
let reactionRoles = [];
try {
    const data = fs.readFileSync(reactionRolesPath, 'utf8');
    reactionRoles = JSON.parse(data);
} catch (readError) {
    console.error('Error reading reactionroles.json on startup:', readError);
    if (readError.code === 'ENOENT') {
        fs.writeFileSync(reactionRolesPath, JSON.stringify([], null, 2));
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // Handle custom commands first
    const customCommand = customCommands.find(cmd => cmd.name === interaction.commandName);
    if (customCommand) {
        try {
            await interaction.reply({ content: customCommand.response });
        } catch (error) {
            console.error(`Error executing custom command '${interaction.commandName}':`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '执行自定义命令时发生错误。(An error occurred while executing the custom command!)', ephemeral: true });
            } else {
                await interaction.reply({ content: '执行自定义命令时发生错误。(An error occurred while executing the custom command!)', ephemeral: true });
            }
        }
        return; // Stop further processing if it's a custom command
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction, config);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: 'There was an error while executing this command!',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: 'There was an error while executing this command!',
                ephemeral: true
            });
        }
    }
});
client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the reaction:', error);
            return;
        }
    }

    const matchedReactionRole = reactionRoles.find(rr =>
        rr.messageId === reaction.message.id &&
        (rr.emoji === reaction.emoji.name || rr.emoji === reaction.emoji.id)
    );

    if (matchedReactionRole) {
        const guild = reaction.message.guild;
        const member = await guild.members.fetch(user.id);
        const role = guild.roles.cache.get(matchedReactionRole.roleId);

        if (member && role) {
            try {
                await member.roles.add(role);
                console.log(`Assigned role ${role.name} to ${member.user.tag} via reaction.`);
            } catch (error) {
                console.error(`Error assigning role ${role.name} to ${member.user.tag}:`, error);
            }
        }
    }
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the reaction:', error);
            return;
        }
    }

    const matchedReactionRole = reactionRoles.find(rr =>
        rr.messageId === reaction.message.id &&
        (rr.emoji === reaction.emoji.name || rr.emoji === reaction.emoji.id)
    );

    if (matchedReactionRole) {
        const guild = reaction.message.guild;
        const member = await guild.members.fetch(user.id);
        const role = guild.roles.cache.get(matchedReactionRole.roleId);

        if (member && role) {
            try {
                await member.roles.remove(role);
                console.log(`Removed role ${role.name} from ${member.user.tag} via reaction.`);
            } catch (error) {
                console.error(`Error removing role ${role.name} from ${member.user.tag}:`, error);
            }
        }
    }
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    if (!levels[userId]) {
        levels[userId] = { xp: 0, level: 0 };
    }

    // XP gain logic
    const xpToGive = Math.floor(Math.random() * 10) + 15; // Random XP between 15 and 25
    levels[userId].xp += xpToGive;

    // Level up logic
    const nextLevelXp = 5 * (levels[userId].level ** 2) + 50 * levels[userId].level + 100; // Formula for XP needed for next level
    if (levels[userId].xp >= nextLevelXp) {
        levels[userId].level++;
        levels[userId].xp = 0; // Reset XP for the new level
        message.channel.send(`恭喜 ${message.author}！你已达到等级 ${levels[userId].level}！(Congratulations ${message.author}! You've reached level ${levels[userId].level}!)`);
    }

    // Bad word filter logic
    const messageContent = message.content.toLowerCase();
    for (const word of badwords) {
        if (messageContent.includes(word)) {
            try {
                await message.delete();
                await message.channel.send(`请不要使用违禁词，${message.author}。(Please do not use forbidden words, ${message.author}.)`).then(msg => {
                    setTimeout(() => msg.delete().catch(console.error), 5000);
                });

                // Send log to moderation channel
                if (config.MOD_LOG_CHANNEL_ID) {
                    const logChannel = message.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('🚫 Forbidden Word Detected (日志)')
                            .setDescription(`用户 ${message.author.tag} 发送了一条包含违禁词的消息.\n(User ${message.author.tag} sent a message containing a forbidden word.)`)
                            .addFields(
                                { name: 'User (用户)', value: message.author.tag, inline: true },
                                { name: 'Channel (频道)', value: message.channel.name, inline: true },
                                { name: 'Message (消息)', value: message.content }
                            )
                            .setTimestamp();
                        logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                    }
                }
                break; // Stop checking after the first bad word is found
            } catch (error) {
                console.error('Error deleting message or sending warning:', error);
            }
        }
    }
});

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