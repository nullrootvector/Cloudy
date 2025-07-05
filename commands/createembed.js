const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('createembed') // The name of the slash command
        .setDescription('Creates a custom embed message.') // The description of the command
        .addStringOption(option =>
            option.setName('title') // Option for the embed title
                .setDescription('The title of the embed')
                .setRequired(false)) // Optional
        .addStringOption(option =>
            option.setName('description') // Option for the embed description
                .setDescription('The description of the embed')
                .setRequired(false)) // Optional
        .addStringOption(option =>
            option.setName('color') // Option for the embed color (hex code)
                .setDescription('The color of the embed (hex code, e.g., #FF0000)')
                .setRequired(false)) // Optional
        .addStringOption(option =>
            option.setName('image_url') // Option for an image URL
                .setDescription('URL for an image to display in the embed')
                .setRequired(false)) // Optional
        .addStringOption(option =>
            option.setName('thumbnail_url') // Option for a thumbnail URL
                .setDescription('URL for a thumbnail image to display in the embed')
                .setRequired(false)) // Optional
        .addStringOption(option =>
            option.setName('footer_text') // Option for footer text
                .setDescription('Text for the embed footer')
                .setRequired(false)) // Optional
        .addStringOption(option =>
            option.setName('footer_icon_url') // Option for footer icon URL
                .setDescription('URL for an icon in the embed footer')
                .setRequired(false)) // Optional
        .addStringOption(option =>
            option.setName('author_name') // Option for author name
                .setDescription('Name for the embed author')
                .setRequired(false)) // Optional
        .addStringOption(option =>
            option.setName('author_icon_url') // Option for author icon URL
                .setDescription('URL for an icon next to the author name')
                .setRequired(false)) // Optional
        .addStringOption(option =>
            option.setName('url') // Option for a URL the title links to
                .setDescription('URL for the embed title to link to')
                .setRequired(false)) // Optional
        .addChannelOption(option =>
            option.setName('channel') // Option for the target channel
                .setDescription('The channel to send the embed to (defaults to current channel)')
                .setRequired(false)), // Optional

    // The execute function contains the command's logic
    async execute(interaction) {
        // Permission Check: User must have ManageMessages permission to use this command
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to manage messages to create custom embed messages.",
                ephemeral: true // Only visible to the user who ran the command
            });
        }

        // Get all the options provided by the user
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
        // Determine the target channel: either the one specified or the current channel
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        // Check if at least one content-related option is provided
        if (!title && !description && !imageUrl && !thumbnailUrl && !footerText && !authorName) {
            return interaction.reply({
                content: 'Please provide at least a title, description, image, thumbnail, footer text, or author name to create an embed message.',
                ephemeral: true
            });
        }

        // Create a new EmbedBuilder instance
        const embed = new EmbedBuilder();

        // Set embed properties if the corresponding options are provided
        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (color) embed.setColor(color); // Set color, Discord.js handles hex codes
        if (imageUrl) embed.setImage(imageUrl);
        if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
        if (url) embed.setURL(url); // Set URL for the title to link to

        // Set footer if text is provided
        if (footerText) {
            embed.setFooter({
                text: footerText,
                iconURL: footerIconUrl || undefined // Use iconURL if provided, otherwise undefined
            });
        }

        // Set author if name is provided
        if (authorName) {
            embed.setAuthor({
                name: authorName,
                iconURL: authorIconUrl || undefined // Use iconURL if provided, otherwise undefined
            });
        }

        try {
            // Send the embed to the target channel
            await targetChannel.send({ embeds: [embed] });
            // Confirm to the user that the embed was sent
            await interaction.reply({ content: `嵌入消息已发送到 ${targetChannel}。(Embed message sent to ${targetChannel}.)`, ephemeral: true });
        } catch (error) {
            // Catch any errors that occur during sending the embed
            console.error('Error creating custom embed:', error);
            // Reply to the interaction with an error message
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '创建自定义嵌入消息时发生错误。(An error occurred while creating the custom embed message.)', ephemeral: true });
            } else {
                await interaction.reply({ content: '创建自定义嵌入消息时发生错误。(An error occurred while creating the custom embed message.)', ephemeral: true });
            }
        }
    },
};