import React, { useRef, useCallback, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { IoPlay, IoPause, IoPlaySkipForward, IoPlaySkipBack, IoPlayForward, IoPlayBack, IoVolumeHigh, IoVolumeMute, IoMusicalNotes, IoDocumentText, IoVideocam, IoOptions, IoContract, IoExpand, IoList } from 'react-icons/io5';
import MiniLyrics from './MiniLyrics';
import styles from './Player.module.css';

function Player({ showLyrics, onToggleLyrics, showEqualizer, onToggleEqualizer, showQueue, onToggleQueue }) {
  const {
    currentSong, isPlaying, currentTime, duration, volume,
    togglePlayPause, skipNext, skipPrev, seekTo, setVolumeLevel,
    setShowNowPlaying, mediaType, showVideoPlayer, setShowVideoPlayer,
  } = usePlayer();

  const seekBarRef = useRef(null);
  const [isMini, setIsMini] = useState(false);
  // Track open popup windows so we can close them when leaving mini mode
  const popupRefs = useRef({}); // { lyrics, equalizer, queue } -> NW.js Window

  // Open or focus a popup window for the given panel.
  // Each popup loads the same React app at #/popup/<type> via the local server.
  const POPUP_SIZES = {
    lyrics: { width: 380, height: 500 },
    equalizer: { width: 660, height: 360 },
    queue: { width: 380, height: 520 },
  };
  const POPUP_TITLES = {
    lyrics: 'PlayFool — Lyrics',
    equalizer: 'PlayFool — Equalizer',
    queue: 'PlayFool — Queue',
  };
  const openPopup = (type) => {
    const existing = popupRefs.current[type];
    if (existing) {
      try { existing.focus(); return; } catch (e) {}
    }
    if (typeof window.nw === 'undefined' || !window.nw.Window) {
      // Not running in NW.js — fall back to toggling the inline panel
      if (type === 'lyrics') onToggleLyrics();
      else if (type === 'equalizer') onToggleEqualizer();
      else if (type === 'queue') onToggleQueue();
      return;
    }
    const size = POPUP_SIZES[type];
    const url = `${window.location.origin}/#/popup/${type}`;
    window.nw.Window.open(url, {
      title: POPUP_TITLES[type],
      width: size.width,
      height: size.height,
      min_width: 300,
      min_height: 240,
      resizable: true,
      always_on_top: true,
      frame: true,
      icon: 'public/icon.png',
    }, (newWin) => {
      if (!newWin) return;
      popupRefs.current[type] = newWin;
      newWin.on('closed', () => { popupRefs.current[type] = null; });
    });
  };

  // Close all popups when leaving mini mode
  const closeAllPopups = () => {
    Object.entries(popupRefs.current).forEach(([key, win]) => {
      if (win) { try { win.close(true); } catch (e) {} }
      popupRefs.current[key] = null;
    });
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
    <div className={styles.bar}>
      {/* Lyrics ticker shown only in mini mode (CSS-gated by .app.mini-mode) */}
      <MiniLyrics hasVideo={mediaType === 'video' && showVideoPlayer} />

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
                  // Closing mini mode: close any popups and reopen
                  // the corresponding inline panels so the user keeps context.
                  const hadLyrics = !!popupRefs.current.lyrics;
                  const hadEq = !!popupRefs.current.equalizer;
                  const hadQueue = !!popupRefs.current.queue;
                  closeAllPopups();
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
