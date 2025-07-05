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

(async function() {
    'use strict';

// This file is now the conductor of our bot orchestra!
const fs = require('node:fs'); // Node.js file system module for interacting with the file system
const path = require('node:path'); // Node.js path module for resolving paths
const { Client, GatewayIntentBits, Events, Collection, PermissionsBitField, EmbedBuilder } = require('discord.js'); // Import necessary classes from discord.js library
const { Player } = require('discord-player'); // Import Player class from discord-player for music functionalities
const { YouTubeExtractor } = require('@discord-player/extractor'); // Import YouTubeExtractor for YouTube music support

// Load configuration from config.json
let config;
try {
    const configPath = path.join(__dirname, 'config.json'); // Construct the path to config.json
    config = require(configPath); // Load the configuration file
} catch (error) {
    // Handle errors if config.json is missing or malformed
    console.error("💀 Whoopsie! config.json is missing or malformed");
    console.error("Please create a config.json file in the root directory with your BOT_TOKEN.");
    console.error("You can copy config.example.json to config.json and fill in your details.");
    process.exit(1); // Exit the process if configuration cannot be loaded
}

const token = config.BOT_TOKEN; // Get the bot token from the loaded configuration

if (!token) {
    // Check if the bot token is provided
    console.error("💔 Major heartbreak! The BOT_TOKEN is missing from your config.json. Can't start without it");
    process.exit(1); // Exit if no token is found
}

// Create a new Client instance with specified intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // Required for guild-related events (e.g., guild creation, deletion)
        GatewayIntentBits.GuildMessages, // Required for message-related events in guilds
        GatewayIntentBits.GuildMembers, // Required for guild member events (e.g., member join/leave)
        GatewayIntentBits.GuildMessageReactions, // Required for message reaction events
        GatewayIntentBits.MessageContent, // Required to access message content (for bad word filter and leveling system)
        GatewayIntentBits.GuildVoiceStates // Required for music commands to detect user voice channels
    ]
});

// Initialize the music player
const player = new Player(client);
client.player = player; // Attach the player to the client for easy access

// Event listener for when a track starts playing
player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send(`Started playing **${track.title}**!`); // Send a message to the channel
});

// Event listener for when the music queue becomes empty
player.events.on('emptyQueue', queue => {
    queue.metadata.channel.send('Queue finished! Leaving voice channel.'); // Announce queue finished
    queue.connection.destroy(); // Disconnect from the voice channel
});

// Load default extractors for discord-player (e.g., YouTube, Spotify)
const { DefaultExtractors } = require('@discord-player/extractor');

(async () => {
    await player.extractors.loadMulti(DefaultExtractors); // Load all default extractors
})();

// Maps to store voice channel join times and user message data for anti-spam
const voiceTime = new Map();
const userMessages = new Map();

// Collection to store bot commands
client.commands = new Collection();

// Map to store music queues (though discord-player handles most of this internally)
client.queue = new Map();

// Dynamically load command files from the 'commands' directory
const commandsPath = path.join(__dirname, 'commands'); // Construct path to commands directory
try {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js')); // Read all .js files in the commands directory

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file); // Construct full path to the command file
        const command = require(filePath); // Require the command module

        // Check if the command has 'data' and 'execute' properties
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command); // Set the command in the client's commands collection
            console.log(`✅ Command loaded: ${command.data.name} from ${file}`);
        } else {
            console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property. Skippin' it!`);
        }
    }
} catch (error) {
    console.error(`🚫 Oh noes! Could not read the commands directory at ${commandsPath}:`, error);
    console.error("Make sure you have a 'commands' folder with your command files in it.");
}


