import React, { useState, useEffect } from 'react';
import styles from './Tour.module.css';

const APP_VERSION = '1.8.0';

const welcomeSteps = [
  {
    title: 'Welcome to PlayFool!',
    description: 'Your desktop music & video player. Let\'s take a quick tour of what you can do.',
    icon: '🎵',
  },
  {
    title: 'My Music',
    description: 'View your music library here. Drag & drop files to add music, or click the refresh button to scan your PC for songs.',
    icon: '🏠',
    highlight: 'sidebar-music',
  },
  {
    title: 'My Videos',
    description: 'Browse and play your downloaded videos. You can also scan your PC for existing video files.',
    icon: '🎬',
    highlight: 'sidebar-videos',
  },
  {
    title: 'YouTube Search',
    description: 'Search YouTube for any song or video. Click a result to preview it with video, or download as MP3 or MP4.',
    icon: '🔍',
    highlight: 'sidebar-youtube',
  },
  {
    title: 'Playlists',
    description: 'Create and manage playlists. Add songs from your library or YouTube downloads.',
    icon: '📋',
    highlight: 'sidebar-playlists',
  },
  {
    title: 'Player Controls',
    description: 'The bottom bar shows what\'s playing. Use play/pause, skip, seek, and volume controls. Click the song info to open full-screen view.',
    icon: '🎧',
    highlight: 'player',
  },
  {
    title: 'Keyboard Shortcuts',
    description: 'Space = Play/Pause\nCtrl+→ = Next track\nCtrl+← = Previous track\nCtrl+↑/↓ = Volume\nCtrl+Q = Quit',
    icon: '⌨️',
  },
  {
    title: 'System Tray',
    description: 'When you close the window, PlayFool minimizes to the system tray. Right-click the tray icon to show or quit the app.',
    icon: '📌',
  },
  {
    title: 'You\'re all set!',
    description: 'Start by searching for a song on YouTube or adding music from your PC. Enjoy!',
    icon: '🚀',
  },
];

const updateSteps = [
  {
    title: `What's New in v${APP_VERSION}`,
    description: 'PlayFool has been updated with awesome new features!',
    icon: '🆕',
  },
  {
    title: 'Dark / Light Theme',
    description: 'Switch between dark and light mode! Click the sun/moon icon at the bottom of the sidebar.',
    icon: '🌓',
  },
  {
    title: 'Mini Player',
    description: 'Click the minimize icon in the player bar to shrink PlayFool into a small floating window that stays on top of other apps. Click again to expand.',
    icon: '🔲',
  },
  {
    title: 'Song Queue',
    description: 'Build your own "Up Next" list! Hover over any song and click:\n⏭ Play Next - inserts after current song\n☰ Add to Queue - adds to the end\nClick the queue icon in the player bar to see and manage your queue.',
    icon: '📋',
  },
  {
    title: 'More Improvements',
    description: 'Equalizer with presets\nSearch history\nDrag & drop playlist reorder\nDownload queue\nAlbum art thumbnails\nAuto-update checker',
    icon: '✨',
  },
  {
    title: 'Enjoy the update!',
    description: 'More features coming soon. Check GitHub for the latest releases.',
    icon: '🎉',
  },
];

function Tour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tourType, setTourType] = useState(null); // 'welcome' or 'update' or null
  const [steps, setSteps] = useState([]);

  useEffect(() => {
    const lastVersion = localStorage.getItem('playfool_version');
    const tourSeen = localStorage.getItem('playfool_tour_seen');

    if (!tourSeen) {
      // First time - show welcome tour
      setTourType('welcome');
      setSteps(welcomeSteps);
    } else if (lastVersion && lastVersion !== APP_VERSION) {
      // Version changed - show update tour
      setTourType('update');
      setSteps(updateSteps);
    } else {
      // Already seen, same version
      if (onComplete) onComplete();
    }
  }, [onComplete]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = () => {
    localStorage.setItem('playfool_tour_seen', 'true');
    localStorage.setItem('playfool_version', APP_VERSION);
    setTourType(null);
    if (onComplete) onComplete();
  };

  if (!tourType || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.icon}>{step.icon}</div>
        <h2 className={styles.title}>{step.title}</h2>
        <p className={styles.description}>{step.description}</p>

        <div className={styles.dots}>
          {steps.map((_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i === currentStep ? styles.dotActive : ''}`}
              onClick={() => setCurrentStep(i)}
            />
          ))}
        </div>

        <div className={styles.actions}>
          {!isFirst && (
            <button className={styles.btnSecondary} onClick={handlePrev}>Back</button>
          )}
          {isFirst && tourType === 'welcome' && (
            <button className={styles.btnSecondary} onClick={handleSkip}>Skip Tour</button>
          )}
          <button className={styles.btnPrimary} onClick={handleNext}>
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>

        <div className={styles.stepCount}>
          {currentStep + 1} / {steps.length}
        </div>
      </div>
    </div>
  );
}

export default Tour;
export { APP_VERSION };
