import React, { useRef, useCallback, useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { IoPlay, IoPause, IoPlaySkipForward, IoPlaySkipBack, IoPlayForward, IoPlayBack, IoVolumeHigh, IoVolumeMute, IoMusicalNotes, IoDocumentText, IoVideocam, IoOptions, IoContract, IoExpand, IoList, IoEye } from 'react-icons/io5';
import styles from './Player.module.css';

const OPACITY_KEY = 'playfool_mini_opacity';
const OPACITY_LEVELS = [1, 0.85, 0.7, 0.55, 0.4]; // cycle order

function applyOpacity(level) {
  const appEl = document.querySelector('.app');
  if (!appEl) return;
  appEl.style.setProperty('--mini-opacity', String(level));
  // Also try real window alpha-blend if NW.js exposes it (may silently fail
  // on older versions; the CSS variable does the visible work either way).
  try {
    if (window.nw?.Window?.get) {
      const win = window.nw.Window.get();
      if (typeof win.setAlphaBlend === 'function') win.setAlphaBlend(level < 1);
    }
  } catch (e) {}
}

function Player({ showLyrics, onToggleLyrics, showEqualizer, onToggleEqualizer, showQueue, onToggleQueue }) {
  const {
    currentSong, isPlaying, currentTime, duration, volume,
    togglePlayPause, skipNext, skipPrev, seekTo, setVolumeLevel,
    setShowNowPlaying, mediaType, showVideoPlayer, setShowVideoPlayer,
  } = usePlayer();

  const seekBarRef = useRef(null);
  const [isMini, setIsMini] = useState(false);
  const [opacity, setOpacity] = useState(() => {
    const v = parseFloat(localStorage.getItem(OPACITY_KEY) || '1');
    return Number.isFinite(v) && v > 0.2 && v <= 1 ? v : 1;
  });
  // Track which popup types we have open so the close-on-exit-mini logic
  // knows which inline panels to re-open.
  const openPopupTypes = useRef(new Set());

  // Apply opacity whenever it or the mini-mode state changes. Full mode is
  // always 100% — opacity only takes effect while the mini player is showing.
  useEffect(() => {
    applyOpacity(isMini ? opacity : 1);
  }, [isMini, opacity]);

  const setOpacityAndSave = (level) => {
    setOpacity(level);
    try { localStorage.setItem(OPACITY_KEY, String(level)); } catch (e) {}
  };

  const cycleOpacity = () => {
    const i = OPACITY_LEVELS.indexOf(opacity);
    const next = OPACITY_LEVELS[(i + 1) % OPACITY_LEVELS.length];
    setOpacityAndSave(next);
  };

  // Right-click anywhere in the mini player → native NW menu with
  // precise opacity choices. Falls back to the cycle button if NW is unavailable.
  const handleContextMenu = (e) => {
    if (!isMini) return;
    if (!window.nw?.Menu) return;
    e.preventDefault();
    try {
      const menu = new window.nw.Menu();
      [1, 0.85, 0.7, 0.55, 0.4].forEach((level) => {
        menu.append(new window.nw.MenuItem({
          label: `Opacity ${Math.round(level * 100)}%${level === opacity ? '  ✓' : ''}`,
          click: () => setOpacityAndSave(level),
        }));
      });
      menu.popup(e.clientX, e.clientY);
    } catch (err) { /* no-op, cycle button still works */ }
  };

  // Ask the server to open a floating panel window. nw.Window.open lives in the
  // node-main context which has full NW.js access; the React app talks to it
  // via /api/popup/* over fetch.
  const openPopup = async (type) => {
    try {
      await fetch('/api/popup/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      openPopupTypes.current.add(type);
    } catch (e) { console.error('openPopup failed:', e); }
  };

  const closeAllPopups = async () => {
    try { await fetch('/api/popup/close-all', { method: 'POST' }); } catch (e) {}
  };

  const formatTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  const handleSeekClick = useCallback((e) => {
    if (!seekBarRef.current || !duration) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    seekTo(percent * duration);
  }, [duration, seekTo]);

  return (
    <div className={styles.bar} onContextMenu={handleContextMenu}>
      {/* Lyrics ticker shown only in mini mode (CSS-gated by .app.mini-mode) */}

      {currentSong && (
        <div className={styles.progressTop} ref={seekBarRef} onClick={handleSeekClick}>
          <div className={styles.progressBg} />
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className={styles.inner}>
        <div className={styles.song} onClick={() => currentSong && setShowNowPlaying(true)}>
          <div className={styles.art}>
            {currentSong?.cover ? (
              <img src={currentSong.cover} alt="" />
            ) : (
              <IoMusicalNotes className={styles.artIcon} />
            )}
          </div>
          <div className={styles.info}>
            <div className={styles.title}>{currentSong ? currentSong.title : 'No song playing'}</div>
            <div className={styles.artist}>{currentSong ? (currentSong.artist || 'Unknown') : 'Select a song to play'}</div>
          </div>
        </div>

        <div className={styles.controls}>
          <button className={styles.controlBtn} onClick={skipPrev} disabled={!currentSong} title="Previous track"><IoPlaySkipBack /></button>
          <button
            className={styles.controlBtn}
            onClick={() => seekTo(Math.max(0, currentTime - 10))}
            disabled={!currentSong}
            title="Rewind 10 seconds"
          >
            <IoPlayBack />
          </button>
          <button className={styles.playBtn} onClick={togglePlayPause} disabled={!currentSong}>
            {isPlaying ? <IoPause /> : <IoPlay />}
          </button>
          <button
            className={styles.controlBtn}
            onClick={() => seekTo(duration > 0 ? Math.min(duration, currentTime + 10) : currentTime + 10)}
            disabled={!currentSong}
            title="Forward 10 seconds"
          >
            <IoPlayForward />
          </button>
          <button className={styles.controlBtn} onClick={skipNext} disabled={!currentSong} title="Next track"><IoPlaySkipForward /></button>
        </div>

        <div className={styles.right}>
          {currentSong && mediaType === 'video' && (
            <button
              className={`${styles.lyricsBtn} ${showVideoPlayer ? styles.lyricsBtnActive : ''}`}
              onClick={() => setShowVideoPlayer(prev => !prev)}
              title="Toggle video panel"
            >
              <IoVideocam />
            </button>
          )}
          {currentSong && (
            <button
              className={`${styles.lyricsBtn} ${showLyrics ? styles.lyricsBtnActive : ''}`}
              onClick={() => isMini ? openPopup('lyrics') : onToggleLyrics()}
              title="Lyrics"
            >
              <IoDocumentText />
            </button>
          )}
          <button
            className={`${styles.lyricsBtn} ${showEqualizer ? styles.lyricsBtnActive : ''}`}
            onClick={() => isMini ? openPopup('equalizer') : onToggleEqualizer()}
            title="Equalizer"
          >
            <IoOptions />
          </button>
          <button
            className={`${styles.lyricsBtn} ${showQueue ? styles.lyricsBtnActive : ''}`}
            onClick={() => isMini ? openPopup('queue') : onToggleQueue()}
            title="Queue"
          >
            <IoList />
          </button>
          {isMini && (
            <button
              className={styles.lyricsBtn}
              onClick={cycleOpacity}
              title={`Mini opacity: ${Math.round(opacity * 100)}% — click to cycle (or right-click for menu)`}
              style={{ opacity: 0.55 + opacity * 0.45 }}
            >
              <IoEye />
            </button>
          )}
          <button
            className={styles.lyricsBtn}
            onClick={async () => {
              try {
                // Exit fullscreen first if in fullscreen
                if (document.fullscreenElement) {
                  await document.exitFullscreen();
                }
                const isVideoPlaying = mediaType === 'video' && showVideoPlayer;
                const res = await fetch('/api/mini-toggle', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ hasVideo: isVideoPlaying }),
                });
                const data = await res.json();
                const appEl = document.querySelector('.app');
                if (data.mini) {
                  appEl?.classList.add('mini-mode');
                  setIsMini(true);
                } else {
                  appEl?.classList.remove('mini-mode');
                  setIsMini(false);
                  // Leaving mini: close any open popups and re-open the
                  // matching inline panels so the user keeps context.
                  const hadLyrics = openPopupTypes.current.has('lyrics');
                  const hadEq = openPopupTypes.current.has('equalizer');
                  const hadQueue = openPopupTypes.current.has('queue');
                  openPopupTypes.current.clear();
                  await closeAllPopups();
                  if (hadLyrics && !showLyrics) onToggleLyrics();
                  if (hadEq && !showEqualizer) onToggleEqualizer();
                  if (hadQueue && !showQueue) onToggleQueue();
                }
              } catch(e) { console.error('Mini player error:', e); }
            }}
            title={isMini ? "Expand" : "Mini player"}
          >
            {isMini ? <IoExpand /> : <IoContract />}
          </button>
          <span className={styles.time}>{formatTime(currentTime)} / {formatTime(duration)}</span>
          <div className={styles.volume}>
            <button className={styles.volumeBtn} onClick={() => setVolumeLevel(volume > 0 ? 0 : 0.8)}>
              {volume > 0 ? <IoVolumeHigh /> : <IoVolumeMute />}
            </button>
            <input
              type="range" min="0" max="1" step="0.01" value={volume}
              onChange={(e) => setVolumeLevel(Number(e.target.value))}
              className={styles.volumeSlider}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Player;
