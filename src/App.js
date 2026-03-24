import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { PlayerProvider } from './context/PlayerContext';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import NowPlaying from './components/NowPlaying';
import Lyrics from './components/Lyrics';
import VideoPanel from './components/VideoPanel';
import LocalMusic from './pages/LocalMusic';
import YouTube from './pages/YouTube';
import Videos from './pages/Videos';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import './App.css';

function App() {
  const [showLyrics, setShowLyrics] = useState(false);

  return (
    <ErrorBoundary>
      <PlayerProvider>
        <Router>
          <div className="app">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<LocalMusic />} />
                <Route path="/youtube" element={<YouTube />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/playlists" element={<Playlists />} />
                <Route path="/playlist/:id" element={<PlaylistDetail />} />
              </Routes>
            </main>
            {showLyrics && <Lyrics onClose={() => setShowLyrics(false)} />}
            <VideoPanel />
            <Player
              showLyrics={showLyrics}
              onToggleLyrics={() => setShowLyrics(prev => !prev)}
            />
            <NowPlaying />
          </div>
        </Router>
      </PlayerProvider>
    </ErrorBoundary>
  );
}

export default App;
