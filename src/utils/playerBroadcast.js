// Lightweight BroadcastChannel helper so popup NW.js windows can subscribe
// to player state from the main window and send actions back.
//
// Channel name: "playfool-player"
// Message shapes:
//   { type: 'state', payload: { currentSong, currentTime, duration, isPlaying, queue, gains } }
//   { type: 'action', name: 'seek'|'skipNext'|'skipPrev'|'togglePlayPause'|'removeFromQueue'|'playFromQueue'|'setEqGain'|'setEqGains', args: any }
//   { type: 'request-state' }  // popup asks main to push the latest state

const CHANNEL_NAME = 'playfool-player';

export function getChannel() {
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    return null;
  }
}

export function broadcastState(payload) {
  const ch = getChannel();
  if (!ch) return;
  try { ch.postMessage({ type: 'state', payload }); } catch (e) {}
  try { ch.close(); } catch (e) {}
}

export function broadcastAction(name, args) {
  const ch = getChannel();
  if (!ch) return;
  try { ch.postMessage({ type: 'action', name, args }); } catch (e) {}
  try { ch.close(); } catch (e) {}
}

export function requestState() {
  const ch = getChannel();
  if (!ch) return;
  try { ch.postMessage({ type: 'request-state' }); } catch (e) {}
  try { ch.close(); } catch (e) {}
}

// Long-lived subscription. Call cleanup() when component unmounts.
export function subscribe(handler) {
  const ch = getChannel();
  if (!ch) return () => {};
  ch.onmessage = (event) => {
    try { handler(event.data); } catch (e) {}
  };
  return () => {
    try { ch.close(); } catch (e) {}
  };
}
