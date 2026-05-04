import React, { useState, useEffect } from 'react';
import styles from './Tour.module.css';

const APP_VERSION = '1.9.25';

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
    description: 'Faster downloads, more search results, and cleaner library.',
    icon: '🆕',
  },
  {
    title: 'Parallel Downloads',
    description: 'You can now download multiple songs and videos at the same time! Click MP3 or MP4 on any result and hit more without waiting — they all download in parallel.',
    icon: '⚡',
  },
  {
    title: 'Download Progress on Each Button',
    description: 'Each download shows its own spinner right on the button. When it finishes, the button turns green with a ✓ Done tag so you know which ones you already grabbed.',
    icon: '✅',
  },
  {
    title: '15 Results per Search',
    description: 'YouTube search now returns 15 results per query (was 5) — more to pick from without searching again.',
    icon: '🔍',
  },
  {
    title: 'Smarter Library Refresh',
    description: 'My Music and My Videos now refresh automatically every time you open them. Your new downloads always appear without clicking refresh.',
    icon: '🔄',
  },
  {
    title: 'Cleaner My Music',
    description: 'Removed the drag-and-drop upload box for a cleaner library view. Use the Scan PC button or YouTube downloads to add music.',
    icon: '🎨',
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
