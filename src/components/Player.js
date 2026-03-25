import React, { useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { IoPlay, IoPause, IoPlaySkipForward, IoPlaySkipBack, IoVolumeHigh, IoVolumeMute, IoMusicalNotes, IoDocumentText, IoVideocam } from 'react-icons/io5';
import styles from './Player.module.css';

function Player({ showLyrics, onToggleLyrics }) {
  const {
    currentSong, isPlaying, currentTime, duration, volume,
    togglePlayPause, skipNext, skipPrev, seekTo, setVolumeLevel,
    setShowNowPlaying, mediaType, showVideoPlayer, setShowVideoPlayer,
  } = usePlayer();

  const seekBarRef = useRef(null);

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
          <button className={styles.controlBtn} onClick={skipPrev} disabled={!currentSong}><IoPlaySkipBack /></button>
          <button className={styles.playBtn} onClick={togglePlayPause} disabled={!currentSong}>
            {isPlaying ? <IoPause /> : <IoPlay />}
          </button>
          <button className={styles.controlBtn} onClick={skipNext} disabled={!currentSong}><IoPlaySkipForward /></button>
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
              onClick={onToggleLyrics}
              title="Lyrics"
            >
              <IoDocumentText />
            </button>
          )}
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
