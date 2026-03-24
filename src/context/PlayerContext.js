import React from 'react';
import { AudioProvider, useAudio } from './AudioContext';
import { PlaylistProvider, usePlaylist } from './PlaylistContext';

// Combined hook for components that need both audio + playlist
export function usePlayer() {
  const audio = useAudio();
  const playlist = usePlaylist();
  return { ...audio, ...playlist };
}

// Combined provider wrapping both contexts
export function PlayerProvider({ children }) {
  return (
    <AudioProvider>
      <PlaylistProvider>
        {children}
      </PlaylistProvider>
    </AudioProvider>
  );
}

// Re-export individual hooks for components that only need one
export { useAudio } from './AudioContext';
export { usePlaylist } from './PlaylistContext';
