import React, { useState, useEffect, useRef } from 'react';

const TOTAL_GAMES = 10;
const TOTAL_PLAYERS = 7;
const CITY_NAMES = ['sidi kacem', 'Tanger', 'Taroudant', 'Taounat', 'Casablanca', 'Allemagne', 'Dakhla'];

const Dashboard = () => {
  const [games, setGames] = useState(Array(TOTAL_GAMES).fill(0).map(() => Array(TOTAL_PLAYERS).fill(0)));
  const [displayMode, setDisplayMode] = useState('individual');
  const [activeTablet, setActiveTablet] = useState(null);
  const [activeGame, setActiveGame] = useState(0);
  const [connected, setConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [displayedTablets, setDisplayedTablets] = useState(Array(TOTAL_PLAYERS).fill(false));
  const ws = useRef(null);

  useEffect(() => {
    const wsServerUrl = window.location.hostname === 'localhost' 
      ? `ws://localhost:3001` 
      : `ws://${window.location.hostname}:3001`;
    
    setServerUrl(wsServerUrl.replace('ws://', 'http://'));
    
    ws.current = new WebSocket(wsServerUrl);
    
    ws.current.onopen = () => {
      console.log('Connected to WebSocket server');
      setConnected(true);
    };
    
    ws.current.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setConnected(false);
      setTimeout(() => {
        const newWs = new WebSocket(wsServerUrl);
        ws.current = newWs;
      }, 3000);
    };
    
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        
        if (message.type === 'init') {
          setGames(message.data.games);
          setDisplayMode(message.data.displayMode);
          setActiveTablet(message.data.activeTablet);
          setActiveGame(message.data.activeGame || 0);
          if (message.data.displayedTablets) {
            setDisplayedTablets(message.data.displayedTablets);
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };
    
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  const sendMessage = (type, data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, data }));
    } else {
      alert('Not connected to server. Please refresh the page.');
    }
  };

  const handleShowImages = () => {
    setDisplayMode('image');
    sendMessage('show_images', {});
  };

  const handleShowScores = () => {
    setDisplayMode('individual');
    const newDisplayedTablets = Array(TOTAL_PLAYERS).fill(false);
    setDisplayedTablets(newDisplayedTablets);
    sendMessage('show_scores', {});
  };

  const updateSpecificTablet = (tabletId) => {
    const newDisplayedTablets = [...displayedTablets];
    newDisplayedTablets[tabletId] = true;
    setDisplayedTablets(newDisplayedTablets);
    
    sendMessage('update_specific_tablet', {
      games,
      displayMode: 'individual',
      tabletId,
      activeGame,
      displayedTablets: newDisplayedTablets
    });
  };
  
  const updateAllTablets = () => {
    sendMessage('update_all_tablets', {
      games,
      displayMode,
      activeTablet,
      activeGame,
      displayedTablets
    });
  };
  
  const handleScoreChange = (gameIndex, playerIndex, value) => {
    const newGames = [...games];
    newGames[gameIndex][playerIndex] = parseInt(value) || 0;
    setGames(newGames);
  };
  
  const handleDisplayIndividual = (tabletId) => {
    setDisplayMode('individual');
    setActiveTablet(tabletId);
    setTimeout(() => updateSpecificTablet(tabletId), 100);
  };
  
  const handleDisplayTotal = () => {
    setDisplayMode('total');
    setActiveTablet(null);
    const allDisplayed = Array(TOTAL_PLAYERS).fill(true);
    setDisplayedTablets(allDisplayed);
    
    setTimeout(() => {
      sendMessage('update_all_tablets', {
        games,
        displayMode: 'total',
        activeTablet: null,
        activeGame,
        displayedTablets: allDisplayed
      });
    }, 100);
  };

  const handleSetActiveGame = (gameIndex) => {
    setActiveGame(gameIndex);
    setTimeout(() => {
      sendMessage('active_game_changed', {
        games,
        displayMode,
        activeTablet,
        activeGame: gameIndex,
        displayedTablets
      });
    }, 100);
  };
  
  const getPlayerTotal = (playerIndex) => {
    return games.reduce((sum, game) => sum + game[playerIndex], 0);
  };

  const resetAllScores = () => {
    const newDisplayedTablets = Array(TOTAL_PLAYERS).fill(false);
    setDisplayedTablets(newDisplayedTablets);
    sendMessage('reset_all_tablets', { displayedTablets: newDisplayedTablets });
  };

  // Active button style: red glowing border. Inactive: normal.
  const activeButtonStyle = {
    border: '4px solid #ef4444',
    boxShadow: '0 0 12px 3px rgba(239,68,68,0.7)',
    outline: 'none',
  };
  const inactiveButtonStyle = {
    border: '4px solid transparent',
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-black text-3xl font-bold mb-4">Score Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className={`w-4 h-4 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span>{connected ? 'Connected to server' : 'Disconnected'}</span>
          </div>
          <div>
            <p className="text-black text-sm">Tablet URLs:</p>
            <p className="text-xs text-gray-500">{serverUrl}/tablet/[0-6]</p>
          </div>
        </div>

        {/* City Image Display */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
          <h2 className="text-black text-xl font-semibold mb-3">City Image Display</h2>
          <div className="flex space-x-4">
            <button
              style={displayMode === 'image' ? activeButtonStyle : inactiveButtonStyle}
              className={`px-6 py-3 rounded-lg font-bold text-lg text-white transition-colors
                ${displayMode === 'image' ? 'bg-yellow-600' : 'bg-yellow-500 hover:bg-yellow-600'}`}
              onClick={handleShowImages}
            >
              Show City Images on All Tablets
            </button>
            <button
              style={displayMode !== 'image' ? activeButtonStyle : inactiveButtonStyle}
              className={`px-6 py-3 rounded-lg font-bold text-lg text-white transition-colors
                ${displayMode !== 'image' ? 'bg-indigo-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
              onClick={handleShowScores}
            >
              Back to Score View
            </button>
          </div>
          {displayMode === 'image' && (
            <p className="mt-2 text-yellow-700 font-semibold">
              ✅ All tablets are currently showing their city image.
            </p>
          )}
        </div>
        
        {/* Active Game Selection */}
        <div className="mb-6">
          <h2 className="text-black text-xl font-semibold mb-2">Active Game</h2>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {Array.from({ length: TOTAL_GAMES }).map((_, gameIndex) => (
              <button
                key={gameIndex}
                className={`text-black px-4 py-2 ${activeGame === gameIndex ? 'bg-purple-600 text-white' : 'bg-gray-200'} rounded-md`}
                onClick={() => handleSetActiveGame(gameIndex)}
              >
                Game {gameIndex + 1}
              </button>
            ))}
          </div>
          <p className="text-sm mt-2">
            <span className="text-black font-bold">Current active game: {activeGame + 1}</span>
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="text-black px-4 py-2 border">Game / City</th>
                {CITY_NAMES.map((city, cityIndex) => (
                  <th key={cityIndex} className="text-black px-4 py-2 border">
                    {city}
                    {displayedTablets[cityIndex] && (
                      <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full" 
                            title="Currently displayed on tablet"></span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {games.map((game, gameIndex) => (
                <tr 
                  key={gameIndex} 
                  className={activeGame === gameIndex ? 'bg-purple-100' : ''}
                >
                  <td className="text-black px-4 py-2 border font-semibold flex items-center justify-between">
                    <span>Game {gameIndex + 1}</span>
                    {activeGame !== gameIndex && (
                      <button 
                        className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded"
                        onClick={() => handleSetActiveGame(gameIndex)}
                      >
                        Activate
                      </button>
                    )}
                  </td>
                  {game.map((score, playerIndex) => (
                    <td key={playerIndex} className="px-4 py-2 border">
                      <input
                        type="number"
                        className="text-black w-full p-2 border rounded"
                        value={score}
                        onChange={(e) => handleScoreChange(gameIndex, playerIndex, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-gray-100">
                <td className="text-black px-4 py-2 border font-bold">Total</td>
                {Array.from({ length: TOTAL_PLAYERS }).map((_, playerIndex) => (
                  <td key={playerIndex} className="text-black px-4 py-2 border font-bold text-center">
                    {getPlayerTotal(playerIndex)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 grid grid-cols-4 gap-4">
          {CITY_NAMES.map((city, tabletIndex) => (
            <div key={tabletIndex} className="flex flex-col items-center">
              <p className="text-black mb-2">{city}</p>
              <button
                className={`px-4 py-2 ${displayedTablets[tabletIndex] ? 'bg-green-500' : 'bg-blue-500'} text-white rounded hover:bg-blue-600 mb-2 w-full`}
                onClick={() => handleDisplayIndividual(tabletIndex)}
              >
                Display
              </button>
              <a 
                href={`/tablet/${tabletIndex}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-500 underline"
              >
                Open Tablet View
              </a>
            </div>
          ))}
        </div>
        
        <div className="mt-6 flex space-x-4">
          <button
            className={`px-6 py-3 ${displayMode === 'total' ? 'bg-green-600' : 'bg-green-500'} text-white rounded-lg hover:bg-green-700 font-bold text-lg`}
            onClick={handleDisplayTotal}
          >
            Display Total Scores
          </button>
          
          <button
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-700 font-bold text-lg"
            onClick={resetAllScores}
          >
            Reset All Displays
          </button>
        </div>
        
        <div className="mt-6">
          <button
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-700 font-bold text-lg"
            onClick={() => updateAllTablets()}
          >
            Update All Tablets
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;