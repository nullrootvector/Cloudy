const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('confess')
        .setDescription('Sends an anonymous confession to the confessions channel.')
        .addStringOption(option =>
            option.setName('confession')
                .setDescription('Your anonymous confession')
                .setRequired(true)),

    async execute(interaction, config) {
        const confession = interaction.options.getString('confession');

        if (!config.CONFESSIONS_CHANNEL_ID) {
            return interaction.reply({
                content: 'The confessions channel has not been configured.',
                ephemeral: true
            });
        }

        const confessionsChannel = await interaction.guild.channels.fetch(config.CONFESSIONS_CHANNEL_ID);
        if (!confessionsChannel) {
            return interaction.reply({
                content: 'The confessions channel could not be found.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#000000')
            .setTitle('Anonymous Confession')
            .setDescription(confession)
            .setTimestamp();

        await confessionsChannel.send({ embeds: [embed] });

        await interaction.reply({
            content: 'Your confession has been sent anonymously.',
            ephemeral: true
        });
    },
};