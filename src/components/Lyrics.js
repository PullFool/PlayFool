import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAudio } from '../context/PlayerContext';
import { IoClose, IoMusicalNotes, IoThumbsDown, IoPlaySkipForward } from 'react-icons/io5';
import styles from './Lyrics.module.css';

const API_BASE = process.env.REACT_APP_API_URL;
const REJECT_KEY = 'playfool_lyrics_rejected'; // { "title|artist": ["id1","id2"] }

function getSongKey(song) {
  if (!song) return '';
  return `${(song.title || '').toLowerCase().trim()}|${(song.artist || '').toLowerCase().trim()}`;
}

function loadRejected(key) {
  try {
    const all = JSON.parse(localStorage.getItem(REJECT_KEY) || '{}');
    return Array.isArray(all[key]) ? all[key] : [];
  } catch (e) { return []; }
}

function saveRejected(key, ids) {
  try {
    const all = JSON.parse(localStorage.getItem(REJECT_KEY) || '{}');
    all[key] = ids;
    localStorage.setItem(REJECT_KEY, JSON.stringify(all));
  } catch (e) {}
}

function Lyrics({ onClose }) {
  const { currentSong, currentTime, seekTo } = useAudio();
  const [lyricsData, setLyricsData] = useState(null); // { lines, synced }
  const [match, setMatch] = useState(null); // { sourceId, totalMatches, currentIndex }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const activeRef = useRef(null);

  const fetchLyrics = useCallback(async (song, opts = {}) => {
    const songKey = getSongKey(song);
    const rejectedIds = loadRejected(songKey);
    setLoading(true); setError(''); setLyricsData(null); setMatch(null);
    try {
      const res = await fetch(`${API_BASE}/lyrics/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: song.title,
          file: decodeURIComponent(song.url.split('/').pop() || ''),
          rejectedIds,
          force: !!opts.force,
        }),
      });
      const data = await res.json();
      if (data.lyrics && data.lyrics.lines && data.lyrics.lines.length > 0) {
        setLyricsData(data.lyrics);
        setMatch({
          sourceId: data.sourceId,
          totalMatches: data.totalMatches,
          currentIndex: data.currentIndex,
        });
      } else {
        setError(rejectedIds.length > 0
          ? 'No more matches to try — all the alternatives were rejected'
          : 'Lyrics not found for this song');
      }
    } catch (e) {
      setError('Could not load lyrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentSong) { setLyricsData(null); setMatch(null); return; }
    fetchLyrics(currentSong);
  }, [currentSong, fetchLyrics]);

  // Find active line (only for synced) — moved up so the auto-scroll
  // effect can depend on it instead of currentTime, which caused flicker.
  let activeIndex = -1;
  if (lyricsData?.synced && lyricsData.lines) {
    for (let i = lyricsData.lines.length - 1; i >= 0; i--) {
      if (currentTime >= lyricsData.lines[i].time) { activeIndex = i; break; }
    }
  }

  // Auto-scroll only when the active line actually changes
  useEffect(() => {
    if (activeRef.current && lyricsData?.synced) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex, lyricsData?.synced]);

  const handleLineClick = useCallback((time) => {
    if (lyricsData?.synced) seekTo(time);
  }, [seekTo, lyricsData?.synced]);

  const skipMatch = useCallback(() => {
    if (!currentSong || !match?.sourceId) return;
    const key = getSongKey(currentSong);
    const next = Array.from(new Set([...loadRejected(key), match.sourceId]));
    saveRejected(key, next);
    fetchLyrics(currentSong, { force: true });
  }, [currentSong, match, fetchLyrics]);

  const markWrong = useCallback(() => {
    if (!currentSong || !match?.sourceId) return;
    if (!window.confirm(
      `Mark these lyrics as wrong for "${currentSong.title}"?\n\n` +
      `We won't show this match again, and we'll try a different one next time.`
    )) return;
    const key = getSongKey(currentSong);
    const next = Array.from(new Set([...loadRejected(key), match.sourceId]));
    saveRejected(key, next);
    fetchLyrics(currentSong, { force: true });
  }, [currentSong, match, fetchLyrics]);

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

      {match && match.totalMatches > 0 && (
        <div className={styles.matchBar}>
          <span className={styles.matchSource}>
            lrclib · match {match.currentIndex} of {match.totalMatches}
          </span>
          <div className={styles.matchActions}>
            <button
              className={styles.matchBtn}
              onClick={skipMatch}
              disabled={loading || match.totalMatches <= match.currentIndex}
              title="Try the next match"
            >
              <IoPlaySkipForward /> Try next
            </button>
            <button
              className={styles.matchBtn}
              onClick={markWrong}
              disabled={loading}
              title="Mark these lyrics as wrong"
            >
              <IoThumbsDown /> Wrong
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lyrics;