// ClientReady event: Fired once the bot successfully logs in
client.once(Events.ClientReady, readyClient => {
    console.log(`🚀 Logged in as ${readyClient.user.tag}! The modular bot with moderation is ready!`);
    readyClient.user.setActivity("enforcing peace and order"); // Set the bot's activity status

    // Start checking for expired tempbans every minute
    setInterval(async () => {
        const now = Date.now();
        db.all('SELECT * FROM tempbans WHERE unbanTime <= ?', [now], async (err, expiredBans) => {
            if (err) {
                console.error('Error fetching expired tempbans:', err);
                return;
            }

            for (const ban of expiredBans) {
                try {
                    const guild = await client.guilds.fetch(ban.guildId);
                    if (guild) {
                        const bannedUser = await guild.bans.fetch(ban.userId);
                        if (bannedUser) {
                            await guild.members.unban(ban.userId, 'Temporary ban expired');
                            console.log(`Automatically unbanned ${bannedUser.user.tag} from ${guild.name}.`);

                            if (config.MOD_LOG_CHANNEL_ID) {
                                const logChannel = guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                                if (logChannel) {
                                    const logEmbed = new EmbedBuilder()
                                        .setColor('#00FF00')
                                        .setTitle('Member Unbanned')
                                        .setDescription(`${bannedUser.user.tag} has been automatically unbanned.`)
                                        .addFields(
                                            { name: 'Unbanned User', value: `${bannedUser.user.tag} (${bannedUser.user.id})`, inline: true },
                                            { name: 'Reason', value: 'Temporary ban expired' }
                                        )
                                        .setTimestamp()
                                        .setFooter({ text: `User ID: ${bannedUser.user.id}` });
                                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                                }
                            }
                        }
                    }
                    db.run('DELETE FROM tempbans WHERE id = ?', [ban.id], (deleteErr) => {
                        if (deleteErr) console.error('Error deleting expired tempban:', deleteErr);
                    });
                } catch (error) {
                    console.error(`Error during automatic unban for user ${ban.userId} in guild ${ban.guildId}:`, error);
                }
            }
        });
    }, 60 * 1000); // Check every 1 minute

    // Start checking for ended giveaways every 30 seconds
    setInterval(async () => {
        const now = Date.now();
        db.all('SELECT * FROM giveaways WHERE ended = 0 AND endTime <= ?', [now], async (err, endedGiveaways) => {
            if (err) {
                console.error('Error fetching ended giveaways:', err);
                return;
            }

            for (const giveaway of endedGiveaways) {
                try {
                    const guild = await client.guilds.fetch(giveaway.guildId);
                    const channel = guild.channels.cache.get(giveaway.channelId);
                    const message = await channel.messages.fetch(giveaway.messageId);
                    const reaction = message.reactions.cache.get('🎉');
                    if (!reaction) {
                        console.warn(`Giveaway message ${giveaway.messageId} has no 🎉 reaction.`);
                        db.run('UPDATE giveaways SET ended = 1 WHERE id = ?', [giveaway.id]); // Mark as ended even if no reaction
                        continue;
                    }
                    const users = await reaction.users.fetch();
                    const participants = users.filter(user => !user.bot).map(user => user);

                    if (participants.length === 0) {
                        const noWinnerEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('🎉 GIVEAWAY ENDED! 🎉')
                            .setDescription(`**${giveaway.prize}**\n\nNo participants, so no winner.`)
                            .setTimestamp();
                        await channel.send({ embeds: [noWinnerEmbed] });
                        db.run('UPDATE giveaways SET ended = 1 WHERE id = ?', [giveaway.id]);
                        continue;
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
                        .setDescription(`Congratulations ${winnerMentions}! You won the **${giveaway.prize}**!\n\n[Go to giveaway message](<${message.url}>)`)
                        .setTimestamp();
                    await channel.send({ embeds: [winnerEmbed] });
                    db.run('UPDATE giveaways SET ended = 1 WHERE id = ?', [giveaway.id]);
                } catch (error) {
                    console.error(`Error ending giveaway ${giveaway.messageId}:`, error);
                    db.run('UPDATE giveaways SET ended = 1 WHERE id = ?', [giveaway.id]); // Mark as ended on error too
                }
            }
        });
    }, 30 * 1000); // Check every 30 seconds

    // Save levels data every 30 seconds (this will be removed or modified later)
    // This is a placeholder for now, as levels are handled per message.
    // The levels data is updated on message create and voice state update, so a separate interval save is not strictly necessary
    // if we update the database directly in those event handlers.
    // For now, I'll keep it as is, but it will be removed in the next step.
    setInterval(() => {
        // This block will be removed in the next step as levels are now handled by the database directly.
    }, 30 * 1000);

    // Event listener for when a new member joins the guild
    client.on(Events.GuildMemberAdd, async member => {
        if (config.WELCOME_CHANNEL_ID) {
            const channel = member.guild.channels.cache.get(config.WELCOME_CHANNEL_ID); // Get the welcome channel
            if (channel) {
                channel.send(`Welcome ${member} to ${member.guild.name}!`); // Send welcome message
            }
        }
    });

    // Event listener for when a member leaves the guild
    client.on(Events.GuildMemberRemove, async member => {
        if (config.FAREWELL_CHANNEL_ID) {
            const channel = member.guild.channels.cache.get(config.FAREWELL_CHANNEL_ID); // Get the farewell channel
            if (channel) {
                channel.send(`${member.user.tag} has left the server.`); // Send farewell message
            }
        }
    });
});


// Load custom commands from customcommands.json on startup
// Load levels data from levels.json on startup
const db = require('./database.js');

// Event listener for slash command interactions
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return; // Only process chat input commands

    // Handle custom commands first
    db.get('SELECT commandResponse FROM custom_commands WHERE guildId = ? AND commandName = ?', [interaction.guild.id, interaction.commandName], async (err, row) => {
        if (err) {
            console.error('Error fetching custom command:', err);
            return interaction.reply({ content: 'An error occurred while fetching the custom command!', ephemeral: true });
        }

        if (row) {
            try {
                await interaction.reply({ content: row.commandResponse });
            } catch (error) {
                console.error(`Error executing custom command '${interaction.commandName}':`, error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'An error occurred while executing the custom command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'An error occurred while executing the custom command!', ephemeral: true });
                }
            }
            return; // Stop further processing if it's a custom command
        }

        // Get the command from the client's commands collection
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
    return; // Return here to prevent the rest of the original interactionCreate listener from running immediately

    // Get the command from the client's commands collection
    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction, config); // Execute the command
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

// Event listener for when a reaction is added to a message
client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return; // Ignore bot reactions

    // Starboard functionality
    if (config.starboard && config.starboard.enabled) {
        if (reaction.emoji.name === config.starboard.emoji) { // Check if the reaction emoji matches the starboard emoji
            const message = reaction.message;
            const starboardChannel = await message.guild.channels.fetch(config.starboard.channelId); // Fetch the starboard channel
            if (starboardChannel) {
                const fetchedMessages = await starboardChannel.messages.fetch({ limit: 100 }); // Fetch recent messages in starboard
                const existingStarboardMessage = fetchedMessages.find(m => m.embeds[0] && m.embeds[0].footer.text.endsWith(message.id)); // Find existing starboard entry for this message

                if (existingStarboardMessage) {
                    // Update existing starboard message with new star count
                    const starCount = existingStarboardMessage.embeds[0].author.name.split(' ')[0].replace(/[^0-9]/g, '');
                    const newStarCount = parseInt(starCount) + 1;
                    const newEmbed = new EmbedBuilder(existingStarboardMessage.embeds[0])
                        .setAuthor({ name: `${newStarCount} ${config.starboard.emoji}` });
                    await existingStarboardMessage.edit({ embeds: [newEmbed] });
                } else if (reaction.count >= config.starboard.requiredStars) {
                    // Create new starboard entry if required stars are met
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: `${reaction.count} ${config.starboard.emoji}` })
                        .setColor('#FFAC33')
                        .setDescription(message.content)
                        .setThumbnail(message.author.displayAvatarURL())
                        .setTimestamp(message.createdAt)
                        .setFooter({ text: `⭐ | ${message.id}` });

                    if (message.attachments.size > 0) {
                        embed.setImage(message.attachments.first().url); // Add image if message has attachments
                    }

                    await starboardChannel.send({ embeds: [embed] });
                }
            }
        }
    }

    // Fetch partial reactions if necessary
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the reaction:', error);
            return;
        }
    }

    // Reaction roles functionality
    db.get('SELECT roleId FROM reaction_roles WHERE messageId = ? AND emoji = ?', [reaction.message.id, reaction.emoji.name], async (err, row) => {
        if (err) {
            console.error('Error fetching reaction role:', err);
            return;
        }

        if (row) {
            const guild = reaction.message.guild;
            const member = await guild.members.fetch(user.id);
            const role = guild.roles.cache.get(row.roleId);

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
});

// Event listener for when a reaction is removed from a message
client.on(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.bot) return; // Ignore bot reactions

    // Fetch partial reactions if necessary
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the reaction:', error);
            return;
        }
    }

    // Reaction roles functionality (remove role)
    db.get('SELECT roleId FROM reaction_roles WHERE messageId = ? AND emoji = ?', [reaction.message.id, reaction.emoji.name], async (err, row) => {
        if (err) {
            console.error('Error fetching reaction role:', err);
            return;
        }

        if (row) {
            const guild = reaction.message.guild;
            const member = await guild.members.fetch(user.id);
            const role = guild.roles.cache.get(row.roleId);

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
});

// Event listener for voice state updates (e.g., user joins/leaves voice channel)
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const user = oldState.member.user;
    if (user.bot) return; // Ignore bot voice state updates

    // Temporary voice channels functionality
    if (config.temporaryVoiceChannels && config.temporaryVoiceChannels.enabled) {
        const creatorChannelId = config.temporaryVoiceChannels.creatorChannelId;
        const categoryId = config.temporaryVoiceChannels.categoryId;
        const channelNamePrefix = config.temporaryVoiceChannels.channelNamePrefix;

        // User joins the creator channel
        if (newState.channelId === creatorChannelId) {
            const guild = newState.guild;
            const member = newState.member;
            const channelName = `${channelNamePrefix}${member.displayName}`; // Create channel name based on user's display name

            const createdChannel = await guild.channels.create({
                name: channelName,
                type: 2, // GUILD_VOICE
                parent: categoryId,
                permissionOverwrites: [
                    {
                        id: member.id,
                        allow: [PermissionsBitField.Flags.ManageChannels], // Allow user to manage their channel
                    },
                ],
            });

            await member.voice.setChannel(createdChannel); // Move user to the newly created channel
        }

        // User leaves a voice channel, and the channel becomes empty
        if (oldState.channel && oldState.channel.name.startsWith(channelNamePrefix) && oldState.channel.members.size === 0) {
            await oldState.channel.delete(); // Delete the empty temporary channel
        }
    }

    // Voice XP and Economy
    if (oldState.channelId && !newState.channelId) {
        // User left a voice channel
        const joinTime = voiceTime.get(user.id);
        if (joinTime) {
            const userId = user.id;
            const timeSpent = Date.now() - joinTime; // Calculate time spent in voice channel
            const xpToGive = Math.floor(timeSpent / 60000); // 1 XP per minute
            
            if (xpToGive > 0) {
                if (!levels[userId]) {
                    levels[userId] = { xp: 0, level: 0 };
                }
                levels[userId].xp += xpToGive; // Add XP
                const nextLevelXp = 5 * (levels[userId].level ** 2) + 50 * levels[userId].level + 100; // Calculate XP needed for next level
                if (levels[userId].xp >= nextLevelXp) {
                    levels[userId].level++; // Level up
                    levels[userId].xp = 0; // Reset XP for new level
                    const channel = oldState.guild.channels.cache.get(config.WELCOME_CHANNEL_ID); // Get welcome channel for level up message
                    if (channel) {
                        channel.send(`Congratulations ${user}! You've reached level ${levels[userId].level}!`); // Send level up message
                    }
                }
            }

            voiceTime.delete(user.id); // Remove user from voiceTime map

            // Economy: Award currency for voice time
            if (config.economy && config.economy.enabled) {
                const currencyToGive = Math.floor(timeSpent / 30000); // 1 currency per 30 seconds
                if (currencyToGive > 0) {
                    db.get('SELECT balance FROM economy WHERE userId = ? AND guildId = ?', [userId, oldState.guild.id], (err, row) => {
                        if (err) {
                            console.error('Error fetching economy for voice XP:', err);
                            return;
                        }
                        let currentBalance = row ? row.balance : 0;
                        currentBalance += currencyToGive;
                        if (row) {
                            db.run('UPDATE economy SET balance = ? WHERE userId = ? AND guildId = ?', [currentBalance, userId, oldState.guild.id], (updateErr) => {
                                if (updateErr) console.error('Error updating economy for voice XP:', updateErr);
                            });
                        } else {
                            db.run('INSERT INTO economy (userId, guildId, balance) VALUES (?, ?, ?)', [userId, oldState.guild.id, currentBalance], (insertErr) => {
                                if (insertErr) console.error('Error inserting economy for voice XP:', insertErr);
                            });
                        }
                    });
                }
            }
        }
    } else if (!oldState.channelId && newState.channelId) {
        // User joined a voice channel
        voiceTime.set(user.id, Date.now()); // Record join time
    }
});

