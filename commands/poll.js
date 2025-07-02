const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Creates a poll with up to 10 options.')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The question for the poll')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option1')
                .setDescription('Poll option 1')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option2')
                .setDescription('Poll option 2')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option3')
                .setDescription('Poll option 3')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option4')
                .setDescription('Poll option 4')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option5')
                .setDescription('Poll option 5')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option6')
                .setDescription('Poll option 6')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option7')
                .setDescription('Poll option 7')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option8')
                .setDescription('Poll option 8')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option9')
                .setDescription('Poll option 9')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option10')
                .setDescription('Poll option 10')
                .setRequired(false)),

    async execute(interaction) {
        const question = interaction.options.getString('question');
        const options = [];
        for (let i = 1; i <= 10; i++) {
            const option = interaction.options.getString(`option${i}`);
            if (option) {
                options.push(option);
            }
        }

        if (options.length < 2) {
            return interaction.reply({ content: '请至少提供两个选项。(Please provide at least two options.)', ephemeral: true });
        }

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const pollOptions = options.map((option, index) => `${emojis[index]} ${option}`).join('\n');

        const pollEmbed = new EmbedBuilder()
            .setColor('#00FFFF') // Cyan for polls
            .setTitle(`📊 Poll: ${question}`)
            .setDescription(pollOptions)
            .setTimestamp()
            .setFooter({ text: `Poll created by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

        try {
            const message = await interaction.reply({ embeds: [pollEmbed], fetchReply: true });

            for (let i = 0; i < options.length; i++) {
                await message.react(emojis[i]);
            }
        } catch (error) {
            console.error('Error creating poll:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '创建投票时发生错误。(An error occurred while creating the poll.)', ephemeral: true });
            } else {
                await interaction.reply({ content: '创建投票时发生错误。(An error occurred while creating the poll.)', ephemeral: true });
            }
        }
    },
};