# 🏰 Citadel

A dark fantasy tavern-style strategy card game. Build your tower, manage your resources, and outsmart your opponent.

## 📜 How to Play

The goal of **Citadel** is to be the first to build your **Tower** to height **50** or to destroy your opponent's Tower by reducing it to **0**.

### ⚒️ Resources
There are three types of resources, each produced by its own building every turn:

1.  🔴 **Bricks**: Produced by **Quarries**. Used for building walls and defense.
2.  🔵 **Gems**: Produced by **Magic**. Used for tower growth and spells.
3.  🟢 **Recruits**: Produced by **Dungeons**. Used for summoning units and attacking.

### 🃏 The Hand
- You hold **6 cards** at all times.
- Each card has a resource cost (Top-Right number).
- If a card icon is grayed out, you don't have enough resources to play it.

### 🎮 Controls
- **Left Click**: Play a card (if you have enough resources).
- **Right Click**: Discard a card to end your turn and draw a new one (Useful when "stuck" or "dead hand").
- **Hover**: View current vs required resources directly on the card.

---

## 🛠️ Tech Stack
- **React + Vite**
- **Vanilla CSS**
- **Node.js** (Simulation engine)

## 🏗️ Development
1.  Install dependencies: `npm install`
2.  Start dev server: `npm run dev`
3.  Run engine simulation: `node simulate.js 1000`

## 🚀 Deployment
This project is hosted on GitHub Pages.
- **URL**: [https://bellerswang.github.io/citadel/](https://bellerswang.github.io/citadel/)
