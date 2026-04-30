import React, { useState, useEffect } from 'react';
import { IoRemoveOutline, IoSquareOutline, IoClose, IoContract } from 'react-icons/io5';
import styles from './TitleBar.module.css';

// Custom title bar — replaces the OS frame because we run with
// transparent: true + frame: false in package.json.
// The whole bar is a drag region (`-webkit-app-region: drag`); buttons
// opt back out via `no-drag` so clicks register.
function TitleBar() {
  const [isMini, setIsMini] = useState(false);

  useEffect(() => {
    const update = () => setIsMini(document.querySelector('.app')?.classList.contains('mini-mode'));
    update();
    const obs = new MutationObserver(update);
    const el = document.querySelector('.app');
    if (el) obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const minimize = () => {
    try {
      // Server hides the window to tray. Falls back to native minimize on error.
      fetch('/api/window/minimize', { method: 'POST' }).catch(() => {
        try { window.nw?.Window?.get()?.minimize(); } catch (e) {}
      });
    } catch (e) {
      try { window.nw?.Window?.get()?.minimize(); } catch (_) {}
    }
  };

  const toggleMini = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      const res = await fetch('/api/mini-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasVideo: false }),
      });
      const data = await res.json();
      const appEl = document.querySelector('.app');
      if (data.mini) appEl?.classList.add('mini-mode');
      else appEl?.classList.remove('mini-mode');
    } catch (e) {}
  };

  const close = () => {
    try {
      window.nw?.Window?.get()?.close();
    } catch (e) {}
  };

  return (
    <div className={styles.bar}>
      <div className={styles.dragRegion}>
        <span className={styles.title}>PlayFool</span>
      </div>
      <div className={styles.controls}>
        <button className={styles.btn} onClick={minimize} title="Minimize to tray">
          <IoRemoveOutline />
        </button>
        <button className={styles.btn} onClick={toggleMini} title={isMini ? 'Expand' : 'Mini player'}>
          {isMini ? <IoSquareOutline /> : <IoContract />}
        </button>
        <button className={`${styles.btn} ${styles.closeBtn}`} onClick={close} title="Close">
          <IoClose />
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
