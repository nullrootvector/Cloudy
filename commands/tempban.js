const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Temporarily bans a member from the server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to tempban')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration of the ban in minutes')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the tempban')
                .setRequired(false)),

    async execute(interaction, config) {
        const memberToBan = interaction.options.getMember('target');
        const duration = interaction.options.getInteger('duration'); // in minutes
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to tempban members.",
                ephemeral: true
            });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({
                content: "😥 I don't have enough permissions to tempban members.",
                ephemeral: true
            });
        }

        if (!memberToBan.bannable) {
            return interaction.reply({
                content: "I cannot tempban this user. They might have a higher role, or I don't have permission.",
                ephemeral: true
            });
        }

        if (memberToBan.id === interaction.user.id) {
            return interaction.reply({
                content: "You can't tempban yourself, my friend!",
                ephemeral: true
            });
        }

        try {
            const unbanTime = Date.now() + duration * 60 * 1000; // Calculate unban time in milliseconds

            await memberToBan.ban({ reason: `Temporary ban: ${reason}` });

            db.run('INSERT INTO tempbans (userId, guildId, unbanTime, reason, moderatorId) VALUES (?, ?, ?, ?, ?)', [memberToBan.id, interaction.guild.id, unbanTime, reason, interaction.user.id], (err) => {
                if (err) {
                    console.error('Error storing tempban:', err);
                    return interaction.reply({ content: 'An error occurred while storing the tempban.', ephemeral: true });
                }
            });

            const tempBanEmbed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle('⏳ Member Temporarily Banned')
                .setDescription(`${memberToBan.user.tag} has been temporarily banned from the server.`)
                .addFields(
                    { name: 'Banned User', value: `${memberToBan.user.tag} (${memberToBan.id})`, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Duration', value: `${duration} minutes`, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp()
                .setFooter({ text: `Server: ${interaction.guild.name}` });

            await interaction.reply({ embeds: [tempBanEmbed] });
            console.log(`${interaction.user.tag} tempbanned ${memberToBan.user.tag} for ${duration} minutes for: ${reason}.`);

            if (config.MOD_LOG_CHANNEL_ID) {
                const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#FF4500')
                        .setTitle('⏳ Member Temporarily Banned (Log)')
                        .setDescription(`${memberToBan.user.tag} has been temporarily banned.`)
                        .addFields(
                            { name: 'Banned User', value: `${memberToBan.user.tag} (${memberToBan.id})`, inline: true },
                            { name: 'Moderator', value: interaction.user.tag, inline: true },
                            { name: 'Duration', value: `${duration} minutes`, inline: true },
                            { name: 'Reason', value: reason }
                        )
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${memberToBan.id}` });
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                }
            }

            try {
                await memberToBan.send(`You have been temporarily banned from **${interaction.guild.name}** for ${duration} minutes. Reason: ${reason}`);
            } catch (dmError) {
                console.warn(`Could not DM ${memberToBan.user.tag} about their tempban: ${dmError}`);
            }

        } catch (error) {
            console.error(`Error tempbanning member ${memberToBan.user.tag}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "An error occurred while trying to tempban the member.", ephemeral: true });
            } else {
                await interaction.reply({ content: "An error occurred while trying to tempban the member.", ephemeral: true });
            }
        }
    },
};