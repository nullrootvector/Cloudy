const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Sends a random meme from Reddit.'),
    async execute(interaction) {
        try {
            await interaction.deferReply(); // Defer the reply as fetching a meme can take time

            const response = await fetch('https://meme-api.com/gimme');
            const data = await response.json();

            if (data && data.url) {
                const embed = new EmbedBuilder()
                    .setTitle(data.title)
                    .setImage(data.url)
                    .setURL(data.postLink)
                    .setFooter({ text: `👍 ${data.ups} | r/${data.subreddit}` });

                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply('Could not fetch a meme. Try again later!');
            }
        } catch (error) {
            console.error('Error fetching meme:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'An error occurred while trying to fetch a meme.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'An error occurred while trying to fetch a meme.', ephemeral: true });
            }
        }
    },
};