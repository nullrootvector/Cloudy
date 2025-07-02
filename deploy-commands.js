const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Load configuration
let config;
try {
    const configPath = path.join(__dirname, 'config.json');
    config = require(configPath);
} catch (error) {
    console.error("💀 Whoopsie! config.json is missing or malformed");
    console.error("Please create a config.json file in the root directory with your BOT_TOKEN and CLIENT_ID.");
    process.exit(1);
}

const token = config.BOT_TOKEN;
const clientId = config.CLIENT_ID;
const guildId = config.GUILD_ID; // Optional: for guild-specific commands during development

if (!token || !clientId) {
    console.error("💔 Major heartbreak! BOT_TOKEN or CLIENT_ID is missing from your config.json. Can't deploy commands without them.");
    process.exit(1);
}

const commands = [];
// Grab all the command files from the commands directory you created earlier
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.warn(`[WARNING] The command at ${path.join(commandsPath, file)} is missing a required "data" or "execute" property.`);
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// Deploy your commands!
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        let data;
        if (guildId) {
            // For guild-based commands (faster for development)
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );
            console.log(`Successfully reloaded ${data.length} guild (/) commands.`);
        } else {
            // For global commands (takes up to an hour to propagate)
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );
            console.log(`Successfully reloaded ${data.length} global (/) commands.`);
        }

    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();
