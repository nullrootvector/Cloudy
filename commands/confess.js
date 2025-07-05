const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('confess') // The name of the slash command
        .setDescription('Sends an anonymous confession to the confessions channel.') // The description of the command
        .addStringOption(option =>
            option.setName('confession') // Define a string option for the confession message
                .setDescription('Your anonymous confession') // Description for the option
                .setRequired(true)), // Make this option mandatory

    // The execute function contains the command's logic
    async execute(interaction, config) {
        // Get the confession string provided by the user
        const confession = interaction.options.getString('confession');

        // Check if the confessions channel ID is configured in config.json
        if (!config.CONFESSIONS_CHANNEL_ID) {
            return interaction.reply({
                content: 'The confessions channel has not been configured.', // Error message if channel ID is missing
                ephemeral: true // Only visible to the user who ran the command
            });
        }

        // Fetch the confessions channel from the guild using the configured ID
        const confessionsChannel = await interaction.guild.channels.fetch(config.CONFESSIONS_CHANNEL_ID);
        // If the channel cannot be found, inform the user
        if (!confessionsChannel) {
            return interaction.reply({
                content: 'The confessions channel could not be found.', // Error message if channel is not found
                ephemeral: true
            });
        }

        // Create an embed message for the anonymous confession
        const embed = new EmbedBuilder()
            .setColor('#000000') // Black color for anonymity
            .setTitle('Anonymous Confession') // Title of the embed
            .setDescription(confession) // The confession message itself
            .setTimestamp(); // Add a timestamp to the embed

        // Send the confession embed to the confessions channel
        await confessionsChannel.send({ embeds: [embed] });

        // Reply to the interaction, confirming that the confession was sent anonymously
        await interaction.reply({
            content: 'Your confession has been sent anonymously.',
            ephemeral: true
        });
    },
};