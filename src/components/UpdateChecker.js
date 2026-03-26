import React, { useState, useEffect } from 'react';
import { APP_VERSION } from './Tour';
import styles from './UpdateChecker.module.css';

const GITHUB_REPO = 'PullFool/PlayFool';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Check once per day

function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [downloadState, setDownloadState] = useState('idle'); // idle, downloading, ready, error
  const [downloadProgress, setDownloadProgress] = useState(0);

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
          // Find the setup exe in assets
          const setupAsset = (data.assets || []).find(a =>
            a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe')
          );

          setUpdateInfo({
            version: latestVersion,
            url: data.html_url,
            body: data.body || '',
            downloadUrl: setupAsset ? setupAsset.browser_download_url : null,
            fileName: setupAsset ? setupAsset.name : null,
          });
        }
      } catch (e) {
        // Silently fail
      }
    };

    checkForUpdate();
  }, []);

  const handleAutoUpdate = async () => {
    if (!updateInfo?.downloadUrl) {
      // No setup exe found, fallback to opening browser
      try { window.nw.Shell.openExternal(updateInfo.url); } catch(e) {
        window.open(updateInfo.url, '_blank');
      }
      return;
    }

    setDownloadState('downloading');
    setDownloadProgress(0);

    try {
      // Download via server (server has access to filesystem)
      const res = await fetch('/api/update/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: updateInfo.downloadUrl, fileName: updateInfo.fileName }),
      });

      if (!res.ok) throw new Error('Download failed');

      // Poll for download progress
      const pollProgress = setInterval(async () => {
        try {
          const prog = await fetch('/api/update/progress');
          const data = await prog.json();
          setDownloadProgress(data.percent || 0);
          if (data.done) {
            clearInterval(pollProgress);
            setDownloadState('ready');
          }
          if (data.error) {
            clearInterval(pollProgress);
            setDownloadState('error');
          }
        } catch(e) {}
      }, 500);

      const data = await res.json();
      if (data.success) {
        setDownloadState('ready');
      } else {
        setDownloadState('error');
      }
    } catch (e) {
      setDownloadState('error');
    }
  };

  const handleInstall = async () => {
    try {
      await fetch('/api/update/install', { method: 'POST' });
      // App will close and restart after install
    } catch(e) {}
  };

  if (!updateInfo || dismissed) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.text}>
        <strong>PlayFool v{updateInfo.version}</strong> is available!
        <span className={styles.current}>You have v{APP_VERSION}</span>
      </div>

      <div className={styles.actions}>
        {downloadState === 'idle' && (
          <>
            <button className={styles.updateBtn} onClick={handleAutoUpdate}>
              Update Now
            </button>
            <button className={styles.dismissBtn} onClick={() => setDismissed(true)}>Later</button>
          </>
        )}

        {downloadState === 'downloading' && (
          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${downloadProgress}%` }} />
            </div>
            <span className={styles.progressText}>Downloading... {downloadProgress}%</span>
          </div>
        )}

        {downloadState === 'ready' && (
          <button className={styles.updateBtn} onClick={handleInstall}>
            Restart & Install
          </button>
        )}

        {downloadState === 'error' && (
          <>
            <span className={styles.errorText}>Download failed</span>
            <button className={styles.updateBtn} onClick={() => {
              try { window.nw.Shell.openExternal(updateInfo.url); } catch(e) {
                window.open(updateInfo.url, '_blank');
              }
            }}>
              Download Manually
            </button>
            <button className={styles.dismissBtn} onClick={() => setDismissed(true)}>Later</button>
          </>
        )}
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
