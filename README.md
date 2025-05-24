# Multiplayer Trophy Game

A real-time multiplayer turn-based game where players compete to reach the trophy first while navigating through obstacles and dynamic paths. Built with React, TypeScript, and Firebase.

## Game Features

- **Multiplayer Support**: 2-7 players can play together in real-time
- **Dynamic Board Sizes**: 
  - 20x20 (2-4 players)
  - 30x30 (5-6 players) 
  - 40x40 (7 players)
- **Turn-based Movement**: Players take turns moving one cell at a time
- **Smart Starting Positions**: Players start at vertices of an N-gon based on player count
- **Central Trophy**: The goal is located at the center of the board
- **Dynamic Path System**: Paths regenerate after each turn, creating new routes
- **Obstacle System**: Three types of obstacles that affect gameplay
- **Real-time Synchronization**: Powered by Firebase Realtime Database

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

1. **Create or Join a Room**:
   - Create a new room: Choose player count and map size
   - Join existing room: Enter the Room ID shared by the host
   
2. **Game Setup**:
   - Wait for other players (minimum 2 players required)
   - Host can start the game when ready
   - Players are positioned at equal distances from the center

3. **Gameplay**:
   - Take turns moving using arrow controls (↑ ↓ ← →)
   - Follow the green highlighted paths
   - Navigate around or through obstacles
   - Race to reach the golden trophy in the center

4. **Victory**: First player to reach the trophy wins!

## Game Rules

### Movement Rules
- Players can only move on generated paths (highlighted in green)
- One cell movement per turn
- Cannot move through blocking obstacles
- Paths regenerate after each player's turn

### Obstacle Types
- **↩️ Reset Obstacle (Orange)**: Sends you back to your starting position
- **❄️ Freeze Obstacle (Blue)**: Freezes you for 2 turns
- **🚫 Block Obstacle (Red)**: Cannot pass through, must go around

### Obstacle Mechanics
- Obstacles cover 12.5% of the map
- They relocate every 3-7 turns randomly
- Safe zones exist around starting positions and the trophy

### Board Size Rules
- **20x20**: Available for 2-4 players (50 obstacles)
- **30x30**: Available for 2-7 players (112 obstacles)
- **40x40**: Required for 7 players (200 obstacles)

## Game Strategy Tips

- **Plan Your Route**: Paths change every turn, so think ahead
- **Use Obstacles Wisely**: Sometimes hitting a reset obstacle can be strategic
- **Watch Frozen Players**: Take advantage when opponents are frozen
- **Block Opponents**: Position yourself to force others into obstacles
- **Center Control**: Try to maintain positions closer to the trophy

## Technologies Used

- **Frontend**: React + TypeScript
- **Real-time Backend**: Firebase Realtime Database
- **Build Tool**: Vite
- **Styling**: CSS3 with dynamic sizing
- **State Management**: React Hooks + Firebase listeners

## Features Overview

- Room-based multiplayer system with unique Room IDs
- Dynamic board sizing based on player count
- Real-time player position synchronization
- Turn management with skip-turn mechanics
- Obstacle collision detection and effects
- Responsive design for different screen sizes
- Player disconnection handling
- Visual indicators for game state (turns, frozen players, paths)

## Deployment

The game can be deployed using Firebase Hosting:

```bash
npm run deploy
```

For preview deployments:
```bash
npm run deploy:preview
```

## Environment Variables

Create a `.env` file with your Firebase configuration:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_DATABASE_URL=your_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## License

This project is open source and available under the MIT License.