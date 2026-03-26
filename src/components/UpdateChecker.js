import React, { useState, useEffect } from 'react';
import { APP_VERSION } from './Tour';
import styles from './UpdateChecker.module.css';

const GITHUB_REPO = 'PullFool/PlayFool';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Check once per day

function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const lastCheck = localStorage.getItem('playfool_update_check');
    const now = Date.now();

    // Only check once per day
    if (lastCheck && now - Number(lastCheck) < CHECK_INTERVAL) return;

    const checkForUpdate = async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
        if (!res.ok) return;
        const data = await res.json();

        localStorage.setItem('playfool_update_check', String(now));

        const latestVersion = (data.tag_name || '').replace(/^v/, '');
        if (latestVersion && latestVersion !== APP_VERSION && isNewer(latestVersion, APP_VERSION)) {
          setUpdateInfo({
            version: latestVersion,
            url: data.html_url,
            body: data.body || '',
          });
        }
      } catch (e) {
        // Silently fail - no internet or API rate limited
      }
    };

    checkForUpdate();
  }, []);

  if (!updateInfo || dismissed) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.text}>
        <strong>PlayFool v{updateInfo.version}</strong> is available!
        <span className={styles.current}>You have v{APP_VERSION}</span>
      </div>
      <div className={styles.actions}>
        <a
          href={updateInfo.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.updateBtn}
          onClick={() => {
            // Open in default browser for NW.js
            try { window.nw.Shell.openExternal(updateInfo.url); } catch(e) {}
          }}
        >
          Download
        </a>
        <button className={styles.dismissBtn} onClick={() => setDismissed(true)}>Later</button>
      </div>
    </div>
  );
}

function isNewer(latest, current) {
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lv = l[i] || 0;
    const cv = c[i] || 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

export default UpdateChecker;
