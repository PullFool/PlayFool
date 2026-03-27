import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { IoLogoYoutube, IoList, IoHome, IoVideocam, IoSunny, IoMoon } from 'react-icons/io5';
import { APP_VERSION } from './Tour';
import styles from './Sidebar.module.css';

function Sidebar() {
  const [theme, setTheme] = useState(() => localStorage.getItem('playfool_theme') || 'dark');

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
        <button className={styles.themeToggle} onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <IoSunny /> : <IoMoon />}
        </button>
        <div className={styles.trademarkRow}>
          <span className={styles.trademark}>Made by PullFool</span>
          <span className={styles.version}>v{APP_VERSION}</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
