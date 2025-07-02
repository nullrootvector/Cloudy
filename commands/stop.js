const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the current music playback and clears the queue.'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const connection = getVoiceConnection(guildId);

        if (!connection) {
            return interaction.reply({
                content: '我没有在任何语音频道中播放音乐。(I am not playing music in any voice channel.)',
                ephemeral: true
            });
        }

        const serverQueue = interaction.client.queue.get(guildId);
        if (serverQueue) {
            serverQueue.songs = []; // Clear the queue
            serverQueue.player.stop(); // Stop the player
        }

        connection.destroy(); // Disconnect from the voice channel
        interaction.client.queue.delete(guildId);

        await interaction.reply('音乐已停止，队列已清空。(Music stopped and queue cleared.)');
    },
};