// Event listener for channel creation
client.on(Events.ChannelCreate, async channel => {
    if (config.AUDIT_LOG_CHANNEL_ID) {
        const logChannel = await channel.guild.channels.fetch(config.AUDIT_LOG_CHANNEL_ID); // Fetch audit log channel
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Channel Created')
                .setDescription(`Channel ${channel.name} was created.`)
                .setTimestamp();
            logChannel.send({ embeds: [embed] }); // Send log message
        }
    }
});

// Event listener for channel deletion
client.on(Events.ChannelDelete, async channel => {
    if (config.AUDIT_LOG_CHANNEL_ID) {
        const logChannel = await channel.guild.channels.fetch(config.AUDIT_LOG_CHANNEL_ID); // Fetch audit log channel
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Channel Deleted')
                .setDescription(`Channel ${channel.name} was deleted.`)
                .setTimestamp();
            logChannel.send({ embeds: [embed] }); // Send log message
        }
    }
});

// Event listener for role creation
client.on(Events.RoleCreate, async role => {
    if (config.AUDIT_LOG_CHANNEL_ID) {
        const logChannel = await role.guild.channels.fetch(config.AUDIT_LOG_CHANNEL_ID); // Fetch audit log channel
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Role Created')
                .setDescription(`Role ${role.name} was created.`)
                .setTimestamp();
            logChannel.send({ embeds: [embed] }); // Send log message
        }
    }
});

