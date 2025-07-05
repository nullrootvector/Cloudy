const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffles the queue.'),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || queue.tracks.size < 2) {
            return interaction.reply({ content: 'There are not enough songs in the queue to shuffle.', ephemeral: true });
        }

        queue.tracks.shuffle();

        return interaction.reply('Shuffled the queue.');
    },
};