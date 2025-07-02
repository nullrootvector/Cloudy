const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addbadword')
        .setDescription('Adds a word to the bad word filter.')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The word to add to the filter')
                .setRequired(true)),

    async execute(interaction, config) {
        // Permission Check: User must have ManageGuild permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "🚫 抱歉，亲爱的，你没有管理服务器的权限来添加违禁词。(Sorry, my dear, you don't have permission to manage the server to add forbidden words.)",
                ephemeral: true
            });
        }

        const wordToAdd = interaction.options.getString('word').toLowerCase();

        const badwordsPath = path.join(__dirname, '..', 'badwords.json');
        let badwords = [];
        try {
            const data = fs.readFileSync(badwordsPath, 'utf8');
            badwords = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading badwords.json:', readError);
        }

        if (badwords.includes(wordToAdd)) {
            return interaction.reply({
                content: `\`${wordToAdd}\` 已经在违禁词列表中了。( \`${wordToAdd}\` is already in the forbidden word list.)`,
                ephemeral: true
            });
        }

        badwords.push(wordToAdd);
        fs.writeFileSync(badwordsPath, JSON.stringify(badwords, null, 2), 'utf8');

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Bad Word Added')
            .setDescription(`已成功添加 \`${wordToAdd}\` 到违禁词列表。(Successfully added \`${wordToAdd}\` to the forbidden word list.)`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Send log to moderation channel
        if (config.MOD_LOG_CHANNEL_ID) {
            const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('➕ Bad Word Added (日志)')
                    .setDescription(`违禁词 \`${wordToAdd}\` 已添加。`)
                    .addFields(
                        { name: 'Word (词语)', value: wordToAdd, inline: true },
                        { name: 'Added By (添加者)', value: interaction.user.tag }
                    )
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] }).catch(console.error);
            }
        }
    },
};