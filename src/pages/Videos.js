import React, { useState, useEffect, useCallback } from 'react';
import { useAudio } from '../context/PlayerContext';
import { IoPlay, IoVideocam, IoRefresh, IoShuffle } from 'react-icons/io5';
import styles from './Videos.module.css';

const API_BASE = process.env.REACT_APP_API_URL;
const SERVER_BASE = process.env.REACT_APP_SERVER_URL;

function Videos() {
  const { playSong, shufflePlay, currentSong, isPlaying } = useAudio();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVideos = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/videos`);
      const data = await res.json();
      if (data.videos) {
        setVideos(data.videos.map(v => ({
          ...v,
          url: `${SERVER_BASE}/${v.file}`,
          type: 'video',
          artist: 'Video',
        })));
      }
    } catch (e) {
      console.error('Failed to load videos:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  const formatSize = (bytes) => {
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="page">
      <div className="flex-between mb-24">
        <h1 className="page-title mb-0">Videos</h1>
        <div className="flex-row gap-8">
          {videos.length > 0 && (
            <button className="btn btn-secondary" onClick={() => shufflePlay(videos)}>
              <IoShuffle /> Shuffle
            </button>
          )}
          <button onClick={loadVideos} className="btn-icon" title="Refresh">
            <IoRefresh />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading videos...</p></div>
      ) : videos.length === 0 ? (
        <div className="empty-state">
          <IoVideocam className="icon" />
          <h3>No videos yet</h3>
          <p>Download videos from the YouTube tab</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {videos.map((video, index) => {
            const isActive = currentSong?.id === video.id;
            return (
              <div
                key={video.id}
                className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                onClick={() => playSong(videos, index)}
              >
                <div className={styles.cardThumb}>
                  {isActive && isPlaying ? (
                    <div className={styles.cardPlaying}>Playing</div>
                  ) : (
                    <IoPlay className={styles.cardPlayIcon} />
                  )}
                </div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardTitle}>{video.title}</div>
                  <div className={styles.cardMeta}>
                    {formatSize(video.size)} - {video.date}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Videos;
