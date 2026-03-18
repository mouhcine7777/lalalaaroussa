import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

// Background images (existing, shown behind the score)
const BACKGROUND_IMAGES = [
  '/sidikacem.jpg',
  '/Tanger.jpg',
  '/Taroudant.jpg',
  '/Taounat.jpg',
  '/Casablanca.jpg',
  '/Allemagne.jpg',
  '/Dakhla.jpg'
];

// Separate city images shown full-screen when dashboard triggers image mode
const CITY_IMAGES = [
  '/city-images/sidikacem.jpg',
  '/city-images/tanger.jpg',
  '/city-images/taroudant.jpg',
  '/city-images/taounat.jpg',
  '/city-images/casablanca.jpg',
  '/city-images/allemagne.jpg',
  '/city-images/dakhla.jpg'
];

const TabletDisplay = () => {
  const { id } = useParams();
  const tabletId = parseInt(id);
  const [displayScore, setDisplayScore] = useState(0);
  const [connected, setConnected] = useState(false);
  const [activeGame, setActiveGame] = useState(0);
  const [allScores, setAllScores] = useState([]);
  const [shouldDisplay, setShouldDisplay] = useState(true);
  const [showImage, setShowImage] = useState(false);

  const backgroundImage = BACKGROUND_IMAGES[tabletId] || BACKGROUND_IMAGES[0];
  const cityImage = CITY_IMAGES[tabletId] || CITY_IMAGES[0];

  useEffect(() => {
    let ws = null;
    
    const connectWebSocket = () => {
      const wsServerUrl = window.location.hostname === 'localhost' 
        ? `ws://localhost:3001` 
        : `ws://${window.location.hostname}:3001`;
      
      ws = new WebSocket(wsServerUrl);
      
      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({
          type: 'tablet_connected',
          tabletId: tabletId
        }));
      };
      
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connectWebSocket, 5000);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Tablet received message:', message);
          
          if (message.type === 'init') {
            const data = message.data;

            if (data.displayMode === 'image') {
              setShowImage(true);
            } else {
              setShowImage(false);
            }

            const isDisplayingScore = data.displayedTablets && data.displayedTablets[tabletId];
            setShouldDisplay(true);
            
            if (isDisplayingScore) {
              updateDisplayScore(data);
            }
            
            setActiveGame(data.activeGame);
            setAllScores(data.games);
          }
          else if (message.type === 'show_image') {
            setShowImage(true);
          }
          else if (message.type === 'show_scores') {
            setShowImage(false);
            setDisplayScore(0);
            setShouldDisplay(true);
          }
          else if (message.type === 'scores_updated') {
            const data = message.data;
            
            if (data.tabletId === undefined || data.tabletId === tabletId) {
              if (data.displayMode === 'total' || data.tabletId === tabletId) {
                setShouldDisplay(true);
                updateDisplayScore(data);
                setShowImage(false);
              }
              setActiveGame(data.activeGame);
              setAllScores(data.games);
            }
          }
          else if (message.type === 'reset_display') {
            setDisplayScore(0);
            setShouldDisplay(true);
            setShowImage(false);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };
    };
    
    const updateDisplayScore = (data) => {
      if (data.displayMode === 'total') {
        const totalScore = data.games.reduce((sum, game) => sum + (game[tabletId] || 0), 0);
        setDisplayScore(totalScore);
      } else {
        const currentScore = data.games[data.activeGame]?.[tabletId] || 0;
        setDisplayScore(currentScore);
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (ws) ws.close();
    };
  }, [tabletId]);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* Connection status */}
      <div
        style={{
          position: 'absolute', top: 8, right: 12,
          fontSize: '2rem', zIndex: 50,
          color: connected ? '#22c55e' : '#ef4444'
        }}
      >
        •
      </div>

      {showImage ? (
        /* ── IMAGE MODE: full-screen city image, no score ── */
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${cityImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      ) : (
        /* ── SCORE MODE: existing background + score number ── */
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '0vh',
          }}
        >
          <div
            style={{
              fontSize: '35rem',
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0px 20px 20px rgba(0,0,0,1)',
              marginTop: '-7rem',
            }}
          >
            {displayScore}
          </div>
        </div>
      )}
    </div>
  );
};

export default TabletDisplay;