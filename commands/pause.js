const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('pause') // The name of the slash command
        .setDescription('Pauses the current song.'), // The description of the command

    // The execute function contains the command's logic
    async execute(interaction) {
        // Get the music queue for the current guild using discord-player's useQueue hook
        const queue = useQueue(interaction.guild.id);

        // Check if there is an active queue and if a song is currently playing
        if (!queue || !queue.isPlaying()) {
            // If no song is playing, inform the user and make the reply ephemeral (only visible to them)
            return interaction.reply({ content: 'There is no song playing to pause.', ephemeral: true });
        }

        // Pause the current song in the queue
        // The `node` property of the queue object provides control over playback
        queue.node.setPaused(true);

        // Reply to the interaction confirming that the music has been paused
        return interaction.reply('Paused the music.');
    },
};