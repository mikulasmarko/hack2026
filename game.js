const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreBoard = document.getElementById("scoreBoard");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let lives = 3;
let gameOver = false;
let screenFlash = 0;
let isPlaying = false;
let darkMode = false;
let endlessMode = false;
let comboCount = 0;
let comboTexts = [];
let lastSliceTime = 0;
let lastSlicePos = {x: 0, y: 0};
let sliceDirection = null;

function applyCombo() {
    if (comboCount >= 3) {
        let bonus = comboCount * 10;
        score += bonus;
        updateScoreBoard();
        comboTexts.push({ x: lastSlicePos.x, y: lastSlicePos.y, text: `${comboCount} COMBO! +${bonus}`, life: 60 });
    }
    comboCount = 0;
    sliceDirection = null;
}

// Audio setup
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.5; // Default volume
masterGain.connect(audioCtx.destination);

function playSliceSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

function playBombSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.8);

    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
}

// Level Config
let currentLevel = 1;
let speedMod = 1.0;
let spawnRateMod = 1.0;

const bombImage = new Image();
bombImage.src = 'resources/StanislavKrajci.png';

const fruits = [];
const particles = [];
let mouse = { x: 0, y: 0, down: false };
let swipeTrail = [];

// UI Elements
const mainMenu = document.getElementById("mainMenu");
const levelsMenu = document.getElementById("levelsMenu");
const settingsMenu = document.getElementById("settingsMenu");
const leaderboardMenu = document.getElementById("leaderboardMenu");

const gameOverMenu = document.getElementById("gameOverMenu");
const finalScoreText = document.getElementById("finalScoreText");
const bestScoreText = document.getElementById("bestScoreText");
const inGameHomeBtn = document.getElementById("inGameHomeBtn");
const playerNameInput = document.getElementById("playerNameInput");

let savedScores = JSON.parse(localStorage.getItem('upjsNinjaBestScores')) || {};
let bestScores = {
    level1: savedScores.level1 || 0,
    level2: savedScores.level2 || 0,
    level3: savedScores.level3 || 0,
    level4: savedScores.level4 || 0,
    endless: savedScores.endless || 0
};

// Global dummy leaderboard storage just for demonstration without a real backend
let globalLeaderboard = JSON.parse(localStorage.getItem('upjsNinjaGlobalLeaderboard')) || [
    { name: "Sensei", score: 500 },
    { name: "Master Splinter", score: 400 },
    { name: "Shadow", score: 250 }
];

playerNameInput.value = localStorage.getItem('upjsNinjaPlayerName') || "Player1";

playerNameInput.addEventListener("input", (e) => {
    localStorage.setItem('upjsNinjaPlayerName', e.target.value || "Player1");
});

function updateMenuBestScores() {
    document.getElementById("bestLvl1").innerText = `(Best: ${bestScores.level1})`;
    document.getElementById("bestLvl2").innerText = `(Best: ${bestScores.level2})`;
    document.getElementById("bestLvl3").innerText = `(Best: ${bestScores.level3})`;
    document.getElementById("bestLvl4").innerText = `(Best: ${bestScores.level4})`;
    document.getElementById("bestEndlessScore").innerText = `Best: ${bestScores.endless}`;
    document.getElementById("bestQuickScore").innerText = `Best: ${bestScores.level2}`;
}

updateMenuBestScores();

document.getElementById("playBtn").addEventListener("click", () => startLevel(2)); // Default to medium
document.getElementById("endlessBtn").addEventListener("click", () => startEndlessMode());
document.getElementById("levelsBtn").addEventListener("click", () => {
    mainMenu.classList.add("hidden");
    levelsMenu.classList.remove("hidden");
});
document.getElementById("backLevelsBtn").addEventListener("click", () => {
    levelsMenu.classList.add("hidden");
    mainMenu.classList.remove("hidden");
});
document.querySelectorAll(".level-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        let lvl = parseInt(e.target.getAttribute("data-level"));
        startLevel(lvl);
    });
});

document.getElementById("leaderboardBtn").addEventListener("click", () => {
    mainMenu.classList.add("hidden");
    leaderboardMenu.classList.remove("hidden");
    updateLeaderboardUI();
});
document.getElementById("backLeaderboardBtn").addEventListener("click", () => {
    leaderboardMenu.classList.add("hidden");
    mainMenu.classList.remove("hidden");
});

