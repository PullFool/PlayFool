import React, { useState, useEffect, useRef, useCallback } from 'react';
import { subscribe } from '../utils/playerBroadcast';
import styles from './Equalizer.module.css';

// 10-band hi-fi EQ (Winamp/Foobar standard frequencies)
const BANDS = [
  { freq: 31, label: '31Hz' },
  { freq: 62, label: '62Hz' },
  { freq: 125, label: '125Hz' },
  { freq: 250, label: '250Hz' },
  { freq: 500, label: '500Hz' },
  { freq: 1000, label: '1kHz' },
  { freq: 2000, label: '2kHz' },
  { freq: 4000, label: '4kHz' },
  { freq: 8000, label: '8kHz' },
  { freq: 16000, label: '16kHz' },
];

const GAIN_RANGE = 18; // ±18 dB for clearly audible adjustments
const PEAKING_Q = 1.4;  // wider Q so each band affects a broader range = obvious effect

const PRESETS = {
  flat:   [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
  bass:   [ 8,  7,  6,  4,  2,  0, -1, -2, -1,  0],
  treble: [ 0, -1, -2, -1,  0,  2,  4,  6,  7,  8],
  vocal:  [-3, -2, -1,  1,  3,  5,  4,  2,  0, -1],
  rock:   [ 5,  4,  2,  0, -1,  1,  3,  5,  6,  6],
  pop:    [-2, -1,  0,  2,  4,  4,  2,  0, -1, -2],
  jazz:   [ 4,  3,  1,  0,  1,  3,  4,  3,  2,  3],
};

// `visible=false` keeps the audio graph alive (filters connected) but hides the UI
// so popup windows can apply gain changes even when the user closed the inline panel.
function Equalizer({ onClose, visible = true }) {
  const [gains, setGains] = useState(() => {
    const saved = localStorage.getItem('playfool_eq');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old 5-band saves to the new 10-band layout
        if (Array.isArray(parsed) && parsed.length === BANDS.length) return parsed;
      } catch (e) {}
    }
    return [...PRESETS.flat];
  });
  const [activePreset, setActivePreset] = useState('flat');
  const filtersRef = useRef([]);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const connectedRef = useRef(false);

  // Initialize Web Audio API
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;

    // Create 5-band EQ filters
    const filters = BANDS.map((band, i) => {
      const filter = ctx.createBiquadFilter();
      filter.type = i === 0 ? 'lowshelf' : i === BANDS.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = band.freq;
      filter.gain.value = gains[i];
      if (filter.type === 'peaking') filter.Q.value = PEAKING_Q;
      return filter;
    });

    // Chain filters
    for (let i = 0; i < filters.length - 1; i++) {
      filters[i].connect(filters[i + 1]);
    }
    filters[filters.length - 1].connect(ctx.destination);

    filtersRef.current = filters;

    // Connect audio elements and unmuted video elements (skip muted preview videos to prevent double sound)
    const connectMedia = () => {
      if (connectedRef.current) return;
      const mediaEls = document.querySelectorAll('audio, video');
      mediaEls.forEach(el => {
        if (el.tagName === 'VIDEO' && el.muted) return; // Skip muted preview videos
        try {
          const source = ctx.createMediaElementSource(el);
          source.connect(filters[0]);
          connectedRef.current = true;
        } catch (e) {
          // Already connected or error
        }
      });
    };

    connectMedia();

    // Re-try connecting when new media elements appear
    const observer = new MutationObserver(() => {
      if (!connectedRef.current) connectMedia();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, [gains]);

  useEffect(() => {
    initAudio();
  }, [initAudio]);

  // Update filter gains
  useEffect(() => {
    filtersRef.current.forEach((filter, i) => {
      if (filter && gains[i] !== undefined) {
        filter.gain.value = gains[i];
      }
    });
    localStorage.setItem('playfool_eq', JSON.stringify(gains));
  }, [gains]);

  const handleGainChange = (index, value) => {
    const newGains = [...gains];
    newGains[index] = Number(value);
    setGains(newGains);
    setActivePreset('');
  };

  // Apply gain changes broadcast from popup EQ window
  useEffect(() => {
    return subscribe((msg) => {
      if (msg?.type === 'action' && msg.name === 'setEqGains' && Array.isArray(msg.args)) {
        if (msg.args.length === BANDS.length) {
          setGains(msg.args);
          setActivePreset('');
        }
      }
    });
  }, []);

  if (!visible) return null;

  const applyPreset = (name) => {
    setGains([...PRESETS[name]]);
    setActivePreset(name);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Equalizer</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.presets}>
          {Object.keys(PRESETS).map(name => (
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
                onChange={e => handleGainChange(i, e.target.value)}
                className={styles.slider}
                orient="vertical"
              />
              <span className={styles.freq}>{band.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Equalizer;
