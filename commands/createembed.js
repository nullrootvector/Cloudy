const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createembed')
        .setDescription('Creates a custom embed message.')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the embed')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('The description of the embed')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('The color of the embed (hex code, e.g., #FF0000)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('image_url')
                .setDescription('URL for an image to display in the embed')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('thumbnail_url')
                .setDescription('URL for a thumbnail image to display in the embed')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('footer_text')
                .setDescription('Text for the embed footer')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('footer_icon_url')
                .setDescription('URL for an icon in the embed footer')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('author_name')
                .setDescription('Name for the embed author')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('author_icon_url')
                .setDescription('URL for an icon next to the author name')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('url')
                .setDescription('URL for the embed title to link to')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send the embed to (defaults to current channel)')
                .setRequired(false)),

    async execute(interaction) {
        // Permission Check: User must have ManageMessages permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({
                content: "🚫 抱歉，亲爱的，你没有管理消息的权限来创建自定义嵌入消息。(Sorry, my dear, you don't have permission to manage messages to create custom embed messages.)",
                ephemeral: true
            });
        }

        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const color = interaction.options.getString('color');
        const imageUrl = interaction.options.getString('image_url');
        const thumbnailUrl = interaction.options.getString('thumbnail_url');
        const footerText = interaction.options.getString('footer_text');
        const footerIconUrl = interaction.options.getString('footer_icon_url');
        const authorName = interaction.options.getString('author_name');
        const authorIconUrl = interaction.options.getString('author_icon_url');
        const url = interaction.options.getString('url');
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        if (!title && !description && !imageUrl && !thumbnailUrl && !footerText && !authorName) {
            return interaction.reply({
                content: '请至少提供标题、描述、图片、缩略图、页脚文本或作者名称中的一项来创建嵌入消息。(Please provide at least a title, description, image, thumbnail, footer text, or author name to create an embed message.)',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder();

        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (color) embed.setColor(color);
        if (imageUrl) embed.setImage(imageUrl);
        if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
        if (url) embed.setURL(url);

        if (footerText) {
            embed.setFooter({
                text: footerText,
                iconURL: footerIconUrl || undefined
            });
        }

        if (authorName) {
            embed.setAuthor({
                name: authorName,
                iconURL: authorIconUrl || undefined
            });
        }

        try {
            await targetChannel.send({ embeds: [embed] });
            await interaction.reply({ content: `嵌入消息已发送到 ${targetChannel}。(Embed message sent to ${targetChannel}.)`, ephemeral: true });
        } catch (error) {
            console.error('Error creating custom embed:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '创建自定义嵌入消息时发生错误。(An error occurred while creating the custom embed message.)', ephemeral: true });
            } else {
                await interaction.reply({ content: '创建自定义嵌入消息时发生错误。(An error occurred while creating the custom embed message.)', ephemeral: true });
            }
        }
    },
};