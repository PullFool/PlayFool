import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './Equalizer.module.css';

const BANDS = [
  { freq: 60, label: '60Hz' },
  { freq: 250, label: '250Hz' },
  { freq: 1000, label: '1kHz' },
  { freq: 4000, label: '4kHz' },
  { freq: 16000, label: '16kHz' },
];

const PRESETS = {
  flat: [0, 0, 0, 0, 0],
  bass: [6, 4, 0, -2, -1],
  treble: [-1, -2, 0, 4, 6],
  vocal: [-2, 0, 4, 3, -1],
  rock: [4, 2, -1, 3, 5],
  pop: [-1, 2, 4, 2, -1],
  jazz: [3, 0, 1, 3, 4],
};

function Equalizer({ onClose }) {
  const [gains, setGains] = useState(() => {
    const saved = localStorage.getItem('playfool_eq');
    return saved ? JSON.parse(saved) : PRESETS.flat;
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
      if (filter.type === 'peaking') filter.Q.value = 1.5;
      return filter;
    });

    // Chain filters
    for (let i = 0; i < filters.length - 1; i++) {
      filters[i].connect(filters[i + 1]);
    }
    filters[filters.length - 1].connect(ctx.destination);

    filtersRef.current = filters;

    // Connect all audio/video elements
    const connectMedia = () => {
      if (connectedRef.current) return;
      const audioEls = document.querySelectorAll('audio, video');
      audioEls.forEach(el => {
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
                min="-12"
                max="12"
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