function updateLeaderboardUI() {
    globalLeaderboard.sort((a, b) => b.score - a.score);
    const listHtml = globalLeaderboard.slice(0, 10).map((entry, index) => {
        let color = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'white';
        return `<div style="display: flex; justify-content: space-between; color: ${color}; margin-bottom: 5px; border-bottom: 1px solid #555; padding-bottom: 2px;">
                    <span>${index + 1}. ${entry.name}</span>
                    <span>${entry.score}</span>
                </div>`;
    }).join("");
    document.getElementById("leaderboardList").innerHTML = listHtml;
}

document.getElementById("settingsBtn").addEventListener("click", () => {
    mainMenu.classList.add("hidden");
    settingsMenu.classList.remove("hidden");
});
document.getElementById("themeBtn").addEventListener("click", () => {
    darkMode = !darkMode;
    canvas.style.background = darkMode ? "#333" : "#d4a373";
});
document.getElementById("volumeSlider").addEventListener("input", (e) => {
    masterGain.gain.value = e.target.value / 100;
});
document.getElementById("backBtn").addEventListener("click", () => {
    settingsMenu.classList.add("hidden");
    mainMenu.classList.remove("hidden");
});
document.getElementById("replayBtn").addEventListener("click", () => {
    if (endlessMode) {
        startEndlessMode();
    } else {
        startLevel(currentLevel);
    }
});
document.getElementById("homeBtn").addEventListener("click", () => {
    gameOverMenu.classList.add("hidden");
    mainMenu.classList.remove("hidden");
});
inGameHomeBtn.addEventListener("click", () => {
    isPlaying = false;
    gameOver = true;
    scoreBoard.classList.add("hidden");
    inGameHomeBtn.classList.add("hidden");
    mainMenu.classList.remove("hidden");
});

function updateMpScoreBoard() {
    if (!socket) return;
    let text = "";
    for(let id in mpPlayers) {
        if(id === socket.id) {
            text += `You: ${mpPlayers[id].score}  `;
        } else {
            text += `${mpPlayers[id].name}: ${mpPlayers[id].score}  `;
        }
    }
    scoreBoard.innerHTML = text;
}

function startMultiplayer() {
    isMultiplayer = true;
    endlessMode = true; // behaves conceptually like endless mode
    score = 0;
    lives = 1;
    gameOver = false;
    isPlaying = true;
    screenFlash = 0;
    fruits.length = 0;
    particles.length = 0;
    otherTrails = {};

    speedMod = 1.0;
    spawnRateMod = 1.0;

    updateMpScoreBoard();

    scoreBoard.classList.remove("hidden");
    inGameHomeBtn.classList.remove("hidden");
}

function startLevel(level) {
    currentLevel = level;
    isMultiplayer = false;
    endlessMode = false;
    score = 0;
    lives = 3;
    gameOver = false;
    isPlaying = true;
    screenFlash = 0;
    fruits.length = 0;
    particles.length = 0;

    // Configure difficulty based on level
    if (level === 1) {
        speedMod = 0.8;
        spawnRateMod = 1.2;
    } else if (level === 2) {
        speedMod = 1.0;
        spawnRateMod = 1.0;
    } else if (level === 3) {
        speedMod = 1.3;
        spawnRateMod = 0.8;
    } else if (level === 4) {
        speedMod = 1.6;
        spawnRateMod = 0.5;
    }

    updateScoreBoard();

    mainMenu.classList.add("hidden");
    levelsMenu.classList.add("hidden");
    gameOverMenu.classList.add("hidden");
    scoreBoard.classList.remove("hidden");
    inGameHomeBtn.classList.remove("hidden");
}

function startEndlessMode() {
    currentLevel = 2; // Set some base difficulty params
    endlessMode = true;
    isMultiplayer = false;
    score = 0;
    lives = 1; // Lives won't matter in endless unless hit a bomb? Wait, no lives.
    gameOver = false;
    isPlaying = true;
    screenFlash = 0;
    fruits.length = 0;
    particles.length = 0;

    speedMod = 1.0;
    spawnRateMod = 0.8;

    updateScoreBoard();

    mainMenu.classList.add("hidden");
    levelsMenu.classList.add("hidden");
    gameOverMenu.classList.add("hidden");
    scoreBoard.classList.remove("hidden");
    inGameHomeBtn.classList.remove("hidden");
}

