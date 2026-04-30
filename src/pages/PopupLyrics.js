import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IoMusicalNotes, IoThumbsDown, IoPlaySkipForward } from 'react-icons/io5';
import { subscribe, requestState, broadcastAction } from '../utils/playerBroadcast';
import styles from './PopupLyrics.module.css';

const API_BASE = process.env.REACT_APP_API_URL;
const REJECT_KEY = 'playfool_lyrics_rejected';

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

function PopupLyrics() {
  // Keep currentSong and currentTime as separate states so updating one
  // (currentTime ~4x/sec) doesn't trigger re-renders that depend on the other.
  const [currentSong, setCurrentSong] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [lyricsData, setLyricsData] = useState(null);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const activeRef = useRef(null);

  useEffect(() => {
    const cleanup = subscribe((msg) => {
      if (msg?.type !== 'state') return;
      const p = msg.payload || {};
      if (p.currentSong !== undefined) {
        setCurrentSong((prev) => (prev?.id !== p.currentSong?.id ? p.currentSong : prev));
      }
      if (typeof p.currentTime === 'number') setCurrentTime(p.currentTime);
    });
    requestState();
    return cleanup;
  }, []);

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
          file: decodeURIComponent((song.url || '').split('/').pop() || ''),
          rejectedIds,
          force: !!opts.force,
        }),
      });
      const data = await res.json();
      if (data.lyrics?.lines?.length) {
        setLyricsData(data.lyrics);
        setMatch({
          sourceId: data.sourceId,
          totalMatches: data.totalMatches,
          currentIndex: data.currentIndex,
        });
      } else {
        setError(rejectedIds.length > 0
          ? 'No more matches to try'
          : 'Lyrics not found for this song');
      }
    } catch (e) { setError('Could not load lyrics'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!currentSong) { setLyricsData(null); setMatch(null); setError(''); return; }
    fetchLyrics(currentSong);
  }, [currentSong, fetchLyrics]);

  const isSynced = lyricsData?.synced;
  const lines = lyricsData?.lines || [];

  let activeIndex = -1;
  if (isSynced) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (currentTime >= lines[i].time) { activeIndex = i; break; }
    }
  }

  // Auto-scroll only when the active line actually changes — scrolling on
  // every currentTime tick caused visible flickering.
  useEffect(() => {
    if (activeRef.current && isSynced) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex, isSynced]);

  const onLineClick = (time) => { if (isSynced) broadcastAction('seek', time); };

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
      `We won't show this match again.`
    )) return;
    const key = getSongKey(currentSong);
    const next = Array.from(new Set([...loadRejected(key), match.sourceId]));
    saveRejected(key, next);
    fetchLyrics(currentSong, { force: true });
  }, [currentSong, match, fetchLyrics]);

  return (
    <div className={styles.wrap}>
      <div className={styles.content}>
        {!currentSong && (
          <div className={styles.status}>
            <IoMusicalNotes className={styles.statusIcon} />
            <p>No song playing</p>
          </div>
        )}
        {currentSong && loading && (
          <div className={styles.status}><p>Loading lyrics...</p></div>
        )}
        {currentSong && error && !loading && (
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

      {match && match.totalMatches > 0 && (
        <div className={styles.matchBar}>
          <span className={styles.matchSource}>
            lrclib · {match.currentIndex}/{match.totalMatches}
          </span>
          <div className={styles.matchActions}>
            <button
              className={styles.matchBtn}
              onClick={skipMatch}
              disabled={loading || match.totalMatches <= match.currentIndex}
              title="Try the next match"
            >
              <IoPlaySkipForward /> Next
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

export default PopupLyrics;
