const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong and latency!'),
    async execute(interaction) {
        try {
            const sent = await interaction.reply({ content: 'Pinging... 핑핑...', fetchReply: true });
            const latency = sent.createdTimestamp - interaction.createdTimestamp;
            const apiLatency = Math.round(interaction.client.ws.ping);

            await interaction.editReply(`🏓 Pong! Latency is ${latency}ms. API Latency is ${apiLatency}ms. 世界你好! (Hello World in Mandarin!)`);
            console.log(`Responded to /ping from ${interaction.user.tag} with latency info.`);
        } catch (error) {
            console.error(`Oof, couldn't send a reply for /ping: ${error}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "Sorry, fam, couldn't process that ping. My bad.", ephemeral: true });
            } else {
                await interaction.reply({ content: "Sorry, fam, couldn't process that ping. My bad.", ephemeral: true });
            }
        }
    },
};