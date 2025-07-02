const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current song.'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const serverQueue = interaction.client.queue.get(guildId);

        if (!serverQueue || !serverQueue.songs.length) {
            return interaction.reply({
                content: '队列中没有歌曲可以跳过。(There are no songs in the queue to skip.)',
                ephemeral: true
            });
        }

        serverQueue.player.stop(); // This will trigger the 'idle' event and play the next song
        await interaction.reply('歌曲已跳过。(Song skipped.)');
    },
};