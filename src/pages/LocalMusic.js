import React, { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { IoCloudUpload, IoMusicalNotes, IoPlay, IoAdd, IoRefresh, IoShuffle, IoSearch } from 'react-icons/io5';
import styles from './LocalMusic.module.css';

const API_BASE = process.env.REACT_APP_API_URL;
const SERVER_BASE = process.env.REACT_APP_SERVER_URL;

function LocalMusic() {
  const { playSong, shufflePlay, currentSong, isPlaying, playlists, addToPlaylist } = usePlayer();
  const [droppedSongs, setDroppedSongs] = useState([]);
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [scannedSongs, setScannedSongs] = useState([]);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef();

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/library`);
      const data = await res.json();
      if (data.songs) {
        setDownloadedSongs(data.songs.map(s => ({
          ...s,
          url: `${SERVER_BASE}/${s.file}`,
          location: s.fullPath || s.file,
          cover: s.thumbnail ? `${SERVER_BASE}${s.thumbnail}` : null,
          source: 'youtube',
        })));
      }
    } catch (e) {
      console.error('Failed to load library:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const handleScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API_BASE}/scan`);
      const data = await res.json();
      if (data.songs) {
        setScannedSongs(data.songs.map(s => ({
          ...s,
          url: `${SERVER_BASE}/api/localfile?path=${encodeURIComponent(s.fullPath)}`,
          location: s.fullPath,
          cover: null,
          source: 'scanned',
        })));
      }
    } catch (e) {
      console.error('Failed to scan:', e);
    } finally {
      setScanning(false);
    }
  }, []);

  const handleFiles = useCallback((files) => {
    const audioFiles = Array.from(files).filter(f =>
      f.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(f.name)
    );
    setDroppedSongs(prev => [...prev, ...audioFiles.map(file => ({
      id: `local-${Date.now()}-${Math.random()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Local File',
      url: URL.createObjectURL(file),
      cover: null,
      source: 'local',
    }))]);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // Merge all sources, deduplicate by title
  const seen = new Set();
  const allSongs = [];
  for (const song of [...downloadedSongs, ...droppedSongs, ...scannedSongs]) {
    const key = song.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      allSongs.push(song);
    }
  }

  return (
    <div className="page">
      <div className="flex-between mb-24">
        <h1 className="page-title mb-0">My Music</h1>
        <div className="flex-row gap-8">
          <button onClick={handleScan} className="btn btn-secondary" title="Scan PC for music"
            disabled={scanning}>
            <IoSearch /> {scanning ? 'Scanning...' : 'Scan PC'}
          </button>
          <button onClick={loadLibrary} className="btn-icon" title="Refresh library">
            <IoRefresh />
          </button>
        </div>
      </div>

      <div className="upload-area"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <IoCloudUpload className="icon" />
        <p>Drop music files here or click to upload</p>
        <p className="hint">Supports MP3, M4A, WAV, OGG, FLAC</p>
        <input ref={fileInputRef} type="file" accept="audio/*" multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading library...</p></div>
      ) : allSongs.length === 0 ? (
        <div className="empty-state">
          <IoMusicalNotes className="icon" />
          <h3>No music yet</h3>
          <p>Upload files, download from YouTube, or scan your PC</p>
        </div>
      ) : (
        <>
          <div className="flex-between mb-24">
            <p className={`${styles.songCount} mb-0`}>
              {allSongs.length} song{allSongs.length !== 1 ? 's' : ''}
            </p>
            <div className="flex-row gap-8">
              <button className="btn btn-secondary" onClick={() => shufflePlay(allSongs)}>
                <IoShuffle /> Shuffle
              </button>
              <button className="btn btn-primary" onClick={() => playSong(allSongs, 0)}>
                <IoPlay /> Play All
              </button>
            </div>
          </div>

          <ul className="song-list">
            {allSongs.map((song, index) => (
              <li key={song.id}
                className={`song-item ${currentSong?.url === song.url ? 'active' : ''}`}
                onClick={() => playSong(allSongs, index)}
              >
                <span className="song-item-number">
                  {currentSong?.url === song.url && isPlaying
                    ? <IoPlay className={styles.playing} />
                    : index + 1
                  }
                </span>
                <div className="song-item-art">
                  {song.cover ? <img src={song.cover} alt="" /> : <IoMusicalNotes className="icon" />}
                </div>
                <div className="song-item-info">
                  <div className="song-item-title">{song.title}</div>
                  <div className="song-item-artist">{song.artist}</div>
                  {song.location && (
                    <div className={styles.songLocation} title={song.location}>
                      {song.location}
                    </div>
                  )}
                </div>
                <div className={styles.addWrapper}>
                  <button className="btn-icon btn-icon-muted" title="Add to playlist"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPlaylistMenu(showPlaylistMenu === song.id ? null : song.id);
                    }}
                  >
                    <IoAdd />
                  </button>
                  {showPlaylistMenu === song.id && (
                    <div className={styles.dropdown}>
                      {playlists.length === 0 ? (
                        <div className={styles.dropdownEmpty}>No playlists yet</div>
                      ) : playlists.map(p => (
                        <div key={p.id} className={styles.dropdownItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToPlaylist(p.id, song);
                            setShowPlaylistMenu(null);
                          }}
                        >{p.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default LocalMusic;
