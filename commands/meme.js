const { EmbedBuilder } = require('discord.js');
const https = require('https');

module.exports = {
    name: 'meme',
    description: 'Sends a random meme from r/memes.',
    aliases: ['memes', 'funny'],
    usage: '',

    async execute(message, args) {
        https.get('https://meme-api.com/gimme', (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const meme = JSON.parse(data);
                    const embed = new EmbedBuilder()
                        .setTitle(meme.title)
                        .setImage(meme.url)
                        .setURL(meme.postLink)
                        .setFooter({ text: `👍 ${meme.ups} | r/${meme.subreddit}` });

                    message.channel.send({ embeds: [embed] });
                } catch (err) {
                    console.error('Failed to parse meme:', err);
                    message.channel.send('Could not fetch a meme at this time. Try again later!');
                }
            });

        }).on('error', (err) => {
            console.error('API call error:', err);
            message.channel.send('Something went wrong while fetching the meme.');
        });
    },
};