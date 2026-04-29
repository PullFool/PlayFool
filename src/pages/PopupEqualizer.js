import React, { useEffect, useState } from 'react';
import { broadcastAction, subscribe, requestState } from '../utils/playerBroadcast';
import styles from './PopupEqualizer.module.css';

// Same band layout the main Equalizer uses (10-band hi-fi).
const BANDS = [
  { freq: 31, label: '31Hz' }, { freq: 62, label: '62Hz' },
  { freq: 125, label: '125Hz' }, { freq: 250, label: '250Hz' },
  { freq: 500, label: '500Hz' }, { freq: 1000, label: '1kHz' },
  { freq: 2000, label: '2kHz' }, { freq: 4000, label: '4kHz' },
  { freq: 8000, label: '8kHz' }, { freq: 16000, label: '16kHz' },
];
const PRESETS = {
  flat:   [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
  bass:   [ 8,  7,  6,  4,  2,  0, -1, -2, -1,  0],
  treble: [ 0, -1, -2, -1,  0,  2,  4,  6,  7,  8],
  vocal:  [-3, -2, -1,  1,  3,  5,  4,  2,  0, -1],
  rock:   [ 5,  4,  2,  0, -1,  1,  3,  5,  6,  6],
  pop:    [-2, -1,  0,  2,  4,  4,  2,  0, -1, -2],
  jazz:   [ 4,  3,  1,  0,  1,  3,  4,  3,  2,  3],
};
const GAIN_RANGE = 18;

function PopupEqualizer() {
  // Initialize from localStorage so the popup shows whatever the main window
  // currently has applied. (The main window writes to the same key.)
  const [gains, setGains] = useState(() => {
    try {
      const saved = localStorage.getItem('playfool_eq');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length === BANDS.length) return parsed;
    } catch (e) {}
    return [...PRESETS.flat];
  });
  const [activePreset, setActivePreset] = useState('flat');

  // Push the initial state and re-sync if the main window broadcasts any update
  useEffect(() => {
    requestState();
    const cleanup = subscribe(() => { /* no-op for EQ — gains live in localStorage */ });
    return cleanup;
  }, []);

  const updateGains = (next) => {
    setGains(next);
    try { localStorage.setItem('playfool_eq', JSON.stringify(next)); } catch (e) {}
    broadcastAction('setEqGains', next);
  };

  const handleGainChange = (i, value) => {
    const next = [...gains];
    next[i] = Number(value);
    setActivePreset('');
    updateGains(next);
  };

  const applyPreset = (name) => {
    setActivePreset(name);
    updateGains([...PRESETS[name]]);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h3 className={styles.title}>Equalizer</h3>
      </div>

      <div className={styles.presets}>
        {Object.keys(PRESETS).map((name) => (
          <button
            key={name}
            className={`${styles.presetBtn} ${activePreset === name ? styles.presetActive : ''}`}
            onClick={() => applyPreset(name)}
          >
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.bands}>
        {BANDS.map((band, i) => (
          <div key={band.freq} className={styles.band}>
            <span className={styles.gainValue}>{gains[i] > 0 ? '+' : ''}{gains[i]}dB</span>
            <input
              type="range"
              min={-GAIN_RANGE}
              max={GAIN_RANGE}
              step="1"
              value={gains[i]}
              onChange={(e) => handleGainChange(i, e.target.value)}
              className={styles.slider}
              orient="vertical"
            />
            <span className={styles.freq}>{band.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PopupEqualizer;
