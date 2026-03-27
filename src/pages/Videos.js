import React, { useState, useEffect, useCallback } from 'react';
import { useAudio } from '../context/PlayerContext';
import { IoPlay, IoVideocam, IoRefresh, IoShuffle, IoSearch, IoClose } from 'react-icons/io5';
import styles from './Videos.module.css';

const API_BASE = process.env.REACT_APP_API_URL;
const SERVER_BASE = process.env.REACT_APP_SERVER_URL;

// Persist state across navigation
let savedDownloadedVids = [];
let savedScannedVids = [];
let initialVidsLoaded = false;

function Videos() {
  const { playSong, shufflePlay, currentSong, isPlaying } = useAudio();
  const [downloadedVideos, setDownloadedVideos] = useState(savedDownloadedVids);
  const [scannedVideos, setScannedVideos] = useState(savedScannedVids);
  const [loading, setLoading] = useState(!initialVidsLoaded);
  const [scanning, setScanning] = useState(false);

  // Save state when it changes
  useEffect(() => { savedDownloadedVids = downloadedVideos; }, [downloadedVideos]);
  useEffect(() => { savedScannedVids = scannedVideos; }, [scannedVideos]);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/videos`);
      const data = await res.json();
      if (data.videos) {
        setDownloadedVideos(data.videos.map(v => ({
          ...v,
          url: `${SERVER_BASE}/${v.file}`,
          audioUrl: `${SERVER_BASE}/${v.file}`,
          location: v.fullPath || v.file,
          cover: v.thumbnail ? `${SERVER_BASE}${encodeURI(v.thumbnail)}` : null,
          type: 'video',
          artist: 'PlayFool',
        })));
      }
    } catch (e) {
      console.error('Failed to load videos:', e);
    } finally {
      setLoading(false);
      initialVidsLoaded = true;
    }
  }, []);

  const handleScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API_BASE}/scan/videos`);
      const data = await res.json();
      if (data.videos) {
        setScannedVideos(data.videos.map(v => ({
          ...v,
          url: `${SERVER_BASE}/api/localvideo?path=${encodeURIComponent(v.fullPath)}`,
          audioUrl: `${SERVER_BASE}/api/localvideo?path=${encodeURIComponent(v.fullPath)}`,
          location: v.fullPath,
          cover: v.thumbnail ? `${SERVER_BASE}${encodeURI(v.thumbnail)}` : null,
          type: 'video',
          artist: 'Local',
          source: 'scanned',
        })));
      }
    } catch (e) {
      console.error('Failed to scan:', e);
    } finally {
      setScanning(false);
    }
  }, []);

  const loadCachedVideoScan = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/scan/videos/cached`);
      const data = await res.json();
      if (data.videos && data.videos.length > 0) {
        setScannedVideos(data.videos.map(v => ({
          ...v,
          url: `${SERVER_BASE}/api/localvideo?path=${encodeURIComponent(v.fullPath)}`,
          audioUrl: `${SERVER_BASE}/api/localvideo?path=${encodeURIComponent(v.fullPath)}`,
          location: v.fullPath,
          cover: v.thumbnail ? `${SERVER_BASE}${encodeURI(v.thumbnail)}` : null,
          type: 'video',
          artist: 'Local',
          source: 'scanned',
        })));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!initialVidsLoaded) {
      loadVideos();
      loadCachedVideoScan();
    }
  }, [loadVideos, loadCachedVideoScan]);

  // Merge and deduplicate
  const seen = new Set();
  const allVideos = [];
  for (const v of [...downloadedVideos, ...scannedVideos]) {
    const key = v.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      allVideos.push(v);
    }
  }

  const formatSize = (bytes) => {
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="page">
      <div className="flex-between mb-24">
        <h1 className="page-title mb-0">My Videos</h1>
        <div className="flex-row gap-8">
          <button onClick={handleScan} className="btn btn-secondary" title="Scan PC for videos"
            disabled={scanning}>
            <IoSearch /> {scanning ? 'Scanning...' : 'Scan PC'}
          </button>
          {allVideos.length > 0 && (
            <button className="btn btn-secondary" onClick={() => shufflePlay(allVideos)}>
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
      ) : allVideos.length === 0 ? (
        <div className="empty-state">
          <IoVideocam className="icon" />
          <h3>No videos yet</h3>
          <p>Download videos from YouTube or scan your PC</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {allVideos.map((video, index) => {
            const isActive = currentSong?.id === video.id;
            return (
              <div
                key={video.id}
                className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                onClick={() => playSong(allVideos, index)}
              >
                <div className={styles.cardThumb}>
                  {video.cover && <img src={video.cover} alt="" className={styles.cardThumbImg} />}
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
                  {video.location && (
                    <div className={styles.cardLocation} title={video.location}>
                      {video.location}
                    </div>
                  )}
                </div>
                {video.source === 'scanned' && (
                  <button className={styles.removeBtn} title="Remove from list"
                    onClick={(e) => {
                      e.stopPropagation();
                      setScannedVideos(prev => {
                        const updated = prev.filter(v => v.id !== video.id);
                        fetch(`${API_BASE}/scan/remove`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: video.id, type: 'video' }),
                        }).catch(() => {});
                        return updated;
                      });
                    }}
                  >
                    <IoClose />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Videos;
