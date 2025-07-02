const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Displays the current music queue.'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const serverQueue = interaction.client.queue.get(guildId);

        if (!serverQueue || !serverQueue.songs.length) {
            return interaction.reply({
                content: '队列为空。(The queue is empty.)',
                ephemeral: true
            });
        }

        const queueList = serverQueue.songs.map((song, index) => 
            `${index + 1}. ${song.title} (Requested by: ${song.requestedBy})`
        ).join('\n');

        const queueEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎵 Current Music Queue')
            .setDescription(queueList)
            .setTimestamp();

        await interaction.reply({ embeds: [queueEmbed], ephemeral: false });
    },
};