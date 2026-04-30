import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { IoLogoYoutube, IoList, IoHome, IoVideocam, IoSunny, IoMoon, IoHeart, IoSync } from 'react-icons/io5';
import { APP_VERSION } from './Tour';
import SupportModal from './SupportModal';
import SyncDialog from './SyncDialog';
import styles from './Sidebar.module.css';

const HEARTS_API = 'https://adrianborboran.up.railway.app/api/hearts';

// Anonymous per-install UUID — generated once, reused forever
function getInstallId() {
  let id = localStorage.getItem('playfool_install_id');
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) ||
         `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('playfool_install_id', id);
  }
  return id;
}

function recordHeart() {
  try {
    fetch(HEARTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        install_id: getInstallId(),
        app_version: APP_VERSION,
        platform: navigator.userAgent.toLowerCase().includes('mac') ? 'mac' : 'windows',
      }),
      keepalive: true,
    }).catch(() => {});
  } catch(e) { /* silent */ }
}

function Sidebar() {
  const [theme, setTheme] = useState(() => localStorage.getItem('playfool_theme') || 'dark');
  const [showSupport, setShowSupport] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [hasHearted, setHasHearted] = useState(false); // Session-only: red during this run, resets on next launch
  const [updateStatus, setUpdateStatus] = useState(null); // 'checking' | 'up-to-date' | 'found' | 'error'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('playfool_theme', theme);
  }, [theme]);

  // Listen for update-check feedback from UpdateChecker
  useEffect(() => {
    const handler = (e) => {
      setUpdateStatus(e.detail?.status || null);
      // Auto-clear transient statuses after a few seconds
      if (e.detail?.status === 'up-to-date' || e.detail?.status === 'error' || e.detail?.status === 'found') {
        setTimeout(() => setUpdateStatus(null), 4000);
      }
    };
    window.addEventListener('playfool:update-status', handler);
    return () => window.removeEventListener('playfool:update-status', handler);
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const onHeartClick = () => {
    // Open modal; heart is only counted if user clicks "Yes, I love it!"
    setShowSupport(true);
  };

  const handleLike = () => {
    recordHeart();
    setHasHearted(true);
  };

  const onVersionClick = () => {
    // Bypass the 24h cache and force an update check
    localStorage.removeItem('playfool_update_check');
    window.dispatchEvent(new CustomEvent('playfool:check-update'));
  };

  const versionLabel = (() => {
    if (updateStatus === 'checking') return 'Checking...';
    if (updateStatus === 'up-to-date') return 'Up to date ✓';
    if (updateStatus === 'error') return 'Check failed';
    if (updateStatus === 'found') return 'Update ready!';
    return `v${APP_VERSION}`;
  })();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src="/icon.png" alt="PlayFool" className={styles.logoIcon} />
        <span>PlayFool</span>
      </div>
      <nav className={styles.nav}>
        <NavLink to="/" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <IoHome /> <span>My Music</span>
        </NavLink>
        <NavLink to="/videos" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <IoVideocam /> <span>My Videos</span>
        </NavLink>
        <NavLink to="/youtube" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <IoLogoYoutube /> <span>YouTube</span>
        </NavLink>
        <NavLink to="/playlists" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <IoList /> <span>Playlists</span>
        </NavLink>
      </nav>
      <div className={styles.bottom}>
        <div className={styles.bottomBtns}>
          <button className={styles.themeToggle} onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <IoSunny /> : <IoMoon />}
          </button>
          <button
            className={styles.themeToggle}
            onClick={() => setShowSync(true)}
            title="Library Sync"
          >
            <IoSync />
          </button>
          <button
            className={`${styles.heartBtn} ${hasHearted ? styles.heartBtnActive : ''}`}
            onClick={onHeartClick}
            title={hasHearted ? 'Thanks for the love! ❤️' : 'Support PlayFool'}
          >
            <IoHeart />
          </button>
        </div>
        <div className={styles.trademarkRow}>
          <span className={styles.trademark}>Made by PullFool</span>
          <button
            className={styles.version}
            onClick={onVersionClick}
            title="Check for updates"
          >
            {versionLabel}
          </button>
        </div>
      </div>

      <SupportModal
        open={showSupport}
        alreadyHearted={hasHearted}
        onClose={() => setShowSupport(false)}
        onLike={handleLike}
      />

      <SyncDialog open={showSync} onClose={() => setShowSync(false)} />
    </aside>
  );
}

export default Sidebar;
