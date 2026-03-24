import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAudio } from '../context/PlayerContext';
import { IoClose, IoMusicalNotes } from 'react-icons/io5';
import styles from './Lyrics.module.css';

const API_BASE = process.env.REACT_APP_API_URL;

function Lyrics({ onClose }) {
  const { currentSong, currentTime, seekTo } = useAudio();
  const [lyricsData, setLyricsData] = useState(null); // { lines, synced }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const activeRef = useRef(null);

  useEffect(() => {
    if (!currentSong) { setLyricsData(null); return; }

    let cancelled = false;
    setLoading(true);
    setError('');
    setLyricsData(null);

    const fetchLyrics = async () => {
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

        if (data.lyrics && data.lyrics.lines && data.lyrics.lines.length > 0) {
          setLyricsData(data.lyrics);
        } else {
          setError('Lyrics not found for this song');
        }
      } catch (e) {
        if (!cancelled) setError('Could not load lyrics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLyrics();
    return () => { cancelled = true; };
  }, [currentSong]);

  // Auto-scroll to active line (only for synced lyrics)
  useEffect(() => {
    if (activeRef.current && lyricsData?.synced) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, lyricsData?.synced]);

  const handleLineClick = useCallback((time) => {
    if (lyricsData?.synced) seekTo(time);
  }, [seekTo, lyricsData?.synced]);

  // Find active line (only for synced)
  let activeIndex = -1;
  if (lyricsData?.synced && lyricsData.lines) {
    for (let i = lyricsData.lines.length - 1; i >= 0; i--) {
      if (currentTime >= lyricsData.lines[i].time) { activeIndex = i; break; }
    }
  }

  if (!currentSong) return null;

  const isSynced = lyricsData?.synced;
  const lines = lyricsData?.lines || [];

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Lyrics</h3>
        <button className={styles.closeBtn} onClick={onClose}><IoClose /></button>
      </div>

      <div className={styles.songInfo}>
        <span className={styles.songTitle}>{currentSong.title}</span>
        <span className={styles.songArtist}>{currentSong.artist || 'Unknown'}</span>
        {lyricsData && !isSynced && (
          <span className={styles.unsyncedBadge}>Plain lyrics (not timed)</span>
        )}
      </div>

      <div className={styles.content}>
        {loading && (
          <div className={styles.status}>
            <IoMusicalNotes className={styles.statusIcon} />
            <p>Loading lyrics...</p>
          </div>
        )}

        {error && !loading && (
          <div className={styles.status}>
            <IoMusicalNotes className={styles.statusIcon} />
            <p>{error}</p>
          </div>
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
                  !isSynced ? styles.plainLine : '',
                  isSynced ? styles.clickable : '',
                ].join(' ')}
                onClick={() => handleLineClick(line.time)}
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

export default Lyrics;
