import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PopupLyrics from './PopupLyrics';
import PopupEqualizer from './PopupEqualizer';
import PopupQueue from './PopupQueue';
import styles from './PopupApp.module.css';

const TITLES = {
  lyrics: 'PlayFool - Lyrics',
  equalizer: 'PlayFool - Equalizer',
  queue: 'PlayFool - Queue',
};

// Bare layout for the popup window: just the requested panel, no sidebar/player/etc.
function PopupApp() {
  const { type } = useParams();

  // Update the OS window title bar — index.html ships with title='PlayFool'
  // which would otherwise override the title we passed to nw.Window.open.
  useEffect(() => {
    const title = TITLES[type] || 'PlayFool';
    document.title = title;
  }, [type]);

  let body = <div className={styles.error}>Unknown panel: {type}</div>;
  if (type === 'lyrics') body = <PopupLyrics />;
  else if (type === 'equalizer') body = <PopupEqualizer />;
  else if (type === 'queue') body = <PopupQueue />;

  return <div className={styles.root}>{body}</div>;
}

export default PopupApp;
