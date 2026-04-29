import React, { useState, useEffect, useRef } from 'react';
import { IoMusicalNotes } from 'react-icons/io5';
import { subscribe, requestState, broadcastAction } from '../utils/playerBroadcast';
import styles from './PopupLyrics.module.css';

const API_BASE = process.env.REACT_APP_API_URL;

function PopupLyrics() {
  const [state, setState] = useState({ currentSong: null, currentTime: 0 });
  const [lyricsData, setLyricsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const activeRef = useRef(null);

  // Subscribe to player state from main window
  useEffect(() => {
    const cleanup = subscribe((msg) => {
      if (msg?.type === 'state') setState((s) => ({ ...s, ...msg.payload }));
    });
    requestState();
    return cleanup;
  }, []);

  // Fetch lyrics whenever the song changes
  useEffect(() => {
    const song = state.currentSong;
    if (!song) { setLyricsData(null); setError(''); return; }
    let cancelled = false;
    setLoading(true);
    setError('');
    setLyricsData(null);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/lyrics/fetch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: song.title,
            file: decodeURIComponent((song.url || '').split('/').pop() || ''),
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.lyrics?.lines?.length) setLyricsData(data.lyrics);
        else setError('Lyrics not found for this song');
      } catch (e) { if (!cancelled) setError('Could not load lyrics'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [state.currentSong]);

  const isSynced = lyricsData?.synced;
  const lines = lyricsData?.lines || [];

  let activeIndex = -1;
  if (isSynced) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (state.currentTime >= lines[i].time) { activeIndex = i; break; }
    }
  }

  // Auto-scroll to the active line
  useEffect(() => {
    if (activeRef.current && isSynced) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [state.currentTime, isSynced]);

  const onLineClick = (time) => { if (isSynced) broadcastAction('seek', time); };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h3 className={styles.title}>Lyrics</h3>
        {state.currentSong && (
          <div className={styles.songInfo}>
            <span className={styles.songTitle}>{state.currentSong.title}</span>
            <span className={styles.songArtist}>{state.currentSong.artist || 'Unknown'}</span>
          </div>
        )}
      </div>

      <div className={styles.content}>
        {!state.currentSong && (
          <div className={styles.status}>
            <IoMusicalNotes className={styles.statusIcon} />
            <p>No song playing</p>
          </div>
        )}
        {state.currentSong && loading && (
          <div className={styles.status}><p>Loading lyrics...</p></div>
        )}
        {state.currentSong && error && !loading && (
          <div className={styles.status}><p>{error}</p></div>
        )}
        {lines.length > 0 && !loading && (
          <div className={styles.lines}>
            {lines.map((line, i) => (
              <div
                key={i}
                ref={isSynced && i === activeIndex ? activeRef : null}
                className={[
                  styles.line,
                  isSynced && i === activeIndex ? styles.activeLine : '',
                  isSynced && i < activeIndex ? styles.pastLine : '',
                  isSynced ? styles.clickable : '',
                ].join(' ')}
                onClick={() => onLineClick(line.time)}
              >
                {line.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PopupLyrics;
