const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('leaderboard') // The name of the slash command
        .setDescription('Displays the top 10 users by level.'), // The description of the command

    // The execute function contains the command's logic
    async execute(interaction) {
        // Construct the absolute path to the levels.json file
        const levelsPath = path.join(__dirname, '..', 'levels.json');
        let levels = {}; // Initialize an empty object to hold level data

        // Read the existing levels.json file
        try {
            const data = fs.readFileSync(levelsPath, 'utf8'); // Read file synchronously
            levels = JSON.parse(data); // Parse the JSON data into an object
        } catch (readError) {
            // Log an error if the file cannot be read
            console.error('Error reading levels.json:', readError);
            return interaction.reply({
                content: 'Could not read level data.', // Error message for the user
                ephemeral: true
            });
        }

        // Convert the levels object into an array of user data, sort it, and get the top 10
        const sortedUsers = Object.keys(levels) // Get all user IDs (keys) from the levels object
            .map(id => ({
                userId: id, // Add the user ID to the object
                ...levels[id] // Spread the user's level and XP data
            }))
            .sort((a, b) => {
                // Custom sort function
                if (b.level === a.level) {
                    return b.xp - a.xp; // If levels are the same, sort by XP (descending)
                }
                return b.level - a.level; // Otherwise, sort by level (descending)
            })
            .slice(0, 10); // Take only the top 10 users

        // If no users are found in the leaderboard, inform the user
        if (sortedUsers.length === 0) {
            return interaction.reply({
                content: '排行榜为空。快去发送消息来获得经验吧！(Leaderboard is empty. Go send messages to gain XP!)',
                ephemeral: true
            });
        }

        // Generate the leaderboard description by fetching user tags and formatting the output
        const leaderboardDescription = await Promise.all(sortedUsers.map(async (userData, index) => {
            try {
                // Fetch the user object from Discord using their ID
                const user = await interaction.client.users.fetch(userData.userId);
                // Return formatted string for each user
                return `${index + 1}. ${user.tag} - Level ${userData.level} (XP: ${userData.xp})`;
            } catch (error) {
                // Log an error if a user cannot be fetched (e.g., user left the server)
                console.error(`Error fetching user for leaderboard: ${userData.userId}`, error);
                // Return a fallback string for unknown users
                return `${index + 1}. Unknown User - Level ${userData.level} (XP: ${userData.xp})`;
            }
        }));

        // Create an embed message for the leaderboard
        const leaderboardEmbed = new EmbedBuilder()
            .setColor('#FFD700') // Gold color
            .setTitle('👑 Top 10 Leaderboard (排行榜)') // Title of the embed
            .setDescription(leaderboardDescription.join('\n')) // Join the array of user strings with newlines
            .setTimestamp() // Add a timestamp to the embed
            .setFooter({ text: `Requested by ${interaction.user.tag}` }); // Footer showing who requested the leaderboard

        // Reply to the interaction with the leaderboard embed
        await interaction.reply({ embeds: [leaderboardEmbed], ephemeral: false }); // Not ephemeral, so everyone can see it
    },
};