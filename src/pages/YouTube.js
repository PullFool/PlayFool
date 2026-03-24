import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { IoSearch, IoDownload, IoMusicalNotes, IoPlay, IoPause, IoShuffle, IoVideocam, IoClose } from 'react-icons/io5';
import styles from './YouTube.module.css';

const API_BASE = process.env.REACT_APP_API_URL;
const SERVER_BASE = process.env.REACT_APP_SERVER_URL;

function YouTube() {
  const { playSong, shufflePlay, currentSong, isPlaying, downloadProgress, setDownloadProgress } = usePlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [error, setError] = useState('');
  const [previewingId, setPreviewingId] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [videoModal, setVideoModal] = useState(null); // video object for quality picker
  const [qualities, setQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState('720');
  const [loadingQualities, setLoadingQualities] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setResults([]); }
      else setResults(data.results || []);
    } catch (e) {
      setError('Search failed. Make sure the app backend is running.');
    } finally {
      setSearching(false);
    }
  };

  const downloadMp3 = async (video) => {
    setDownloadProgress({ title: video.title, percent: 0, status: 'Downloading MP3...' });
    try {
      const res = await fetch(`${API_BASE}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: video.url, title: video.title }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setDownloadedSongs(prev => [{
          id: `yt-${Date.now()}`, title: data.title || video.title,
          artist: video.channel || 'YouTube', url: `${SERVER_BASE}/${data.file}`,
          cover: video.thumbnail, source: 'youtube',
        }, ...prev]);
      }
    } catch (e) {
      setError('Download failed: ' + e.message);
    } finally {
      setDownloadProgress(null);
    }
  };

  const openVideoDownload = async (video) => {
    setVideoModal(video);
    setLoadingQualities(true);
    setQualities([]);
    try {
      const res = await fetch(`${API_BASE}/video/formats?id=${video.id}`);
      const data = await res.json();
      if (data.formats && data.formats.length > 0) {
        setQualities(data.formats);
        // Default to 720p if available
        const has720 = data.formats.find(f => f.label === '720p');
        setSelectedQuality(has720 ? '720' : data.formats[0].label.replace('p', ''));
      } else {
        setQualities([
          { label: '1080p' }, { label: '720p' }, { label: '480p' }, { label: '360p' },
        ]);
      }
    } catch (e) {
      setQualities([
        { label: '1080p' }, { label: '720p' }, { label: '480p' }, { label: '360p' },
      ]);
    } finally {
      setLoadingQualities(false);
    }
  };

  const downloadMp4 = async () => {
    if (!videoModal) return;
    setVideoModal(null);
    setDownloadProgress({ title: videoModal.title, percent: 0, status: `Downloading MP4 (${selectedQuality}p)...` });
    try {
      const res = await fetch(`${API_BASE}/video/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: videoModal.url, title: videoModal.title, quality: selectedQuality,
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setError('');
    } catch (e) {
      setError('Video download failed: ' + e.message);
    } finally {
      setDownloadProgress(null);
    }
  };

  const togglePreview = async (video) => {
    if (previewingId === video.id) { setPreviewingId(null); return; }
    setLoadingPreview(true);
    setPreviewingId(video.id);
    try {
      const res = await fetch(`${API_BASE}/stream?id=${video.id}&type=video`);
      const data = await res.json();
      if (data.error || !data.url) {
        setError('Preview not available');
        setPreviewingId(null);
      } else {
        playSong([{
          id: `preview-${video.id}`, title: video.title,
          artist: video.channel || 'YouTube', url: data.url,
          audioUrl: data.audioUrl || null,
          cover: video.thumbnail, source: 'preview',
          type: 'video',
        }], 0);
      }
    } catch (e) {
      setError('Preview failed');
      setPreviewingId(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">YouTube</h1>

      <div className="search-bar">
        <input type="text" value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Search for music or videos..."
          className="search-input"
        />
        <button onClick={search} disabled={searching} className="btn btn-primary">
          <IoSearch /> {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <div className={styles.errorMsg}>{error}</div>}

      {downloadProgress && (
        <div className="download-toast">
          <div className="title">{downloadProgress.title}</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${downloadProgress.percent}%` }} />
          </div>
          <div className="status">{downloadProgress.status || 'Downloading...'}</div>
        </div>
      )}

      {results.length > 0 && (
        <>
          <h2 className="section-title">Search Results</h2>
          <ul className="song-list mb-32">
            {results.map((video, i) => {
              const isThisPlaying = currentSong?.id === `preview-${video.id}` && isPlaying;
              return (
                <li key={video.id || i} className="song-item">
                  <div className={styles.thumbnail} onClick={() => togglePreview(video)}>
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt="" />
                    ) : (
                      <div className={styles.thumbnailPlaceholder}><IoMusicalNotes /></div>
                    )}
                    <div className={`${styles.thumbnailOverlay} ${isThisPlaying ? styles.overlayActive : ''}`}>
                      {loadingPreview && previewingId === video.id
                        ? <span className={styles.loading}>...</span>
                        : isThisPlaying ? <IoPause /> : <IoPlay />
                      }
                    </div>
                  </div>

                  <div className="song-item-info" onClick={() => togglePreview(video)} style={{ cursor: 'pointer' }}>
                    <div className={`song-item-title ${isThisPlaying ? styles.playing : ''}`}>{video.title}</div>
                    <div className="song-item-artist">{video.channel} - {video.duration}</div>
                  </div>

                  <div className={styles.downloadBtns}>
                    <button onClick={() => downloadMp3(video)} disabled={downloadProgress !== null} className="btn-sm btn-primary">
                      <IoDownload /> MP3
                    </button>
                    <button onClick={() => openVideoDownload(video)} disabled={downloadProgress !== null} className={`btn-sm ${styles.mp4Btn}`}>
                      <IoVideocam /> MP4
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {downloadedSongs.length > 0 && (
        <>
          <div className="flex-between mb-24">
            <h2 className="section-title mb-0">Downloaded</h2>
            <button className="btn-sm btn-primary" onClick={() => shufflePlay(downloadedSongs)}>
              <IoShuffle /> Shuffle
            </button>
          </div>
          <ul className="song-list">
            {downloadedSongs.map((song, index) => (
              <li key={song.id} className={`song-item ${currentSong?.url === song.url ? 'active' : ''}`} onClick={() => playSong(downloadedSongs, index)}>
                <span className="song-item-number">
                  {currentSong?.url === song.url && isPlaying ? <IoPlay className={styles.playing} /> : index + 1}
                </span>
                <div className="song-item-art">
                  {song.cover ? <img src={song.cover} alt="" /> : <IoMusicalNotes className="icon" />}
                </div>
                <div className="song-item-info">
                  <div className="song-item-title">{song.title}</div>
                  <div className="song-item-artist">{song.artist}</div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {results.length === 0 && downloadedSongs.length === 0 && !searching && (
        <div className="empty-state">
          <IoSearch className="icon" />
          <h3>Search YouTube</h3>
          <p>Find music and download as MP3 or MP4</p>
        </div>
      )}

      {/* Video Quality Modal */}
      {videoModal && (
        <div className="modal-overlay" onClick={() => setVideoModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Download Video</h3>
              <button className="btn-icon" onClick={() => setVideoModal(null)}><IoClose /></button>
            </div>
            <p className={styles.modalTitle}>{videoModal.title}</p>

            {loadingQualities ? (
              <p className={styles.modalLoading}>Loading qualities...</p>
            ) : (
              <div className={styles.qualityGrid}>
                {qualities.map(q => (
                  <button
                    key={q.label}
                    className={`${styles.qualityBtn} ${selectedQuality === q.label.replace('p', '') ? styles.qualityActive : ''}`}
                    onClick={() => setSelectedQuality(q.label.replace('p', ''))}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setVideoModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={downloadMp4} disabled={loadingQualities}>
                <IoDownload /> Download {selectedQuality}p
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default YouTube;
