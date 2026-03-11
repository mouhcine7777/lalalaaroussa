const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
// Enable CORS for all routes
app.use(cors());
app.use(express.static(path.join(__dirname, 'build')));

app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store current scores
let currentScores = {
  games: Array(10).fill(0).map(() => Array(7).fill(0)),
  displayMode: 'individual', // 'individual', 'total', or 'image'
  activeTablet: null,
  activeGame: 0,
  displayedTablets: Array(7).fill(false)
};

// Store tablet connections separately to allow individual updates
const tabletConnections = new Map(); // Maps tabletId -> connection

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send current state to newly connected client
  ws.send(JSON.stringify({
    type: 'init',
    data: currentScores
  }));

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      console.log('Received message from client:', msg);
      
      if (msg.type === 'tablet_connected') {
        const tabletId = msg.tabletId;
        if (tabletId !== undefined && tabletId >= 0 && tabletId <= 6) {
          console.log(`Tablet ${tabletId} connected`);
          tabletConnections.set(parseInt(tabletId), ws);
          
          ws.send(JSON.stringify({
            type: 'init',
            data: currentScores
          }));
        }
      }
      else if (msg.type === 'show_images') {
        // Switch all tablets to image display mode
        currentScores.displayMode = 'image';
        currentScores.displayedTablets = Array(7).fill(true);

        console.log('Switching all tablets to image mode');

        // Send image mode to every tablet
        for (let [tabletId, tabletWs] of tabletConnections.entries()) {
          if (tabletWs && tabletWs.readyState === WebSocket.OPEN) {
            tabletWs.send(JSON.stringify({
              type: 'show_image',
              data: { tabletId }
            }));
          }
        }

        // Update admin dashboards
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && !isTabletConnection(client)) {
            client.send(JSON.stringify({
              type: 'init',
              data: currentScores
            }));
          }
        });
      }
      else if (msg.type === 'show_scores') {
        // Switch all tablets back to score display mode
        currentScores.displayMode = 'individual';
        currentScores.displayedTablets = Array(7).fill(false);

        console.log('Switching all tablets back to score mode');

        // Tell all tablets to go back to score view
        for (let [tabletId, tabletWs] of tabletConnections.entries()) {
          if (tabletWs && tabletWs.readyState === WebSocket.OPEN) {
            tabletWs.send(JSON.stringify({
              type: 'show_scores',
              data: {}
            }));
          }
        }

        // Update admin dashboards
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && !isTabletConnection(client)) {
            client.send(JSON.stringify({
              type: 'init',
              data: currentScores
            }));
          }
        });
      }
      else if (msg.type === 'update_specific_tablet') {
        const tabletId = msg.data.tabletId;
        
        currentScores.games = msg.data.games;
        currentScores.activeGame = msg.data.activeGame;
        
        if (msg.data.displayedTablets) {
          currentScores.displayedTablets = msg.data.displayedTablets;
        }
        
        const tabletWs = tabletConnections.get(tabletId);
        
        if (tabletWs && tabletWs.readyState === WebSocket.OPEN) {
          console.log(`Sending update to tablet ${tabletId}`);
          tabletWs.send(JSON.stringify({
            type: 'scores_updated',
            data: {
              games: msg.data.games,
              displayMode: 'individual',
              activeTablet: tabletId,
              activeGame: msg.data.activeGame,
              tabletId: tabletId,
              displayedTablets: currentScores.displayedTablets
            }
          }));
        } else {
          console.log(`Tablet ${tabletId} not connected or not ready`);
        }
        
        wss.clients.forEach((client) => {
          if (client !== tabletWs && client.readyState === WebSocket.OPEN && !isTabletConnection(client)) {
            client.send(JSON.stringify({
              type: 'init',
              data: currentScores
            }));
          }
        });
      }
      else if (msg.type === 'update_all_tablets') {
        currentScores.games = msg.data.games || currentScores.games;
        currentScores.displayMode = msg.data.displayMode || currentScores.displayMode;
        currentScores.activeTablet = msg.data.activeTablet !== undefined ? msg.data.activeTablet : currentScores.activeTablet;
        
        if (msg.data.activeGame !== undefined) {
          currentScores.activeGame = msg.data.activeGame;
        }
        
        if (msg.data.displayedTablets) {
          currentScores.displayedTablets = msg.data.displayedTablets;
        }
        
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'scores_updated',
              data: currentScores
            }));
          }
        });
      }
      else if (msg.type === 'active_game_changed') {
        if (msg.data.activeGame !== undefined) {
          currentScores.activeGame = msg.data.activeGame;
          currentScores.games = msg.data.games || currentScores.games;
        }
        
        for (let tabletId = 0; tabletId < currentScores.displayedTablets.length; tabletId++) {
          if (currentScores.displayedTablets[tabletId]) {
            const tabletWs = tabletConnections.get(tabletId);
            
            if (tabletWs && tabletWs.readyState === WebSocket.OPEN) {
              tabletWs.send(JSON.stringify({
                type: 'scores_updated',
                data: {
                  games: currentScores.games,
                  displayMode: 'individual',
                  activeTablet: tabletId,
                  activeGame: currentScores.activeGame,
                  tabletId: tabletId,
                  displayedTablets: currentScores.displayedTablets
                }
              }));
            }
          }
        }
        
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && !isTabletConnection(client)) {
            client.send(JSON.stringify({
              type: 'init',
              data: currentScores
            }));
          }
        });
      }
      else if (msg.type === 'reset_all_tablets') {
        if (msg.data.displayedTablets) {
          currentScores.displayedTablets = msg.data.displayedTablets;
        }
        
        for (let [tabletId, tabletWs] of tabletConnections.entries()) {
          if (tabletWs && tabletWs.readyState === WebSocket.OPEN) {
            tabletWs.send(JSON.stringify({
              type: 'reset_display',
              data: { tabletId }
            }));
          }
        }
        
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && !isTabletConnection(client)) {
            client.send(JSON.stringify({
              type: 'init',
              data: currentScores
            }));
          }
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    tabletConnections.forEach((connection, tabletId) => {
      if (connection === ws) {
        console.log(`Tablet ${tabletId} disconnected`);
        tabletConnections.delete(tabletId);
      }
    });
  });
});

function isTabletConnection(connection) {
  let isTablet = false;
  tabletConnections.forEach((tabletConnection) => {
    if (connection === tabletConnection) {
      isTablet = true;
    }
  });
  return isTablet;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Server IP: ${getLocalIpAddress()}`);
});

function getLocalIpAddress() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}