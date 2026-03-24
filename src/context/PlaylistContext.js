import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const PlaylistContext = createContext();

export function usePlaylist() {
  return useContext(PlaylistContext);
}

export function PlaylistProvider({ children }) {
  const [playlists, setPlaylists] = useState(() => {
    const saved = localStorage.getItem('playfool_playlists');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('playfool_playlists', JSON.stringify(playlists));
  }, [playlists]);

  const createPlaylist = useCallback((name) => {
    const newPlaylist = { id: Date.now(), name, songs: [] };
    setPlaylists(prev => [...prev, newPlaylist]);
    return newPlaylist;
  }, []);

  const addToPlaylist = useCallback((playlistId, song) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        if (p.songs.find(s => s.url === song.url)) return p;
        return { ...p, songs: [...p.songs, song] };
      }
      return p;
    }));
  }, []);

  const removeFromPlaylist = useCallback((playlistId, songUrl) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, songs: p.songs.filter(s => s.url !== songUrl) };
      }
      return p;
    }));
  }, []);

  const deletePlaylist = useCallback((playlistId) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
  }, []);

  const value = {
    playlists, createPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist,
  };

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}
