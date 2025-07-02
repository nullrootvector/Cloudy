const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addcommand')
        .setDescription('Adds a new custom command.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the custom command (e.g., hello)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('response')
                .setDescription('The bot\'s response to the custom command')
                .setRequired(true)),

    async execute(interaction, config) {
        // Permission Check: User must have ManageGuild permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "🚫 抱歉，亲爱的，你没有管理服务器的权限来添加自定义命令。(Sorry, my dear, you don't have permission to manage the server to add custom commands.)",
                ephemeral: true
            });
        }

        const commandName = interaction.options.getString('name').toLowerCase();
        const commandResponse = interaction.options.getString('response');

        const customCommandsPath = path.join(__dirname, '..', 'customcommands.json');
        let customCommands = [];
        try {
            const data = fs.readFileSync(customCommandsPath, 'utf8');
            customCommands = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading customcommands.json:', readError);
        }

        // Check if command already exists
        if (customCommands.some(cmd => cmd.name === commandName)) {
            return interaction.reply({
                content: `名为 \`${commandName}\` 的自定义命令已存在。(A custom command named \`${commandName}\` already exists.)`,
                ephemeral: true
            });
        }

        customCommands.push({
            name: commandName,
            response: commandResponse,
            addedBy: interaction.user.tag,
            addedAt: new Date().toISOString()
        });

        fs.writeFileSync(customCommandsPath, JSON.stringify(customCommands, null, 2), 'utf8');

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Custom Command Added')
            .setDescription(`已成功添加自定义命令 \`${commandName}\`。(Custom command \`${commandName}\` successfully added.)`)
            .addFields(
                { name: 'Command Name (命令名称)', value: commandName, inline: true },
                { name: 'Response (响应)', value: commandResponse }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Send log to moderation channel
        if (config.MOD_LOG_CHANNEL_ID) {
            const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('➕ Custom Command Added (日志)')
                    .setDescription(`自定义命令 \`${commandName}\` 已添加。`)
                    .addFields(
                        { name: 'Command Name (命令名称)', value: commandName, inline: true },
                        { name: 'Response (响应)', value: commandResponse },
                        { name: 'Added By (添加者)', value: interaction.user.tag }
                    )
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] }).catch(console.error);
            }
        }
    }
}