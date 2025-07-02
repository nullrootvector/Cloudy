const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const playdl = require('play-dl');

const queue = new Map(); // Guild ID to queue object

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays music from a YouTube URL.')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The YouTube URL of the song')
                .setRequired(true)),

    async execute(interaction) {
        const url = interaction.options.getString('url');
        const voiceChannel = interaction.member.voice.channel;
        console.log('Voice Channel:', voiceChannel ? voiceChannel.name : 'None');

        if (!voiceChannel) {
            return interaction.reply({
                content: '你必须在一个语音频道中才能播放音乐！(You must be in a voice channel to play music!)',
                ephemeral: true
            });
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        console.log('Bot Permissions in Voice Channel:', {
            connect: permissions.has(PermissionsBitField.Flags.Connect),
            speak: permissions.has(PermissionsBitField.Flags.Speak)
        });

        if (!permissions.has(PermissionsBitField.Flags.Connect) || !permissions.has(PermissionsBitField.Flags.Speak)) {
            return interaction.reply({
                content: '我需要加入和发言的权限才能播放音乐！(I need the permissions to join and speak in your voice channel to play music!)',
                ephemeral: true
            });
        }

        const serverQueue = queue.get(interaction.guild.id);

        const song = {
            url: url,
            title: 'Loading...',
            requestedBy: interaction.user.tag
        };

        if (!serverQueue) {
            const queueContruct = {
                textChannel: interaction.channel,
                voiceChannel: voiceChannel,
                connection: null,
                player: null,
                songs: [],
                volume: 0.5,
                playing: true,
            };

            queue.set(interaction.guild.id, queueContruct);
            queueContruct.songs.push(song);

            try {
                console.log('Attempting to join voice channel...');
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: voiceChannel.guild.id,
                    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                });
                console.log('Successfully joined voice channel.');
                queueContruct.connection = connection;
                queueContruct.player = createAudioPlayer();
                connection.subscribe(queueContruct.player);

                play(interaction.guild, queueContruct.songs[0]);
                await interaction.reply(`正在播放：${song.title} (Playing: ${song.title})`);
            } catch (err) {
                console.error(err);
                queue.delete(interaction.guild.id);
                await interaction.reply('无法连接到语音频道。(Could not connect to the voice channel.)');
                return;
            }
        } else {
            serverQueue.songs.push(song);
            await interaction.reply(`已将 ${song.title} 添加到队列！( ${song.title} has been added to the queue!)`);
            return;
        }

        async function play(guild, song) {
            const serverQueue = queue.get(guild.id);
            if (!song) {
                serverQueue.connection.destroy();
                queue.delete(guild.id);
                return;
            }

            try {
                console.log(`Attempting to get video info from play-dl for: ${song.url}`);
                const videoInfo = await playdl.video_info(song.url);
                console.log('Full videoInfo object:', videoInfo);
                console.log('videoInfo.video_details object:', videoInfo.video_details);
                song.title = videoInfo.video_details.title;
                console.log(`Successfully got video info. Title: ${song.title}`);

                console.log('Attempting to create stream from play-dl...');
                const stream = await playdl.stream(videoInfo.video_details.url);
                console.log('Successfully created play-dl stream.');

                console.log('Attempting to create audio resource...');
                const resource = createAudioResource(stream.stream, { inputType: stream.type, inlineVolume: true });
                console.log('Successfully created audio resource.');

                serverQueue.player.play(resource);
                resource.volume.setVolume(serverQueue.volume);

                serverQueue.textChannel.send(`正在播放：**${song.title}** (Requested by: ${song.requestedBy})`);

            } catch (error) {
                console.error('Error playing song:', error);
                serverQueue.textChannel.send('播放歌曲时发生错误。(An error occurred while playing the song.)');
                serverQueue.songs.shift(); // Skip problematic song
                play(guild, serverQueue.songs[0]);
                return;
            }

            serverQueue.player.on(AudioPlayerStatus.Idle, () => {
                serverQueue.songs.shift();
                play(guild, serverQueue.songs[0]);
            });

            serverQueue.player.on('error', error => {
                console.error('Audio player error:', error);
                serverQueue.textChannel.send('音频播放器发生错误。(An audio player error occurred.)');
                serverQueue.songs.shift(); // Skip problematic song
                play(guild, serverQueue.songs[0]);
            });
        }
    },
};