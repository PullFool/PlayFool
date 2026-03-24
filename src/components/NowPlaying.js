import React, { useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  IoPlay, IoPause, IoPlaySkipForward, IoPlaySkipBack,
  IoShuffle, IoRepeat, IoChevronDown, IoMusicalNotes,
} from 'react-icons/io5';
import styles from './NowPlaying.module.css';

function NowPlaying() {
  const {
    currentSong, isPlaying, currentTime, duration, shuffle, repeat,
    togglePlayPause, skipNext, skipPrev, seekTo,
    toggleShuffle, toggleRepeat, showNowPlaying, setShowNowPlaying,
  } = usePlayer();

  const seekRef = useRef(null);

  const handleSeek = useCallback((e) => {
    if (!seekRef.current || !duration) return;
    const rect = seekRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(percent * duration);
  }, [duration, seekTo]);

  if (!showNowPlaying || !currentSong) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;

  const formatTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <button className={styles.collapse} onClick={() => setShowNowPlaying(false)}>
          <IoChevronDown />
        </button>
        <span className={styles.label}>Now Playing</span>
        <div style={{ width: 40 }} />
      </div>

      <div className={styles.artContainer}>
        {currentSong.cover ? (
          <img src={currentSong.cover} alt="" className={styles.art} />
        ) : (
          <div className={`${styles.art} ${styles.artPlaceholder}`}>
            <IoMusicalNotes />
          </div>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.title}>{currentSong.title}</div>
        <div className={styles.artist}>{currentSong.artist || 'Unknown'}</div>
      </div>

      <div className={styles.seek}>
        <div className={styles.seekTrack} ref={seekRef} onClick={handleSeek}>
          <div className={styles.seekBg} />
          <div className={styles.seekFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.times}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className={styles.controls}>
        <button className={`${styles.btn} ${shuffle ? styles.active : ''}`} onClick={toggleShuffle}>
          <IoShuffle />
        </button>
        <button className={styles.btn} onClick={skipPrev}>
          <IoPlaySkipBack />
        </button>
        <button className={styles.playBtn} onClick={togglePlayPause}>
          {isPlaying ? <IoPause /> : <IoPlay />}
        </button>
        <button className={styles.btn} onClick={skipNext}>
          <IoPlaySkipForward />
        </button>
        <button className={`${styles.btn} ${repeat > 0 ? styles.active : ''}`} onClick={toggleRepeat}>
          <IoRepeat />
          {repeat === 2 && <span className={styles.repeatBadge}>1</span>}
        </button>
      </div>
    </div>
  );
}

export default NowPlaying;
