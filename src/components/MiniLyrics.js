import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../context/PlayerContext';
import { IoChevronDown, IoChevronUp } from 'react-icons/io5';
import styles from './MiniLyrics.module.css';

const API_BASE = process.env.REACT_APP_API_URL;

// Single-line ticker shown only when the app is in mini mode.
// Tap to expand into a small scrollable lyrics panel; tap again to collapse.
function MiniLyrics({ hasVideo }) {
  const { currentSong, currentTime } = useAudio();
  const [lyricsData, setLyricsData] = useState(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const activeRef = useRef(null);

  // Fetch lyrics whenever the song changes
  useEffect(() => {
    if (!currentSong) { setLyricsData(null); setError(''); return; }
    let cancelled = false;
    setError('');
    setLyricsData(null);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/lyrics/fetch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: currentSong.title,
            file: decodeURIComponent(currentSong.url.split('/').pop() || ''),
          }),
        });
        if (cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.lyrics?.lines?.length) setLyricsData(data.lyrics);
        else setError('No lyrics');
      } catch (e) { if (!cancelled) setError('Lyrics unavailable'); }
    })();
    return () => { cancelled = true; };
  }, [currentSong]);

  // Tell the server to resize the window when the user expands/collapses.
  // Skip the very first run so just rendering the (hidden) component on
  // app launch doesn't trigger a resize that shrinks the window.
  const skipFirstResize = useRef(true);
  useEffect(() => {
    if (skipFirstResize.current) {
      skipFirstResize.current = false;
      return;
    }
    fetch('/api/mini-resize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hasVideo, lyricsExpanded: expanded }),
    }).catch(() => {});
  }, [expanded, hasVideo]);

  // Reset expanded state when leaving mini mode (component unmount handles that),
  // and when the song changes
  useEffect(() => { setExpanded(false); }, [currentSong]);

  const isSynced = lyricsData?.synced;
  const lines = lyricsData?.lines || [];

  // Find current line for synced lyrics
  let activeIndex = -1;
  if (isSynced) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (currentTime >= lines[i].time) { activeIndex = i; break; }
    }
  }

  // Auto-scroll to active line in expanded view
  useEffect(() => {
    if (expanded && activeRef.current && isSynced) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, expanded, isSynced]);

  if (!currentSong) return null;

  const tickerText = (() => {
    if (error) return error;
    if (!lyricsData) return 'Loading lyrics…';
    if (!isSynced) return lines[0]?.text || '♪';
    return lines[activeIndex]?.text || '♪';
  })();

  return (
    <div className={styles.wrapper}>
      <button className={styles.ticker} onClick={() => setExpanded((v) => !v)}>
        <span className={styles.tickerText}>♪ {tickerText}</span>
        <span className={styles.chevron}>
          {expanded ? <IoChevronUp /> : <IoChevronDown />}
        </span>
      </button>

      {expanded && (
        <div className={styles.panel}>
          {!lyricsData && <div className={styles.empty}>{error || 'Loading…'}</div>}
          {lyricsData && (
            <div className={styles.lines}>
              {lines.map((line, i) => (
                <div
                  key={i}
                  ref={isSynced && i === activeIndex ? activeRef : null}
                  className={[
                    styles.line,
                    isSynced && i === activeIndex ? styles.activeLine : '',
                    isSynced && i < activeIndex ? styles.pastLine : '',
                  ].join(' ')}
                >
                  {line.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MiniLyrics;