// Event listener for role deletion
client.on(Events.RoleDelete, async role => {
    if (config.AUDIT_LOG_CHANNEL_ID) {
        const logChannel = await role.guild.channels.fetch(config.AUDIT_LOG_CHANNEL_ID); // Fetch audit log channel
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Role Deleted')
                .setDescription(`Role ${role.name} was deleted.`)
                .setTimestamp();
            logChannel.send({ embeds: [embed] }); // Send log message
        }
    }
});

// Event listener for messages being created
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.guild) return; // Ignore bot messages and messages outside of guilds

    // Auto-moderation features
    if (config.autoModeration) {
        // Anti-spam
        if (config.autoModeration.antiSpam && config.autoModeration.antiSpam.enabled) {
            const now = Date.now();
            const user = userMessages.get(message.author.id);
            if (user) {
                const { lastMessage, timer } = user;
                const diff = now - lastMessage.createdTimestamp;
                if (diff < config.autoModeration.antiSpam.timeInterval) {
                    let { count } = user;
                    count++;
                    if (count >= config.autoModeration.antiSpam.messageLimit) {
                        message.delete(); // Delete spam message
                        message.channel.send(`${message.author}, please don't spam!`).then(msg => {
                            setTimeout(() => msg.delete().catch(console.error), 5000); // Delete warning after 5 seconds
                        });
                        return;
                    }
                    user.count = count;
                } else {
                    clearTimeout(timer);
                    user.count = 1;
                    user.lastMessage = message;
                    user.timer = setTimeout(() => {
                        userMessages.delete(message.author.id);
                    }, config.autoModeration.antiSpam.timeInterval);
                }
            } else {
                const timer = setTimeout(() => {
                    userMessages.delete(message.author.id);
                }, config.autoModeration.antiSpam.timeInterval);
                userMessages.set(message.author.id, {
                    count: 1,
                    lastMessage: message,
                    timer
                });
            }
        }

        // Anti-mention
        if (config.autoModeration.antiMention && config.autoModeration.antiMention.enabled) {
            if (message.mentions.users.size > config.autoModeration.antiMention.mentionLimit) {
                message.delete(); // Delete message with excessive mentions
                message.channel.send(`${message.author}, please don't mass mention!`).then(msg => {
                    setTimeout(() => msg.delete().catch(console.error), 5000); // Delete warning after 5 seconds
                });
                return;
            }
        }

        // Anti-caps
        if (config.autoModeration.antiCaps && config.autoModeration.antiCaps.enabled) {
            const caps = message.content.replace(/[^A-Z]/g, '').length; // Count uppercase characters
            if (caps / message.content.length > config.autoModeration.antiCaps.capsLimit) {
                message.delete(); // Delete message with excessive caps
                message.channel.send(`${message.author}, please don't use excessive caps!`).then(msg => {
                    setTimeout(() => msg.delete().catch(console.error), 5000); // Delete warning after 5 seconds
                });
                return;
            }
        }
    }

    const userId = message.author.id;
    const guildId = message.guild.id;

    // XP gain logic for messages
    const xpToGive = Math.floor(Math.random() * 10) + 15; // Random XP between 15 and 25

    db.get('SELECT xp, level FROM levels WHERE userId = ? AND guildId = ?', [userId, guildId], (err, row) => {
        if (err) {
            console.error('Error fetching user level:', err);
            return;
        }

        let currentXp = row ? row.xp : 0;
        let currentLevel = row ? row.level : 0;

        currentXp += xpToGive;

        const nextLevelXp = 5 * (currentLevel ** 2) + 50 * currentLevel + 100;

        if (currentXp >= nextLevelXp) {
            currentLevel++;
            currentXp = 0;
            message.channel.send(`Congratulations ${message.author}! You've reached level ${currentLevel}!`);
        }

        if (row) {
            db.run('UPDATE levels SET xp = ?, level = ? WHERE userId = ? AND guildId = ?', [currentXp, currentLevel, userId, guildId], (updateErr) => {
                if (updateErr) console.error('Error updating user level:', updateErr);
            });
        } else {
            db.run('INSERT INTO levels (userId, guildId, xp, level) VALUES (?, ?, ?, ?)', [userId, guildId, currentXp, currentLevel], (insertErr) => {
                if (insertErr) console.error('Error inserting user level:', insertErr);
            });
        }
    });

    // Economy: Award currency for messages
    if (config.economy && config.economy.enabled) {
        const currencyToGive = Math.floor(Math.random() * 5) + 1; // 1-5 currency per message
        db.get('SELECT balance FROM economy WHERE userId = ? AND guildId = ?', [userId, guildId], (err, row) => {
            if (err) {
                console.error('Error fetching economy for message XP:', err);
                return;
            }
            let currentBalance = row ? row.balance : 0;
            currentBalance += currencyToGive;
            if (row) {
                db.run('UPDATE economy SET balance = ? WHERE userId = ? AND guildId = ?', [currentBalance, userId, guildId], (updateErr) => {
                    if (updateErr) console.error('Error updating economy for message XP:', updateErr);
                });
            } else {
                db.run('INSERT INTO economy (userId, guildId, balance) VALUES (?, ?, ?)', [userId, guildId, currentBalance], (insertErr) => {
                    if (insertErr) console.error('Error inserting economy for message XP:', insertErr);
                });
            }
        });
    }

    // Bad word filter logic
    db.all('SELECT word FROM badwords WHERE guildId = ?', [message.guild.id], async (err, rows) => {
        if (err) {
            console.error('Error fetching bad words:', err);
            return;
        }
        const currentBadwords = rows.map(row => row.word);

        const messageContent = message.content.toLowerCase();
        for (const word of currentBadwords) {
            if (messageContent.includes(word)) { // Check if message contains a bad word
                try {
                    await message.delete(); // Delete the message
                    await message.channel.send(`Please do not use forbidden words, ${message.author}.`).then(msg => {
                        setTimeout(() => msg.delete().catch(console.error), 5000); // Delete warning after 5 seconds
                    });

                    // Send log to moderation channel if configured
                    if (config.MOD_LOG_CHANNEL_ID) {
                        const logChannel = message.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('Forbidden Word Detected')
                                .setDescription(`User ${message.author.tag} sent a message containing a forbidden word.`)
                                .addFields(
                                    { name: 'User', value: message.author.tag, inline: true },
                                    { name: 'Channel', value: message.channel.name, inline: true },
                                    { name: 'Message', value: message.content }
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
});

// Log in to Discord with the bot token
client.login(token)
    .catch(error => {
        console.error("💀 Catastrophic failure to login! Double-check that BOT_TOKEN in config.json, love.", error);
    });

// Enhanced error handling for unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

console.log("Attempting to start the bot...");

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