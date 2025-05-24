# Multiplayer Trophy Game

A real-time multiplayer turn-based game where players compete to reach the trophy first. Built with React, TypeScript, and Firebase.

## Game Features

- 2-7 players can play together in real-time
- 40x40 grid board with dynamic path generation
- Turn-based movement system
- Players start at corners forming an N-gon based on player count
- Trophy in the center of the board
- Paths change after each turn
- Real-time synchronization using Firebase

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Firebase project:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Realtime Database
   - Set database rules to:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```

4. Copy `.env.example` to `.env` and fill in your Firebase configuration:
   ```bash
   cp .env.example .env
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## How to Play

1. Create a room or join an existing room with a Room ID
2. Wait for other players to join (minimum 2 players)
3. Host starts the game when ready
4. Players take turns moving using arrow controls
5. Follow the green paths to reach the trophy
6. First player to reach the trophy wins!

## Game Rules

- Players can only move on the generated paths (shown in green)
- Paths regenerate after each turn
- Players move one cell at a time
- The game ends when a player reaches the trophy

## Technologies Used

- React + TypeScript
- Firebase Realtime Database
- Vite
- CSS3 for styling
