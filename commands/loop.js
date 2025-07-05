const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('loop') // The name of the slash command
        .setDescription('Sets the loop mode.') // The description of the command
        .addStringOption(option =>
            option.setName('mode') // Define a string option for the loop mode
                .setDescription('The loop mode') // Description for the option
                .setRequired(true) // Make this option mandatory
                .addChoices( // Add predefined choices for the loop mode
                    { name: 'Off', value: 'off' },
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' },
                    { name: 'Autoplay', value: 'autoplay' }
                )),

    // The execute function contains the command's logic
    async execute(interaction) {
        // Get the queue for the current guild using discord-player's useQueue hook
        const queue = useQueue(interaction.guild.id);
        // Get the selected loop mode from the interaction options
        const mode = interaction.options.getString('mode');

        // If there is no music playing, inform the user
        if (!queue) {
            return interaction.reply({ content: 'There is no music playing to loop.', ephemeral: true });
        }

        let loopMode; // Variable to store the discord-player repeat mode enum value
        // Determine the numeric loop mode based on the user's string input
        switch (mode) {
            case 'off':
                loopMode = 0; // Off (no loop)
                break;
            case 'track':
                loopMode = 1; // Loop current track
                break;
            case 'queue':
                loopMode = 2; // Loop entire queue
                break;
            case 'autoplay':
                loopMode = 3; // Autoplay (discord-player will suggest related songs)
                break;
        }

        // Set the repeat mode for the queue
        queue.setRepeatMode(loopMode);

        // Reply to the interaction confirming the new loop mode
        return interaction.reply(`Set loop mode to **${mode}**.`);
    },
};