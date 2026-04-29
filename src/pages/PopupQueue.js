import React, { useState, useEffect } from 'react';
import { IoList, IoClose, IoPlay } from 'react-icons/io5';
import { subscribe, requestState, broadcastAction } from '../utils/playerBroadcast';
import styles from './PopupQueue.module.css';

function PopupQueue() {
  const [state, setState] = useState({ queue: [], currentSong: null });

  useEffect(() => {
    const cleanup = subscribe((msg) => {
      if (msg?.type === 'state') setState((s) => ({ ...s, ...msg.payload }));
    });
    requestState();
    return cleanup;
  }, []);

  const removeAt = (i) => broadcastAction('removeFromQueue', i);
  const playAt = (i) => broadcastAction('playFromQueue', i);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h3 className={styles.title}>Up Next</h3>
        <span className={styles.count}>
          {state.queue.length} song{state.queue.length !== 1 ? 's' : ''} in queue
        </span>
      </div>

      <div className={styles.content}>
        {state.queue.length === 0 ? (
          <div className={styles.empty}>
            <IoList className={styles.emptyIcon} />
            <p>Queue is empty</p>
            <small>Add songs to the queue from My Music</small>
          </div>
        ) : (
          <ul className={styles.list}>
            {state.queue.map((song, i) => (
              <li key={`${song.id}-${i}`} className={styles.row}>
                <span className={styles.num}>{i + 1}</span>
                <div className={styles.info}>
                  <div className={styles.songTitle}>{song.title}</div>
                  <div className={styles.songArtist}>{song.artist || 'Unknown'}</div>
                </div>
                <button className={styles.iconBtn} title="Play now" onClick={() => playAt(i)}>
                  <IoPlay />
                </button>
                <button className={styles.iconBtn} title="Remove" onClick={() => removeAt(i)}>
                  <IoClose />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default PopupQueue;
