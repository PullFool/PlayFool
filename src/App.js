import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import NowPlaying from './components/NowPlaying';
import Lyrics from './components/Lyrics';
import VideoPanel from './components/VideoPanel';
import Tour from './components/Tour';
import Equalizer from './components/Equalizer';
import UpdateChecker from './components/UpdateChecker';
import Queue from './components/Queue';
import LocalMusic from './pages/LocalMusic';
import YouTube from './pages/YouTube';
import Videos from './pages/Videos';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import './App.css';

// Keyboard shortcut handler component (needs to be inside PlayerProvider)
function KeyboardShortcuts() {
  const { togglePlayPause, skipNext, skipPrev, currentSong, setVolumeLevel, volume } = usePlayer();

  const handleKeyDown = useCallback((e) => {
    // Ignore if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (currentSong) togglePlayPause();
        break;
      case 'ArrowRight':
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); skipNext(); }
        break;
      case 'ArrowLeft':
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); skipPrev(); }
        break;
      case 'ArrowUp':
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); setVolumeLevel(Math.min(1, volume + 0.1)); }
        break;
      case 'ArrowDown':
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); setVolumeLevel(Math.max(0, volume - 0.1)); }
        break;
      case 'MediaPlayPause':
        e.preventDefault();
        if (currentSong) togglePlayPause();
        break;
      case 'MediaTrackNext':
        e.preventDefault();
        skipNext();
        break;
      case 'MediaTrackPrevious':
        e.preventDefault();
        skipPrev();
        break;
      default:
        break;
    }
  }, [togglePlayPause, skipNext, skipPrev, currentSong, setVolumeLevel, volume]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Register media session for system media controls (Windows media overlay)
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('nexttrack', () => skipNext());
      navigator.mediaSession.setActionHandler('previoustrack', () => skipPrev());
    }
  }, [togglePlayPause, skipNext, skipPrev]);

  return null;
}

function App() {
  const [showLyrics, setShowLyrics] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [tourDone, setTourDone] = useState(false);

  return (
    <ErrorBoundary>
      <PlayerProvider>
        <KeyboardShortcuts />
        {!tourDone && <Tour onComplete={() => setTourDone(true)} />}
        <Router>
          <div className="app">
            <UpdateChecker />
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
            {showEqualizer && <Equalizer onClose={() => setShowEqualizer(false)} />}
            {showQueue && <Queue onClose={() => setShowQueue(false)} />}
            <VideoPanel />
            <Player
              showLyrics={showLyrics}
              onToggleLyrics={() => setShowLyrics(prev => !prev)}
              showEqualizer={showEqualizer}
              onToggleEqualizer={() => setShowEqualizer(prev => !prev)}
              showQueue={showQueue}
              onToggleQueue={() => setShowQueue(prev => !prev)}
            />
            <NowPlaying />
          </div>
        </Router>
      </PlayerProvider>
    </ErrorBoundary>
  );
}

export default App;
