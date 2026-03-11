// ----- /src/App.js -----
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TabletDisplay from './components/TabletDisplay';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tablet/:id" element={<TabletDisplay />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;