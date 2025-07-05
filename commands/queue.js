const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Displays the current song queue.'),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: 'There is no music playing.', ephemeral: true });
        }

        const tracks = queue.tracks.toArray();
        const currentTrack = queue.currentTrack;

        if (!currentTrack && tracks.length === 0) {
            return interaction.reply({ content: 'The queue is empty.', ephemeral: true });
        }

        const queueEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Music Queue');

        if (currentTrack) {
            queueEmbed.addFields({ name: 'Now Playing', value: `[${currentTrack.title}](${currentTrack.url}) | ${currentTrack.author}` });
        }

        if (tracks.length > 0) {
            const trackList = tracks.slice(0, 10).map((track, i) => {
                return `${i + 1}. [${track.title}](${track.url}) | ${track.author}`;
            }).join('\n');

            queueEmbed.addFields({ name: 'Up Next', value: trackList });

            if (tracks.length > 10) {
                queueEmbed.setFooter({ text: `And ${tracks.length - 10} more...` });
            }
        }

        return interaction.reply({ embeds: [queueEmbed] });
    },
};