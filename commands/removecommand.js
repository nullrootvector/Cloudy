const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removecommand')
        .setDescription('Removes an existing custom command.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the custom command to remove')
                .setRequired(true)),

    async execute(interaction, config) {
        // Permission Check: User must have ManageGuild permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to manage the server to remove custom commands.",
                ephemeral: true
            });
        }

        const commandName = interaction.options.getString('name').toLowerCase();

        const customCommandsPath = path.join(__dirname, '..', 'customcommands.json');
        let customCommands = [];
        try {
            const data = fs.readFileSync(customCommandsPath, 'utf8');
            customCommands = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading customcommands.json:', readError);
            return interaction.reply({
                content: '无法读取自定义命令数据。(Could not read custom command data.)',
                ephemeral: true
            });
        }

        const initialLength = customCommands.length;
        const updatedCommands = customCommands.filter(cmd => cmd.name !== commandName);

        if (updatedCommands.length === initialLength) {
            return interaction.reply({
                content: `名为 \`${commandName}\` 的自定义命令不存在。(A custom command named \`${commandName}\` does not exist.)`,
                ephemeral: true
            });
        }

        fs.writeFileSync(customCommandsPath, JSON.stringify(updatedCommands, null, 2), 'utf8');

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Custom Command Removed')
            .setDescription(`已成功删除自定义命令 \`${commandName}\`。(Custom command \`${commandName}\` successfully removed.)`)
            .addFields(
                { name: 'Command Name (命令名称)', value: commandName, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Send log to moderation channel
        if (config.MOD_LOG_CHANNEL_ID) {
            const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Custom Command Removed (日志)')
                    .setDescription(`自定义命令 \`${commandName}\` 已删除。`)
                    .addFields(
                        { name: 'Command Name (命令名称)', value: commandName, inline: true },
                        { name: 'Removed By (删除者)', value: interaction.user.tag }
                    )
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] }).catch(console.error);
            }
        }
    },
};