const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');


module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('meme') // The name of the slash command
        .setDescription('Sends a random meme from Reddit.'), // The description of the command

    // The execute function contains the command's logic
    async execute(interaction) {
        try {
            // Defer the reply because fetching a meme from an external API can take some time.
            // This tells Discord that the bot is thinking and will respond soon.
            await interaction.deferReply();

            // Make a request to the meme API to get a random meme
            const response = await fetch('https://meme-api.com/gimme');
            const data = await response.json(); // Parse the JSON response

            // Check if the API returned valid data and a URL for the meme
            if (data && data.url) {
                // Create an embed message to display the meme
                const embed = new EmbedBuilder()
                    .setTitle(data.title) // Set the title of the embed to the meme's title
                    .setImage(data.url) // Set the image of the embed to the meme's URL
                    .setURL(data.postLink) // Set the URL of the embed to the Reddit post link
                    .setFooter({ text: `👍 ${data.ups} | r/${data.subreddit}` }); // Add a footer with upvotes and subreddit

                // Edit the deferred reply with the meme embed
                await interaction.editReply({ embeds: [embed] });
            } else {
                // If no meme URL is found in the response, inform the user
                await interaction.editReply('Could not fetch a meme. Try again later!');
            }
        } catch (error) {
            // Catch any errors that occur during the fetch or processing
            console.error('Error fetching meme:', error);
            // Reply to the interaction with an error message
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'An error occurred while trying to fetch a meme.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'An error occurred while trying to fetch a meme.', ephemeral: true });
            }
        }
    },
};