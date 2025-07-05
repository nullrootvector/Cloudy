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
        lastDaily INTEGER
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS levels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        guildId TEXT NOT NULL,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 0
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
});

module.exports = db;
