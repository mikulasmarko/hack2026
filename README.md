npm install
node server.js# UPJS Ninja 🍉🍎🍋🍅

A browser-based multiplayer "Fruit Ninja" clone built with JavaScript, HTML5 Canvas, Node.js, and Socket.io.

## Features ✨

*   **Classic Gameplay**: Slice the fruits and avoid the bombs! Combos reward extra points.
*   **Multiple Difficulty Levels**:
    *   Easy (Slower fruits, higher spawn rate)
    *   Medium
    *   Hard
    *   Ninja (Extremely fast)
*   **Endless Mode**: Play until you run out of lives or hit a bomb.
*   **Multiplayer**: Enjoy the experience with multiple devices. All connected players compete together!
*   **Global Leaderboard**: The best scores from the "Quick Play" (level-based) mode are synced across all connected devices in real-time.
*   **Themes**: Toggle between Light and Dark mode.
*   **Sound Effects**: Procedurally generated audio effects using the Web Audio API.

## Requirements 📦

*   [Node.js](https://nodejs.org/) (Version 18+ recommended)
*   npm (comes with Node.js)

## Installation & Setup 🚀

1.  **Clone or create the directory:** Enter the root folder of the project.
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the Server:**
    ```bash
    node server.js
    ```
4.  **Play the Game:**
    *   Open your web browser.
    *   Navigate to `http://localhost:3000`.
    *   The server console will also output your local IP address (e.g., `http://192.168.X.X:3000`), which allows other devices on the same Wi-Fi network to connect and play multiplayer.

## Controls 🎮

*   **Mouse (Desktop):** Click and drag the mouse across the screen to slice the fruits.
*   **Touch (Mobile/Tablet):** Touch and swipe on the screen to slice.

## Combos 💥

If you slice 3 or more fruits within a short time (400ms) without drastically changing your slice direction, you perform a combo!
*   A combo grants bonus points: `Combo Count * 10`.

## Architecture 🛠️

*   **Frontend**: 
    *   `index.html`: UI Structure containing the main menu, settings, leaderboard, and the game canvas.
    *   `game.js`: The core client-side game loop via `requestAnimationFrame`, handling rendering, physics update, collision detection (slicing), audio, and socket communication.
*   **Backend**: 
    *   `server.js`: Uses Express to serve the static frontend files and Socket.io for managing real-time multiplayer connections, game state synchronization, and the shared global leaderboard.
*   **Resources**: Contains PNG images for the bomb and fruits (`01.png`, `02.png`, `03.png`, `04.png`).