function endGame() {
    if (!isPlaying) return; // Prevent multiple endgame calls
    isPlaying = false;
    gameOver = true;
    scoreBoard.classList.add("hidden");
    inGameHomeBtn.classList.add("hidden");
    gameOverMenu.classList.remove("hidden");
    finalScoreText.innerText = `Final Score: ${score}`;

    let isNewBest = false;
    let key = endlessMode ? 'endless' : `level${currentLevel}`;

    // Ensure the key exists in bestScores to prevent undefined
    if (bestScores[key] === undefined) {
        bestScores[key] = 0;
    }

    if (score > bestScores[key]) {
        bestScores[key] = score;
        localStorage.setItem('upjsNinjaBestScores', JSON.stringify(bestScores));
        isNewBest = true;
        updateMenuBestScores();
    }

    if (isNewBest) {
        bestScoreText.innerText = `New Best Score!`;
        bestScoreText.classList.remove("hidden");
    } else {
        bestScoreText.innerText = `Best: ${bestScores[key]}`;
        bestScoreText.classList.remove("hidden");
    }

    // Add current run to leaderboard only if it's quick play (not endless)
    if (!endlessMode) {
        let pName = playerNameInput.value.trim() || 'Player1';
        let existingEntry = globalLeaderboard.find(e => e.name === pName);
        if (existingEntry) {
            if (score > existingEntry.score) {
                existingEntry.score = score;
            }
        } else {
            globalLeaderboard.push({ name: pName, score: score });
        }
        globalLeaderboard.sort((a, b) => b.score - a.score);

        // Keep only top 50 globally to save storage
        if (globalLeaderboard.length > 50) globalLeaderboard.length = 50;
        localStorage.setItem('upjsNinjaGlobalLeaderboard', JSON.stringify(globalLeaderboard));
    }
}

// Handle resizing
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Mouse/touch events for PC
window.addEventListener("mousedown", (e) => {
    mouse.down = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    swipeTrail = [{x: mouse.x, y: mouse.y}];
});

window.addEventListener("mouseup", () => {
    mouse.down = false;
    swipeTrail = [];
    applyCombo();
});

window.addEventListener("mousemove", (e) => {
    if (mouse.down) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        swipeTrail.push({x: mouse.x, y: mouse.y});
        if (swipeTrail.length > 10) swipeTrail.shift();
    }
});

