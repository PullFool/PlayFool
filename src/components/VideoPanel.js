import React, { useEffect, useRef } from 'react';
import { useAudio } from '../context/PlayerContext';
import { IoClose, IoExpand } from 'react-icons/io5';
import styles from './VideoPanel.module.css';

function VideoPanel() {
  const { currentSong, bindVideoEvents, showVideoPlayer, setShowVideoPlayer, mediaType } = useAudio();
  const videoEl = useRef(null);
  const audioEl = useRef(null);
  const panelRef = useRef(null);
  const lastSongId = useRef(null);

  const isVideo = currentSong?.type === 'video' && mediaType === 'video';

  useEffect(() => {
    if (!videoEl.current || !isVideo || !currentSong) return;

    if (lastSongId.current !== currentSong.id) {
      lastSongId.current = currentSong.id;
      bindVideoEvents(videoEl.current);

      // Stop any previous audio
      if (audioEl.current) {
        audioEl.current.pause();
        audioEl.current.src = '';
      }

      videoEl.current.src = currentSong.url;
      videoEl.current.muted = false;
      videoEl.current.load();
      videoEl.current.play().catch(() => {});

      // Only use separate audio for YouTube previews (which have split video/audio streams)
      if (currentSong.audioUrl && currentSong.source === 'preview' && audioEl.current) {
        // Mute video since audio comes from separate stream
        videoEl.current.muted = true;
        audioEl.current.src = currentSong.audioUrl;
        audioEl.current.load();
        audioEl.current.play().catch(() => {});

        // Sync audio with video
        const syncInterval = setInterval(() => {
          if (videoEl.current && audioEl.current) {
            const diff = Math.abs(videoEl.current.currentTime - audioEl.current.currentTime);
            if (diff > 0.3) {
              audioEl.current.currentTime = videoEl.current.currentTime;
            }
            if (videoEl.current.paused && !audioEl.current.paused) {
              audioEl.current.pause();
            } else if (!videoEl.current.paused && audioEl.current.paused) {
              audioEl.current.play().catch(() => {});
            }
          }
        }, 500);

        return () => clearInterval(syncInterval);
      }
    }
  }, [currentSong, bindVideoEvents, isVideo]);

  // Clean up audio when switching away from video
  useEffect(() => {
    if (!isVideo && audioEl.current) {
      audioEl.current.pause();
      audioEl.current.src = '';
    }
  }, [isVideo]);

  const toggleFullscreen = () => {
    if (panelRef.current) {
      if (document.fullscreenElement) document.exitFullscreen();
      else panelRef.current.requestFullscreen();
    }
  };

  if (!isVideo) return null;

  return (
    <div
      className={`${styles.panel} ${showVideoPlayer ? styles.visible : styles.hidden}`}
      ref={panelRef}
    >
      <div className={styles.header}>
        <h3 className={styles.title}>Video</h3>
        <div className={styles.headerActions}>
          <button className={styles.headerBtn} onClick={toggleFullscreen} title="Fullscreen">
            <IoExpand />
          </button>
          <button className={styles.headerBtn} onClick={() => setShowVideoPlayer(false)} title="Hide panel">
            <IoClose />
          </button>
        </div>
      </div>

      <div className={styles.videoWrapper}>
        <video ref={videoEl} className={styles.video} playsInline muted={false} />
        {/* Hidden audio element for sound when YouTube video stream has no audio */}
        <audio ref={audioEl} style={{ display: 'none' }} />
      </div>

      <div className={styles.info}>
        <span className={styles.songTitle}>{currentSong?.title}</span>
      </div>
    </div>
  );
}

export default VideoPanel;
