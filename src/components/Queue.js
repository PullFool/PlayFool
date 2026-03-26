import React, { useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { IoClose, IoMusicalNotes, IoPlay, IoTrash, IoReorderThree } from 'react-icons/io5';
import styles from './Queue.module.css';

function Queue({ onClose }) {
  const { songs, currentIndex, currentSong, playSong, queue, removeFromQueue, reorderQueue, playFromQueue } = usePlayer();
  const dragRef = useRef(null);
  const [dragOver, setDragOver] = React.useState(null);

  const upNext = songs.slice(currentIndex + 1);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Queue</h3>
        <button className={styles.closeBtn} onClick={onClose}><IoClose /></button>
      </div>

      {currentSong && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Now Playing</h4>
          <div className={`${styles.item} ${styles.itemActive}`}>
            <div className={styles.art}>
              {currentSong.cover ? <img src={currentSong.cover} alt="" /> : <IoMusicalNotes />}
            </div>
            <div className={styles.info}>
              <div className={styles.title}>{currentSong.title}</div>
              <div className={styles.artist}>{currentSong.artist || 'Unknown'}</div>
            </div>
          </div>
        </div>
      )}

      {queue && queue.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Added to Queue</h4>
          <ul className={styles.list}>
            {queue.map((song, i) => (
              <li
                key={`q-${i}`}
                className={`${styles.item} ${dragOver === i ? styles.dragOver : ''}`}
                draggable
                onDragStart={() => { dragRef.current = i; }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragRef.current !== null && dragRef.current !== i) reorderQueue(dragRef.current, i);
                  dragRef.current = null;
                  setDragOver(null);
                }}
                onDragEnd={() => { dragRef.current = null; setDragOver(null); }}
                onClick={() => playFromQueue(i)}
              >
                <span className={styles.drag}><IoReorderThree /></span>
                <div className={styles.art}>
                  {song.cover ? <img src={song.cover} alt="" /> : <IoMusicalNotes />}
                </div>
                <div className={styles.info}>
                  <div className={styles.title}>{song.title}</div>
                  <div className={styles.artist}>{song.artist || 'Unknown'}</div>
                </div>
                <button className={styles.removeBtn} onClick={(e) => { e.stopPropagation(); removeFromQueue(i); }}>
                  <IoTrash />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {upNext.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Up Next</h4>
          <ul className={styles.list}>
            {upNext.map((song, i) => (
              <li key={`next-${i}`} className={styles.item} onClick={() => playSong(songs, currentIndex + 1 + i)}>
                <span className={styles.number}>{i + 1}</span>
                <div className={styles.art}>
                  {song.cover ? <img src={song.cover} alt="" /> : <IoMusicalNotes />}
                </div>
                <div className={styles.info}>
                  <div className={styles.title}>{song.title}</div>
                  <div className={styles.artist}>{song.artist || 'Unknown'}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(!queue || queue.length === 0) && upNext.length === 0 && !currentSong && (
        <div className={styles.empty}>
          <IoMusicalNotes className={styles.emptyIcon} />
          <p>Queue is empty</p>
          <p className={styles.emptyHint}>Right-click a song and select "Play Next" or "Add to Queue"</p>
        </div>
      )}
    </div>
  );
}

export default Queue;
