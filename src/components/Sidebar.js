import React from 'react';
import { NavLink } from 'react-router-dom';
import { IoLogoYoutube, IoList, IoHome, IoVideocam } from 'react-icons/io5';
import styles from './Sidebar.module.css';

function Sidebar() {
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
      <div className={styles.trademark}>Made by PullFool</div>
    </aside>
  );
}

export default Sidebar;
