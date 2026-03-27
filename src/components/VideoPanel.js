import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAudio } from '../context/PlayerContext';
import { IoClose, IoExpand } from 'react-icons/io5';
import styles from './VideoPanel.module.css';

function VideoPanel() {
  const { currentSong, bindVideoEvents, showVideoPlayer, setShowVideoPlayer, mediaType, isPlaying, currentTime, volume } = useAudio();
  const videoEl = useRef(null);
  const panelRef = useRef(null);
  const lastSongId = useRef(null);
  const [panelWidth, setPanelWidth] = useState(420);
  const [isDragging, setIsDragging] = useState(false);

  const isVideo = currentSong?.type === 'video' && mediaType === 'video';
  const isLocalVideo = isVideo && currentSong?.source !== 'preview';

  // Load video source
  useEffect(() => {
    if (!videoEl.current || !isVideo || !currentSong) return;

    if (lastSongId.current !== currentSong.id) {
      lastSongId.current = currentSong.id;
      const vid = videoEl.current;
      vid.src = currentSong.url;

      if (isLocalVideo) {
        // Local video: play with sound directly from video element
        vid.muted = false;
        vid.volume = volume;
        vid.load();
        bindVideoEvents(vid);

        // Force play after a delay
        setTimeout(() => {
          if (vid) {
            vid.muted = false;
            vid.volume = volume;
            vid.play().catch((err) => console.error('Local video play failed:', err));
          }
        }, 500);

        // Also try on canplaythrough
        vid.oncanplaythrough = () => {
          vid.muted = false;
          vid.volume = volume;
          vid.play().catch(() => {});
        };
      } else {
        // YouTube preview: muted visuals, audio comes from audioRef
        vid.muted = true;
        vid.load();
        vid.addEventListener('canplay', function handler() {
          vid.removeEventListener('canplay', handler);
          vid.play().catch(() => {});
        });
      }
    }
  }, [currentSong, isVideo, isLocalVideo, volume, bindVideoEvents]);

  // Sync YouTube preview video play/pause with audio state
  useEffect(() => {
    if (!videoEl.current || !isVideo || isLocalVideo) return;
    if (isPlaying) {
      videoEl.current.play().catch(() => {});
    } else {
      videoEl.current.pause();
    }
  }, [isPlaying, isVideo, isLocalVideo]);

  // Sync YouTube preview video position with audio position
  useEffect(() => {
    if (!videoEl.current || !isVideo || isLocalVideo) return;
    const drift = Math.abs(videoEl.current.currentTime - currentTime);
    if (drift > 1) {
      videoEl.current.currentTime = currentTime;
    }
  }, [currentTime, isVideo, isLocalVideo]);

  // Sync local video volume
  useEffect(() => {
    if (!videoEl.current || !isLocalVideo) return;
    videoEl.current.volume = volume;
  }, [volume, isLocalVideo]);

  // Resizable panel drag handler
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleMouseMove = (e) => {
      const diff = startX - e.clientX;
      const newWidth = Math.max(300, Math.min(window.innerWidth * 0.75, startWidth + diff));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelWidth]);

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
      style={{ width: panelWidth }}
    >
      {/* Resize drag handle */}
      <div
        className={styles.resizeHandle}
        onMouseDown={handleMouseDown}
        style={{ cursor: 'ew-resize' }}
      />

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
        <video ref={videoEl} className={styles.video} playsInline muted />
      </div>

      <div className={styles.info}>
        <span className={styles.songTitle}>{currentSong?.title}</span>
      </div>
    </div>
  );
}

export default VideoPanel;
