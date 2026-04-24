import React, { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { IoCloudUpload, IoMusicalNotes, IoPlay, IoAdd, IoRefresh, IoShuffle, IoSearch, IoPlaySkipForward, IoList, IoClose, IoTrash } from 'react-icons/io5';
import ConfirmDialog from '../components/ConfirmDialog';
import styles from './LocalMusic.module.css';

const API_BASE = process.env.REACT_APP_API_URL;
const SERVER_BASE = process.env.REACT_APP_SERVER_URL;

// Persist state across navigation
let savedDownloaded = [];
let savedScanned = [];
let savedDropped = [];
let initialLoaded = false;

function LocalMusic() {
  const { playSong, shufflePlay, currentSong, isPlaying, playlists, addToPlaylist, playNext, addToQueue } = usePlayer();
  const [droppedSongs, setDroppedSongs] = useState(savedDropped);
  const [downloadedSongs, setDownloadedSongs] = useState(savedDownloaded);
  const [scannedSongs, setScannedSongs] = useState(savedScanned);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(null);
  const [loading, setLoading] = useState(!initialLoaded);
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm, danger, variant }

  // Save state when it changes
  useEffect(() => { savedDownloaded = downloadedSongs; }, [downloadedSongs]);
  useEffect(() => { savedScanned = scannedSongs; }, [scannedSongs]);
  useEffect(() => { savedDropped = droppedSongs; }, [droppedSongs]);
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
          cover: s.thumbnail ? `${SERVER_BASE}${encodeURI(s.thumbnail)}` : null,
          source: 'youtube',
        })));
      }
    } catch (e) {
      console.error('Failed to load library:', e);
    } finally {
      setLoading(false);
      initialLoaded = true;
    }
  }, []);

  // Load library and cached scan on first mount
  const loadCachedScan = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/scan/cached`);
      const data = await res.json();
      if (data.songs && data.songs.length > 0) {
        setScannedSongs(data.songs.map(s => ({
          ...s,
          url: `${SERVER_BASE}/api/localfile?path=${encodeURIComponent(s.fullPath)}`,
          location: s.fullPath,
          cover: null,
          source: 'scanned',
        })));
      }
    } catch (e) {}
  }, []);

  // Reload library every time the page mounts so new YouTube downloads always show up
  useEffect(() => {
    loadLibrary();
    if (!initialLoaded) loadCachedScan();
  }, [loadLibrary, loadCachedScan]);

  // Refresh library when a download finishes on the YouTube tab
  useEffect(() => {
    const handler = (e) => {
      if (!e.detail || e.detail.kind === 'music') loadLibrary();
    };
    window.addEventListener('playfool:library-changed', handler);
    return () => window.removeEventListener('playfool:library-changed', handler);
  }, [loadLibrary]);

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

  // Filter by search query (title + artist + filename, case-insensitive)
  const q = searchQuery.trim().toLowerCase();
  const filteredSongs = q
    ? allSongs.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.artist || '').toLowerCase().includes(q) ||
        (s.location || '').toLowerCase().includes(q)
      )
    : allSongs;

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
          <div className="flex-between mb-12" style={{ gap: 12, alignItems: 'center' }}>
            <div className={styles.searchWrap}>
              <IoSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setSearchQuery(''); }}
              />
              {searchQuery && (
                <button
                  className={styles.searchClear}
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <IoClose />
                </button>
              )}
            </div>
            <div className="flex-row gap-8">
              <button className="btn btn-secondary" onClick={() => shufflePlay(filteredSongs)} disabled={filteredSongs.length === 0}>
                <IoShuffle /> Shuffle
              </button>
              <button className="btn btn-primary" onClick={() => playSong(filteredSongs, 0)} disabled={filteredSongs.length === 0}>
                <IoPlay /> Play All
              </button>
            </div>
          </div>

          <p className={`${styles.songCount} mb-24`}>
            {q
              ? `${filteredSongs.length} of ${allSongs.length} song${allSongs.length !== 1 ? 's' : ''}`
              : `${allSongs.length} song${allSongs.length !== 1 ? 's' : ''}`
            }
          </p>

          {filteredSongs.length === 0 && q ? (
            <div className="empty-state">
              <IoSearch className="icon" />
              <h3>No songs match "{searchQuery}"</h3>
              <p>Try a different search term</p>
            </div>
          ) : (
          <ul className="song-list">
            {filteredSongs.map((song, index) => (
              <li key={song.id}
                className={`song-item ${currentSong?.url === song.url ? 'active' : ''}`}
                onClick={() => playSong(filteredSongs, index)}
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
                  <button className="btn-icon btn-icon-muted" title="Play Next"
                    onClick={(e) => { e.stopPropagation(); playNext(song); }}
                  >
                    <IoPlaySkipForward />
                  </button>
                  <button className="btn-icon btn-icon-muted" title="Add to Queue"
                    onClick={(e) => { e.stopPropagation(); addToQueue(song); }}
                  >
                    <IoList />
                  </button>
                  <button className="btn-icon btn-icon-muted" title="Add to playlist"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPlaylistMenu(showPlaylistMenu === song.id ? null : song.id);
                    }}
                  >
                    <IoAdd />
                  </button>
                  {song.source === 'scanned' && (
                    <button className="btn-icon btn-icon-muted" title="Remove from list"
                      onClick={(e) => {
                        e.stopPropagation();
                        setScannedSongs(prev => {
                          const updated = prev.filter(s => s.id !== song.id);
                          fetch(`${API_BASE}/scan/remove`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: song.id, type: 'music' }),
                          }).catch(() => {});
                          return updated;
                        });
                      }}
                    >
                      <IoClose />
                    </button>
                  )}
                  {(song.source === 'scanned' || song.source === 'youtube') && (song.fullPath || song.filePath) && (
                    <button className="btn-icon btn-icon-muted" title="Delete file from disk"
                      style={{ color: '#ff6b6b' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDialog({
                          title: 'Delete file?',
                          message: `"${song.title}"\n\nThis will delete the file from your computer.`,
                          confirmText: 'Delete',
                          danger: true,
                          onConfirm: () => {
                            setConfirmDialog(null);
                            fetch(`${API_BASE}/file/delete`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                id: song.id,
                                type: 'music',
                                filePath: song.fullPath || song.filePath,
                              }),
                            }).then(r => r.json()).then(data => {
                              if (data.error) {
                                setConfirmDialog({ variant: 'alert', title: 'Delete failed', message: data.error, confirmText: 'OK', onConfirm: () => setConfirmDialog(null) });
                                return;
                              }
                              if (song.source === 'scanned') {
                                setScannedSongs(prev => prev.filter(s => s.id !== song.id));
                              } else {
                                setDownloadedSongs(prev => prev.filter(s => s.id !== song.id));
                              }
                            }).catch(() => {
                              setConfirmDialog({ variant: 'alert', title: 'Delete failed', message: 'Could not reach the server.', confirmText: 'OK', onConfirm: () => setConfirmDialog(null) });
                            });
                          },
                        });
                      }}
                    >
                      <IoTrash />
                    </button>
                  )}
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
          )}
        </>
      )}

      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmText={confirmDialog?.confirmText}
        cancelText={confirmDialog?.cancelText}
        danger={confirmDialog?.danger}
        variant={confirmDialog?.variant}
        onConfirm={confirmDialog?.onConfirm}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}

export default LocalMusic;