// Touch support
window.addEventListener("touchstart", (e) => {
    mouse.down = true;
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
    swipeTrail = [{x: mouse.x, y: mouse.y}];
});
window.addEventListener("touchend", () => {
    mouse.down = false;
    swipeTrail = [];
    applyCombo();
});
window.addEventListener("touchmove", (e) => {
    if (mouse.down) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        swipeTrail.push({x: mouse.x, y: mouse.y});
        if (swipeTrail.length > 10) swipeTrail.shift();
    }
});

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.color = color;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.05;
    }
    draw() {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class Fruit {
    constructor() {
        this.r = 30 + Math.random() * 20;
        this.x = Math.random() * (canvas.width - this.r * 2) + this.r;
        this.y = canvas.height + this.r;
        this.vx = ((Math.random() - 0.5) * 6) * speedMod;
        this.vy = -(12 + Math.random() * 6) * speedMod;
        this.gravity = 0.2 * speedMod;

        const types = [
            { c: 'red', v: 10, name: 'apple' },
            { c: 'orange', v: 15, name: 'orange' },
            { c: 'yellow', v: 20, name: 'lemon' },
            { c: 'green', v: 30, name: 'watermelon' },
        ];
        // Bomb chances based on level
        let bombChance = 0;
        if (currentLevel >= 3) {
            bombChance = 0.2;
        } else if (currentLevel === 2) {
            bombChance = 0.05; // Less frequent on medium
        }

        if (bombChance > 0 && Math.random() < bombChance) {
            this.type = { c: '#333', v: -1, name: 'bomb' };
        } else {
            this.type = types[Math.floor(Math.random() * types.length)];
        }
        this.sliced = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;

        // Bounce off walls
        if (this.x - this.r < 0) {
            this.x = this.r;
            this.vx *= -1;
        } else if (this.x + this.r > canvas.width) {
            this.x = canvas.width - this.r;
            this.vx *= -1;
        }
    }

    draw() {
        if (this.sliced) return;

        if (this.type.name === 'bomb' && bombImage.complete && bombImage.naturalWidth !== 0) {
            ctx.drawImage(bombImage, this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
        } else {
            ctx.fillStyle = this.type.c;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.stroke();

            if (this.type.name === 'bomb') {
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(this.x, this.y - this.r, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    checkSlice(tx, ty) {
        if (this.sliced) return false;
        let dx = tx - this.x;
        let dy = ty - this.y;
        if (Math.sqrt(dx * dx + dy * dy) < this.r + 5) {
            this.sliced = true;
            if (this.type.name === 'bomb') {
                playBombSound();

                lives = 0; // Immediate game over for both modes
                screenFlash = 1.0; // Flash the screen explosion
                createParticles(this.x, this.y, 'white');
                comboCount = 0; // Break combo
                updateScoreBoard();

                // Explicitly stop playing and show game over menu
                endGame();

                return false;
            } else {
                playSliceSound();
                score += this.type.v;
                createParticles(this.x, this.y, this.type.c);
                updateScoreBoard();
                return true;
            }
        }
        return false;
    }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function updateScoreBoard() {
    if (endlessMode) {
        scoreBoard.innerHTML = `Score: ${score} | Endless`;
        if (lives <= 0 && isPlaying) {
            endGame();
        }
    } else {
        let hearts = '❤️'.repeat(Math.max(0, lives));
        scoreBoard.innerHTML = `Score: ${score} | ${hearts}`;
        if (lives <= 0 && isPlaying) {
            endGame();
        }
    }
}

function spawnFruit() {
    if (isPlaying && !gameOver) {
        if (Math.random() < 0.9) { // 90% chance to spawn 1-3 fruits
            let count = Math.floor(Math.random() * 3) + 1;
            // Higher levels can spawn more fruits
            if (currentLevel >= 3) count += Math.floor(Math.random() * 2);
            for(let i=0; i<count; i++) fruits.push(new Fruit());
        }
    }
    setTimeout(spawnFruit, (800 + Math.random() * 1200) * spawnRateMod);
}

function drawTrail() {
    if (swipeTrail.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(swipeTrail[0].x, swipeTrail[0].y);
        for (let i = 1; i < swipeTrail.length; i++) {
            ctx.lineTo(swipeTrail[i].x, swipeTrail[i].y);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (screenFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${screenFlash})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        screenFlash -= 0.015; // Slower explosion (longer flash)
    }

    if (!isPlaying) {
        // Just draw some background stuff or return
    } else if (gameOver) {
        // We now handle game over via HTML menu
    } else {
        // Update & Draw Fruits
        for (let i = fruits.length - 1; i >= 0; i--) {
            let f = fruits[i];
            f.update();
            f.draw();

            if (mouse.down && swipeTrail.length > 0) {
                if (f.checkSlice(mouse.x, mouse.y)) {
                    let now = Date.now();
                    if (comboCount === 0) {
                        comboCount = 1;
                        lastSlicePos = {x: mouse.x, y: mouse.y};
                        lastSliceTime = now;
                        sliceDirection = null;
                    } else {
                        let dt = now - lastSliceTime;
                        let dx = mouse.x - lastSlicePos.x;
                        let dy = mouse.y - lastSlicePos.y;
                        let dist = Math.sqrt(dx * dx + dy * dy);

                        let isValid = dt < 400; // combo breaks if > 400ms passes

                        if (dist > 5) {
                            let currDir = {x: dx / dist, y: dy / dist};
                            if (sliceDirection) {
                                let dot = sliceDirection.x * currDir.x + sliceDirection.y * currDir.y;
                                if (dot < 0) isValid = false; // combo breaks if direction changes drastically
                            }
                            if (isValid) sliceDirection = currDir;
                        }

                        if (isValid) {
                            comboCount++;
                            lastSlicePos = {x: mouse.x, y: mouse.y};
                            lastSliceTime = now;
                        } else {
                            applyCombo(); // Apply previous valid combo
                            comboCount = 1; // Start a new one
                            lastSlicePos = {x: mouse.x, y: mouse.y};
                            lastSliceTime = now;
                            sliceDirection = null;
                        }
                    }
                }
            }

            if (f.y - f.r > canvas.height && f.vy > 0) {
                if (!f.sliced && f.type.name !== 'bomb' && !endlessMode) {
                    lives--;
                    updateScoreBoard();
                }
                fruits.splice(i, 1);
            } else if (f.sliced) {
                fruits.splice(i, 1);
            }
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.update();
            p.draw();
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Combo Texts
        for (let i = comboTexts.length - 1; i >= 0; i--) {
            let ct = comboTexts[i];
            ctx.fillStyle = `rgba(255, 255, 0, ${ct.life / 60})`;
            ctx.font = "bold 30px Arial";
            ctx.fillText(ct.text, ct.x, ct.y);
            ct.y -= 1;
            ct.life -= 1;
            if (ct.life <= 0) comboTexts.splice(i, 1);
        }

        // Apply a pending combo if time runs out while mouse is still down
        if (comboCount > 0 && Date.now() - lastSliceTime > 400) {
            applyCombo();
        }

        drawTrail();
    }

    requestAnimationFrame(gameLoop);
}

// Start
spawnFruit();
gameLoop();
