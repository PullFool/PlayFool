import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { IoSearch, IoDownload, IoMusicalNotes, IoPlay, IoPause, IoShuffle, IoVideocam, IoClose, IoTime, IoTrash } from 'react-icons/io5';
import styles from './YouTube.module.css';

const API_BASE = process.env.REACT_APP_API_URL;
const SERVER_BASE = process.env.REACT_APP_SERVER_URL;

// Persist YouTube state across navigation
let savedQuery = '';
let savedResults = [];
let savedDownloaded = [];

function YouTube() {
  const { playSong, shufflePlay, currentSong, isPlaying, downloadProgress, setDownloadProgress } = usePlayer();
  const [query, setQuery] = useState(savedQuery);
  const [results, setResults] = useState(savedResults);
  const [searching, setSearching] = useState(false);
  const [downloadedSongs, setDownloadedSongs] = useState(savedDownloaded);
  const [error, setError] = useState('');
  const [previewingId, setPreviewingId] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoModal, setVideoModal] = useState(null);
  const [qualities, setQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState('720');
  const [loadingQualities, setLoadingQualities] = useState(false);
  const [previewQuality, setPreviewQuality] = useState('720');
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('playfool_search_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);

  // Save state when it changes so it persists across navigation
  useEffect(() => { savedQuery = query; }, [query]);
  useEffect(() => { savedResults = results; }, [results]);
  useEffect(() => { savedDownloaded = downloadedSongs; }, [downloadedSongs]);

  const addToHistory = (q) => {
    const updated = [q, ...searchHistory.filter(h => h !== q)].slice(0, 10);
    setSearchHistory(updated);
    localStorage.setItem('playfool_search_history', JSON.stringify(updated));
  };

  const removeFromHistory = (q) => {
    const updated = searchHistory.filter(h => h !== q);
    setSearchHistory(updated);
    localStorage.setItem('playfool_search_history', JSON.stringify(updated));
  };

  const search = async (searchQuery) => {
    const q = (searchQuery || query).trim();
    if (!q) return;
    setQuery(q);
    setShowHistory(false);
    setSearching(true);
    setError('');
    addToHistory(q);
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setResults([]); }
      else setResults(data.results || []);
    } catch (e) {
      setError('Search failed. Make sure the app backend is running.');
    } finally {
      setSearching(false);
    }
  };

  const queueDownload = (video, type = 'mp3', quality = null) => {
    setDownloadQueue(prev => [...prev, { video, type, quality, id: Date.now() }]);
  };

  // Process download queue
  useEffect(() => {
    if (isDownloading || downloadQueue.length === 0) return;

    const processNext = async () => {
      setIsDownloading(true);
      const item = downloadQueue[0];
      const { video, type, quality } = item;

      const label = type === 'mp4' ? `MP4 (${quality || 'best'}p)` : 'MP3';
      setDownloadProgress({ title: video.title, percent: 0, status: `Downloading ${label}... (${downloadQueue.length} in queue)` });

      try {
        const endpoint = type === 'mp4' ? `${API_BASE}/video/download` : `${API_BASE}/download`;
        const body = type === 'mp4'
          ? { url: video.url, title: video.title, quality, thumbnail: video.thumbnail }
          : { url: video.url, title: video.title, thumbnail: video.thumbnail };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else if (type === 'mp3') {
          setDownloadedSongs(prev => [{
            id: `yt-${Date.now()}`, title: data.title || video.title,
            artist: video.channel || 'YouTube', url: `${SERVER_BASE}/${data.file}`,
            cover: video.thumbnail, source: 'youtube',
          }, ...prev]);
        }
      } catch (e) {
        setError('Download failed: ' + e.message);
      }

      setDownloadQueue(prev => prev.slice(1));
      setIsDownloading(false);
      if (downloadQueue.length <= 1) setDownloadProgress(null);
    };

    processNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadQueue, isDownloading]);

  const downloadMp3 = (video) => {
    queueDownload(video, 'mp3');
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

  const downloadMp4 = () => {
    if (!videoModal) return;
    queueDownload(videoModal, 'mp4', selectedQuality);
    setVideoModal(null);
  };

  const togglePreview = async (video) => {
    if (previewingId === video.id) { setPreviewingId(null); return; }
    setLoadingPreview(true);
    setPreviewingId(video.id);
    try {
      const res = await fetch(`${API_BASE}/stream?id=${video.id}&type=video&quality=${previewQuality}`);
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
      {/* Loader overlay for search and preview */}
      {(searching || loadingPreview) && (
        <div className={styles.loaderOverlay}>
          <img src="/icon.png" alt="PlayFool" className={styles.loaderLogo} />
          <div className={styles.loaderText}>
            {searching ? 'Searching YouTube...' : 'Loading preview...'}
          </div>
        </div>
      )}

      <h1 className="page-title">YouTube</h1>

      <div className="search-bar" style={{ position: 'relative' }}>
        <input type="text" value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          onFocus={() => searchHistory.length > 0 && !query && setShowHistory(true)}
          placeholder="Search for music or videos..."
          className="search-input"
        />
        {showHistory && searchHistory.length > 0 && (
          <div className={styles.historyDropdown}>
            {searchHistory.map((h, i) => (
              <div key={i} className={styles.historyItem}>
                <div className={styles.historyText} onClick={() => search(h)}>
                  <IoTime /> <span>{h}</span>
                </div>
                <button className={styles.historyRemove} onClick={() => removeFromHistory(h)}>
                  <IoTrash />
                </button>
              </div>
            ))}
          </div>
        )}
        <select
          value={previewQuality}
          onChange={(e) => setPreviewQuality(e.target.value)}
          className={styles.qualitySelect}
          title="Preview quality"
        >
          <option value="360">360p</option>
          <option value="480">480p</option>
          <option value="720">720p</option>
          <option value="1080">1080p</option>
        </select>
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
                    <button onClick={() => downloadMp3(video)} className="btn-sm btn-primary">
                      <IoDownload /> MP3
                    </button>
                    <button onClick={() => openVideoDownload(video)} className={`btn-sm ${styles.mp4Btn}`}>
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
