// This is an example of a modular command.

module.exports = {
    name: 'ping', // The command name, used to trigger it (e.g., !ping)
    description: 'Replies with Pong and latency!', // A brief description of the command
    aliases: ['p', 'latency'], // Alternative names for the command
    // cooldown: 5, // Optional: cooldown in seconds for the command
    // args: false, // Optional: boolean, if the command requires arguments
    // usage: '<argument_name>', // Optional: example of how to use arguments

    /**
     * The main execution logic for the command.
     * @param {import('discord.js').Message} message The message object that triggered the command.
     * @param {string[]} args An array of arguments passed to the command.
     * @param {import('discord.js').Client} client The Discord client instance (passed from bot.js).
     * @param {object} config The configuration object (passed from bot.js).
     */
    async execute(message, args, client, config) {
        // We can access the client and config if needed
        // For example, to get the bot's latency: client.ws.ping
        try {
            const replyMessage = await message.reply('Pinging... 핑핑...');
            const latency = replyMessage.createdTimestamp - message.createdTimestamp;
            const apiLatency = Math.round(client.ws.ping);

            replyMessage.edit(`🏓 Pong! Latency is ${latency}ms. API Latency is ${apiLatency}ms. 世界你好! (Hello World in Mandarin!)`);
            console.log(`Responded to !ping from ${message.author.tag} with latency info.`);
        } catch (error) {
            console.error(`Oof, couldn't send a reply for !ping: ${error}`);
            await message.channel.send("Sorry, fam, couldn't process that ping. My bad.").catch(console.error);
        }
    }
};