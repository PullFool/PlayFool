import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { IoAdd, IoMusicalNotes, IoTrash } from 'react-icons/io5';
import styles from './Playlists.module.css';

function Playlists() {
  const { playlists, createPlaylist, deletePlaylist } = usePlayer();
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const navigate = useNavigate();

  const handleCreate = () => {
    if (newName.trim()) {
      createPlaylist(newName.trim());
      setNewName('');
      setShowModal(false);
    }
  };

  return (
    <div className="page">
      <div className="flex-between mb-24">
        <h1 className="page-title mb-0">Playlists</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <IoAdd /> New Playlist
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="empty-state">
          <IoMusicalNotes className="icon" />
          <h3>No playlists yet</h3>
          <p>Create a playlist and add songs to it</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {playlists.map(p => (
            <div key={p.id} className={styles.card} onClick={() => navigate(`/playlist/${p.id}`)}>
              <div className={styles.cardArt}>
                {p.songs.length > 0 && p.songs[0].cover
                  ? <img src={p.songs[0].cover} alt="" />
                  : <IoMusicalNotes className={styles.cardIcon} />
                }
              </div>
              <div className={styles.cardName}>{p.name}</div>
              <div className={styles.cardMeta}>
                <span>{p.songs.length} song{p.songs.length !== 1 ? 's' : ''}</span>
                <button className="btn-icon btn-icon-muted"
                  onClick={(e) => { e.stopPropagation(); deletePlaylist(p.id); }}
                >
                  <IoTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create Playlist</h3>
            <input type="text" placeholder="Playlist name" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Playlists;
