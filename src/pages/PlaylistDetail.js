import React, { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { IoArrowBack, IoPlay, IoMusicalNotes, IoTrash, IoAdd, IoCheckmark, IoSearch, IoShuffle, IoReorderThree } from 'react-icons/io5';
import styles from './PlaylistDetail.module.css';

const API_BASE = process.env.REACT_APP_API_URL;
const SERVER_BASE = process.env.REACT_APP_SERVER_URL;

function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playlists, playSong, shufflePlay, currentSong, isPlaying, removeFromPlaylist, addToPlaylist, reorderPlaylist } = usePlayer();
  const [showAddModal, setShowAddModal] = useState(false);
  const [librarySongs, setLibrarySongs] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragRef = useRef(null);

  const playlist = playlists.find(p => p.id === Number(id));

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/library`);
      const data = await res.json();
      if (data.songs) {
        setLibrarySongs(data.songs.map(s => ({
          ...s, url: `${SERVER_BASE}/${s.file}`, cover: null, source: 'youtube',
        })));
      }
    } catch (e) {
      console.error('Failed to load library:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!playlist) {
    return (
      <div className="page">
        <p>Playlist not found</p>
        <button className="btn btn-secondary" onClick={() => navigate('/playlists')}>Back</button>
      </div>
    );
  }

  const isSongInPlaylist = (url) => playlist.songs.some(s => s.url === url);
  const filteredSongs = librarySongs.filter(s => s.title.toLowerCase().includes(searchFilter.toLowerCase()));

  return (
    <div className="page">
      <div className={styles.header}>
        <button onClick={() => navigate('/playlists')} className="btn-icon"><IoArrowBack /></button>
        <div className={styles.info}>
          <h1 className="page-title mb-0">{playlist.name}</h1>
          <p className={styles.count}>{playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}</p>
        </div>
        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={() => { setShowAddModal(true); loadLibrary(); }}>
            <IoAdd /> Add Songs
          </button>
          {playlist.songs.length > 0 && (
            <>
              <button className="btn btn-secondary" onClick={() => shufflePlay(playlist.songs)}>
                <IoShuffle /> Shuffle
              </button>
              <button className="btn btn-primary" onClick={() => playSong(playlist.songs, 0)}>
                <IoPlay /> Play All
              </button>
            </>
          )}
        </div>
      </div>

      {playlist.songs.length === 0 ? (
        <div className="empty-state">
          <IoMusicalNotes className="icon" />
          <h3>Empty playlist</h3>
          <p>Click "Add Songs" to browse your library</p>
        </div>
      ) : (
        <ul className="song-list">
          {playlist.songs.map((song, index) => (
            <li key={song.url + index}
              className={`song-item ${currentSong?.url === song.url ? 'active' : ''} ${dragOverIndex === index ? styles.dragOver : ''}`}
              onClick={() => playSong(playlist.songs, index)}
              draggable
              onDragStart={() => { setDragIndex(index); dragRef.current = index; }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (dragRef.current !== null && dragRef.current !== index) {
                  reorderPlaylist(playlist.id, dragRef.current, index);
                }
                setDragIndex(null);
                setDragOverIndex(null);
                dragRef.current = null;
              }}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); dragRef.current = null; }}
              style={{ opacity: dragIndex === index ? 0.4 : 1 }}
            >
              <span className="song-item-number" style={{ cursor: 'grab' }} title="Drag to reorder">
                <IoReorderThree />
              </span>
              <div className="song-item-art">
                {song.cover ? <img src={song.cover} alt="" /> : <IoMusicalNotes className="icon" />}
              </div>
              <div className="song-item-info">
                <div className="song-item-title">{song.title}</div>
                <div className="song-item-artist">{song.artist}</div>
              </div>
              <button className="btn-icon btn-icon-muted" title="Remove"
                onClick={(e) => { e.stopPropagation(); removeFromPlaylist(playlist.id, song.url); }}
              ><IoTrash /></button>
            </li>
          ))}
        </ul>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className={`modal ${styles.modal}`} onClick={(e) => e.stopPropagation()}>
            <h3>Add Songs to "{playlist.name}"</h3>
            <div className={styles.searchWrapper}>
              <IoSearch className={styles.searchIcon} />
              <input type="text" placeholder="Search your library..."
                value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)}
                className={styles.searchInput} autoFocus
              />
            </div>
            <div className={styles.modalList}>
              {loading ? (
                <p className={styles.modalMsg}>Loading...</p>
              ) : filteredSongs.length === 0 ? (
                <p className={styles.modalMsg}>
                  {librarySongs.length === 0 ? 'No songs in library. Download some from YouTube first!' : 'No matching songs'}
                </p>
              ) : (
                <ul className="song-list">
                  {filteredSongs.map((song) => {
                    const added = isSongInPlaylist(song.url);
                    return (
                      <li key={song.id} className="song-item"
                        onClick={() => added ? removeFromPlaylist(playlist.id, song.url) : addToPlaylist(playlist.id, song)}
                      >
                        <div className="song-item-art"><IoMusicalNotes className="icon" /></div>
                        <div className="song-item-info">
                          <div className="song-item-title">{song.title}</div>
                          <div className="song-item-artist">{song.artist}</div>
                        </div>
                        <div className={`${styles.toggleBtn} ${added ? styles.toggleBtnAdded : ''}`}>
                          {added ? <IoCheckmark /> : <IoAdd />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowAddModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlaylistDetail;
