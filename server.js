const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const sqlite3 = require('sqlite3').verbose();
const dbFile = process.env.DB_PATH || './leaderboard.db'; // Use persistent disk path if configured on Render
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS leaderboard
                (
                    name
                    TEXT
                    PRIMARY
                    KEY,
                    score
                    INTEGER
                )`, (err) => {
            if (err) console.error("Could not create table", err);
            else loadLeaderboard();
        });
    }
});

function loadLeaderboard() {
    db.all(`SELECT name, score FROM leaderboard ORDER BY score DESC LIMIT 50`, [], (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            globalLeaderboard = rows;
            io.emit('updateLeaderboard', globalLeaderboard);
        }
    });
}

function updateDatabaseScore(name, score) {
    db.get(`SELECT score FROM leaderboard WHERE name = ?`, [name], (err, row) => {
        if (err) return console.error(err);
        if (row) {
            if (score > row.score) {
                db.run(`UPDATE leaderboard SET score = ? WHERE name = ?`, [score, name], (err) => {
                    if (!err) loadLeaderboard();
                });
            }
        } else {
            db.run(`INSERT INTO leaderboard (name, score) VALUES (?, ?)`, [name, score], (err) => {
                if (!err) loadLeaderboard();
            });
        }
    });
}

let gameState = {
    players: {},
};

let globalLeaderboard = [];

let fruitIdCounter = 0;
let isPlaying = false;
let spawnTimer = null;

function spawnFruit() {
    if(!isPlaying) return;
    if (Math.random() < 0.9) { 
        let count = Math.floor(Math.random() * 3) + 1;
        let fruitsToSpawn = [];
        for(let i=0; i<count; i++) {
            fruitsToSpawn.push({
                id: fruitIdCounter++,
                rRand: Math.random(),
                xRand: Math.random(),
                vxRand: Math.random(),
                vyRand: Math.random(),
                typeRand: Math.random(),
                bombRand: Math.random() // For bomb check
            });
        }
        io.emit('spawnFruit', fruitsToSpawn);
    }
    spawnTimer = setTimeout(spawnFruit, 800 + Math.random() * 1200);
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    // Send current leaderboard to newly connected player
    socket.emit('updateLeaderboard', globalLeaderboard);

    socket.on('joinGame', (name) => {
        gameState.players[socket.id] = { id: socket.id, name: name, score: 0 };
        io.emit('updatePlayers', gameState.players);
        
        if(Object.keys(gameState.players).length >= 1 && !isPlaying) {
            isPlaying = true;
            spawnFruit();
            io.emit('startGame');
        }
    });

    socket.on('sliceFruit', (data) => {
        if(gameState.players[socket.id]) {
            io.emit('fruitSliced', { fruitId: data.id, playerId: socket.id, points: data.points, isBomb: data.isBomb });
        }
    });

    socket.on('submitScore', (data) => {
        let pName = data.name || 'Player';
        let pScore = data.score || 0;

        updateDatabaseScore(pName, pScore);
    });

    socket.on('mouseMove', (trail) => {
        socket.broadcast.emit('playerMouseMove', { id: socket.id, trail: trail });
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete gameState.players[socket.id];
        io.emit('updatePlayers', gameState.players);
        if(Object.keys(gameState.players).length === 0) {
            isPlaying = false;
            clearTimeout(spawnTimer);
        }
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let localIp = 'localhost';
    for (let k in interfaces) {
        for (let k2 in interfaces[k]) {
            let address = interfaces[k][k2];
            if (address.family === 'IPv4' && !address.internal) {
                localIp = address.address;
            }
        }
    }
    console.log(`Server running. LAN players can join at http://${localIp}:${PORT}`);
});
