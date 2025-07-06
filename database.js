const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./cloudy.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the cloudy database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        guildId TEXT NOT NULL,
        reason TEXT,
        moderatorId TEXT NOT NULL,
        timestamp INTEGER NOT NULL
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS badwords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guildId TEXT NOT NULL,
        word TEXT NOT NULL
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS economy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        guildId TEXT NOT NULL,
        balance INTEGER NOT NULL DEFAULT 0,
        lastDaily INTEGER,
        lastWork INTEGER,
        lastCrime INTEGER,
        lastPassiveIncome INTEGER,
        lastRob INTEGER
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS shop_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guildId TEXT NOT NULL,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        description TEXT
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guildId TEXT NOT NULL,
        userId TEXT NOT NULL,
        channelId TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        timestamp INTEGER NOT NULL
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS reaction_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guildId TEXT NOT NULL,
        messageId TEXT NOT NULL,
        emoji TEXT NOT NULL,
        roleId TEXT NOT NULL
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS tempbans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        guildId TEXT NOT NULL,
        unbanTime INTEGER NOT NULL,
        reason TEXT,
        moderatorId TEXT NOT NULL
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS custom_commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guildId TEXT NOT NULL,
        commandName TEXT NOT NULL,
        commandResponse TEXT NOT NULL
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS giveaways (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        messageId TEXT NOT NULL,
        channelId TEXT NOT NULL,
        guildId TEXT NOT NULL,
        endTime INTEGER NOT NULL,
        prize TEXT NOT NULL,
        winnerCount INTEGER NOT NULL,
        hostId TEXT NOT NULL,
        ended BOOLEAN NOT NULL DEFAULT 0
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS user_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        guildId TEXT NOT NULL,
        itemId INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (itemId) REFERENCES shop_items(id)
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS marketplace_listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sellerId TEXT NOT NULL,
        guildId TEXT NOT NULL,
        itemId INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (itemId) REFERENCES shop_items(id)
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });
});

module.exports = db;
