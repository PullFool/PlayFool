import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const AudioContext = createContext();

export function useAudio() {
  return useContext(AudioContext);
}

export function AudioProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(0);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [mediaType, setMediaType] = useState('audio'); // 'audio' or 'video'
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  const audioRef = useRef(new Audio());
  const videoRef = useRef(null);
  const currentSong = currentIndex >= 0 ? songs[currentIndex] : null;

  // Get active media element (audio or video)
  const getMedia = useCallback(() => {
    if (mediaType === 'video' && videoRef.current) return videoRef.current;
    return audioRef.current;
  }, [mediaType]);

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (repeat === 2) { audio.currentTime = 0; audio.play(); }
      else skipNext();
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => console.error('Audio error:', audio.error?.message);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeat]);

  // Video element event bindings
  const bindVideoEvents = useCallback((videoEl) => {
    if (!videoEl) return;
    videoRef.current = videoEl;
    videoEl.volume = volume;

    videoEl.ontimeupdate = () => setCurrentTime(videoEl.currentTime);
    videoEl.ondurationchange = () => setDuration(videoEl.duration || 0);
    videoEl.onended = () => {
      if (repeat === 2) { videoEl.currentTime = 0; videoEl.play(); }
      else skipNext();
    };
    videoEl.onplay = () => setIsPlaying(true);
    videoEl.onpause = () => setIsPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeat, volume]);

  const playSong = useCallback((songList, index) => {
    setSongs(songList);
    setCurrentIndex(index);
    const song = songList[index];
    if (!song) return;

    const isVideo = song.type === 'video';
    setMediaType(isVideo ? 'video' : 'audio');
    setShowVideoPlayer(isVideo);

    // Always stop both audio and video before playing new content
    audioRef.current.pause();
    audioRef.current.src = '';
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }

    if (!isVideo) {
      audioRef.current.src = song.url;
      audioRef.current.load();
      audioRef.current.play().catch((err) => console.error('Play failed:', err.message));
    }
    // Video element will be rendered by VideoPanel and bound via bindVideoEvents
  }, []);

  const shufflePlay = useCallback((songList) => {
    if (songList.length === 0) return;
    const shuffled = [...songList].sort(() => Math.random() - 0.5);
    setShuffle(true);
    playSong(shuffled, 0);
  }, [playSong]);

  const togglePlayPause = useCallback(() => {
    const media = mediaType === 'video' && videoRef.current ? videoRef.current : audioRef.current;
    if (!media.src && !media.currentSrc) return;
    isPlaying ? media.pause() : media.play().catch(() => {});
  }, [isPlaying, mediaType]);

  const skipNext = useCallback(() => {
    if (songs.length === 0) return;
    let next;
    if (shuffle) {
      next = Math.floor(Math.random() * songs.length);
    } else {
      next = (currentIndex + 1) % songs.length;
      if (next === 0 && repeat === 0) {
        const media = mediaType === 'video' && videoRef.current ? videoRef.current : audioRef.current;
        media.pause();
        return;
      }
    }
    playSong(songs, next);
  }, [songs, currentIndex, shuffle, repeat, mediaType, playSong]);

  const skipPrev = useCallback(() => {
    if (songs.length === 0) return;
    const media = mediaType === 'video' && videoRef.current ? videoRef.current : audioRef.current;
    if (media.currentTime > 3) { media.currentTime = 0; return; }
    const prev = (currentIndex - 1 + songs.length) % songs.length;
    playSong(songs, prev);
  }, [songs, currentIndex, mediaType, playSong]);

  const seekTo = useCallback((time) => {
    const media = mediaType === 'video' && videoRef.current ? videoRef.current : audioRef.current;
    media.currentTime = time;
  }, [mediaType]);

  const setVolumeLevel = useCallback((v) => {
    setVolume(v);
    audioRef.current.volume = v;
    if (videoRef.current) videoRef.current.volume = v;
  }, []);

  const toggleShuffle = useCallback(() => setShuffle(s => !s), []);
  const toggleRepeat = useCallback(() => setRepeat(r => (r + 1) % 3), []);

  const value = {
    songs, currentSong, currentIndex, isPlaying, currentTime, duration,
    volume, shuffle, repeat, showNowPlaying, downloadProgress,
    mediaType, showVideoPlayer, videoRef, bindVideoEvents,
    playSong, shufflePlay, togglePlayPause, skipNext, skipPrev, seekTo,
    setVolumeLevel, toggleShuffle, toggleRepeat,
    setShowNowPlaying, setShowVideoPlayer, setDownloadProgress, setSongs,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}
