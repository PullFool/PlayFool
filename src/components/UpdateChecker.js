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
  const downloadStartedRef = React.useRef(false);

  const checkForUpdate = async ({ manual = false } = {}) => {
    try {
      if (manual) {
        window.dispatchEvent(new CustomEvent('playfool:update-status', { detail: { status: 'checking' } }));
      }

      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (!res.ok) {
        if (manual) window.dispatchEvent(new CustomEvent('playfool:update-status', { detail: { status: 'error' } }));
        return;
      }
      const data = await res.json();

      localStorage.setItem('playfool_update_check', String(Date.now()));

      const latestVersion = (data.tag_name || '').replace(/^v/, '');
      const hasUpdate = latestVersion && latestVersion !== APP_VERSION && isNewer(latestVersion, APP_VERSION);

      if (hasUpdate) {
        const setupAsset = (data.assets || []).find(a =>
          a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe')
        );

        const info = {
          version: latestVersion,
          url: data.html_url,
          body: data.body || '',
          downloadUrl: setupAsset ? setupAsset.browser_download_url : null,
          fileName: setupAsset ? setupAsset.name : null,
        };
        setUpdateInfo(info);
        setDismissed(false);

        if (manual) {
          window.dispatchEvent(new CustomEvent('playfool:update-status', { detail: { status: 'found', version: latestVersion } }));
        }

        const isWindows = navigator.userAgent.toLowerCase().includes('windows');
        if (isWindows && info.downloadUrl) {
          startBackgroundDownload(info);
        }
      } else if (manual) {
        window.dispatchEvent(new CustomEvent('playfool:update-status', { detail: { status: 'up-to-date' } }));
      }
    } catch (e) {
      if (manual) window.dispatchEvent(new CustomEvent('playfool:update-status', { detail: { status: 'error' } }));
    }
  };

  useEffect(() => {
    const lastCheck = localStorage.getItem('playfool_update_check');
    const now = Date.now();

    // Auto-check once per day
    if (!lastCheck || now - Number(lastCheck) >= CHECK_INTERVAL) {
      checkForUpdate();
    }

    // Listen for manual "check now" requests from the sidebar
    const handler = () => checkForUpdate({ manual: true });
    window.addEventListener('playfool:check-update', handler);
    return () => window.removeEventListener('playfool:check-update', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startBackgroundDownload = async (info) => {
    // Guard against double-start: auto-download on launch + a manual click would
    // race two POSTs to /api/update/download, the second of which resets the
    // 'done' flag and the polling never sees completion.
    if (downloadStartedRef.current) return;
    downloadStartedRef.current = true;

    setDownloadState('downloading');
    setDownloadProgress(0);

    let pollProgress;
    const finish = (state) => {
      if (pollProgress) clearInterval(pollProgress);
      setDownloadState(state);
    };

    try {
      // Use the download response itself as a completion signal so we don't
      // depend solely on polling picking up the 'done' flag.
      fetch('/api/update/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: info.downloadUrl, fileName: info.fileName }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data && data.success) {
            setDownloadProgress(100);
            finish('ready');
          } else if (data && data.error) {
            finish('error');
          }
        })
        .catch(() => {});

      // Polling is a backup signal for progress + done while the POST is open
      pollProgress = setInterval(async () => {
        try {
          const prog = await fetch('/api/update/progress');
          const data = await prog.json();
          setDownloadProgress(data.percent || 0);
          if (data.done) finish('ready');
          if (data.error) finish('error');
        } catch(e) {}
      }, 1000);
    } catch (e) {
      finish('error');
    }
  };

  const handleAutoUpdate = async () => {
    if (!updateInfo?.downloadUrl) {
      // No setup exe found (non-Windows), fallback to opening browser
      try { window.nw.Shell.openExternal(updateInfo.url); } catch(e) {
        window.open(updateInfo.url, '_blank');
      }
      return;
    }
    // Windows already downloads in background on load — just start if somehow idle
    if (downloadState === 'idle') {
      startBackgroundDownload(updateInfo);
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
            <span className={styles.progressText}>Preparing update... {downloadProgress}%</span>
          </div>
        )}

        {downloadState === 'ready' && (
          <>
            <button className={styles.updateBtn} onClick={handleInstall}>
              Install & Restart
            </button>
            <button className={styles.dismissBtn} onClick={() => setDismissed(true)}>Later</button>
          </>
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
