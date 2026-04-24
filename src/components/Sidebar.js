import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { IoLogoYoutube, IoList, IoHome, IoVideocam, IoSunny, IoMoon, IoHeart } from 'react-icons/io5';
import { APP_VERSION } from './Tour';
import SupportModal from './SupportModal';
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('playfool_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

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
          <button className={styles.heartBtn} onClick={() => { recordHeart(); setShowSupport(true); }} title="Support PlayFool">
            <IoHeart />
          </button>
        </div>
        <div className={styles.trademarkRow}>
          <span className={styles.trademark}>Made by PullFool</span>
          <span className={styles.version}>v{APP_VERSION}</span>
        </div>
      </div>

      <SupportModal open={showSupport} onClose={() => setShowSupport(false)} />
    </aside>
  );
}

export default Sidebar;
