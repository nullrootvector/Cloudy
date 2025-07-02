const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removebadword')
        .setDescription('Removes a word from the bad word filter.')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The word to remove from the filter')
                .setRequired(true)),

    async execute(interaction, config) {
        // Permission Check: User must have ManageGuild permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "🚫 抱歉，亲爱的，你没有管理服务器的权限来删除违禁词。(Sorry, my dear, you don't have permission to manage the server to remove forbidden words.)",
                ephemeral: true
            });
        }

        const wordToRemove = interaction.options.getString('word').toLowerCase();

        const badwordsPath = path.join(__dirname, '..', 'badwords.json');
        let badwords = [];
        try {
            const data = fs.readFileSync(badwordsPath, 'utf8');
            badwords = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading badwords.json:', readError);
            return interaction.reply({
                content: '无法读取违禁词数据。(Could not read forbidden word data.)',
                ephemeral: true
            });
        }

        const initialLength = badwords.length;
        const updatedBadwords = badwords.filter(word => word !== wordToRemove);

        if (updatedBadwords.length === initialLength) {
            return interaction.reply({
                content: `\`${wordToRemove}\` 不在违禁词列表中。( \`${wordToRemove}\` is not in the forbidden word list.)`,
                ephemeral: true
            });
        }

        fs.writeFileSync(badwordsPath, JSON.stringify(updatedBadwords, null, 2), 'utf8');

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Bad Word Removed')
            .setDescription(`已成功从违禁词列表删除 \`${wordToRemove}\`。(Successfully removed \`${wordToRemove}\` from the forbidden word list.)`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Send log to moderation channel
        if (config.MOD_LOG_CHANNEL_ID) {
            const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Bad Word Removed (日志)')
                    .setDescription(`违禁词 \`${wordToRemove}\` 已删除。`)
                    .addFields(
                        { name: 'Word (词语)', value: wordToRemove, inline: true },
                        { name: 'Removed By (删除者)', value: interaction.user.tag }
                    )
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] }).catch(console.error);
            }
        }
    },
};