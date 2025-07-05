const { SlashCommandBuilder } = require('discord.js');
const { useMainPlayer } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song from YouTube.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The song you want to play')
                .setRequired(true)),

    async execute(interaction) {
        const player = useMainPlayer();
        const channel = interaction.member.voice.channel;

        if (!channel) {
            return interaction.reply({
                content: 'You are not connected to a voice channel!',
                ephemeral: true
            });
        }

        const query = interaction.options.getString('query', true);

        await interaction.deferReply();

        try {
            const { track } = await player.play(channel, query, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.guild.members.me,
                        requestedBy: interaction.user
                    },
                    leaveOnEmptyCooldown: 300000,
                    leaveOnEmpty: true,
                    leaveOnEnd: false,
                    bufferingTimeout: 0,
                    volume: 50,
                    // defaultFFmpegFilters: ['lofi']
                }
            });

            return interaction.followUp(`**${track.title}** enqueued!`);
        } catch (e) {
            return interaction.followUp(`Something went wrong: ${e}`);
        }
    },
};