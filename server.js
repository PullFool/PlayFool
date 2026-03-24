const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const https = require('https');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

// Serve built React app
const buildDir = path.join(__dirname, 'build');
if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));
}

// Downloads directories
const downloadsDir = path.join(os.homedir(), 'Music', 'PlayFool');
const videosDir = path.join(os.homedir(), 'Videos', 'PlayFool');
const appDataDir = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'PlayFool');
const lyricsDir = path.join(appDataDir, 'lyrics');
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
if (!fs.existsSync(lyricsDir)) fs.mkdirSync(lyricsDir, { recursive: true });

// Serve downloaded files with proper MIME types
const MIME_TYPES = {
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg',
  '.opus': 'audio/opus', '.wav': 'audio/wav', '.webm': 'audio/webm',
  '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.webm': 'video/webm',
};

app.use('/videos', express.static(videosDir, {
  setHeaders: (res, filePath) => {
    const mime = MIME_TYPES[path.extname(filePath).toLowerCase()];
    if (mime) res.setHeader('Content-Type', mime);
    res.setHeader('Accept-Ranges', 'bytes');
  },
}));

app.use('/downloads', express.static(downloadsDir, {
  setHeaders: (res, filePath) => {
    const mime = MIME_TYPES[path.extname(filePath).toLowerCase()];
    if (mime) res.setHeader('Content-Type', mime);
    res.setHeader('Accept-Ranges', 'bytes');
  },
}));

// --- Helpers ---

function runCommand(cmd, args, options = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: options.timeout || 30000,
      windowsHide: true,
    }, (err, stdout, stderr) => {
      resolve({ err, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function findYtDlp() {
  // Try direct yt-dlp
  const { err: directErr } = await runCommand('yt-dlp', ['--version']);
  if (!directErr) return { cmd: 'yt-dlp', args: [] };

  // Try python -m yt_dlp
  const pythonPaths = [
    'C:\\Python314\\python.exe', 'C:\\Python312\\python.exe',
    'C:\\Python311\\python.exe', 'python', 'python3', 'py',
  ];

  for (const py of pythonPaths) {
    const { err } = await runCommand(py, ['-m', 'yt_dlp', '--version']);
    if (!err) return { cmd: py, args: ['-m', 'yt_dlp'] };
  }

  return null;
}

function findFfmpeg() {
  const locations = [
    path.join(__dirname, 'ffmpeg', 'ffmpeg.exe'),
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
  ];

  for (const p of locations) {
    if (fs.existsSync(p)) return path.dirname(p);
  }

  return new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], (err) => resolve(err ? null : ''));
  });
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '').trim();
}

// --- API Routes ---

app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ error: 'No query provided' });

  const ytdlp = await findYtDlp();
  if (!ytdlp) return res.json({ error: 'yt-dlp not found. Run: pip install yt-dlp' });

  const safeQ = q.replace(/[^a-zA-Z0-9 \-_]/g, '');
  const args = [...ytdlp.args, `ytsearch5:${safeQ}`, '--dump-json', '--flat-playlist', '--no-download'];

  const { stdout } = await runCommand(ytdlp.cmd, args);
  if (!stdout) return res.json({ results: [] });

  const results = [];
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed[0] !== '{') continue;
    try {
      const data = JSON.parse(trimmed);
      if (!data.id) continue;
      results.push({
        id: data.id,
        title: data.title || 'Unknown',
        channel: data.channel || data.uploader || 'Unknown',
        duration: data.duration ? formatDuration(data.duration) : '',
        thumbnail: data.thumbnail || (data.thumbnails?.[0]?.url ?? ''),
        url: `https://www.youtube.com/watch?v=${data.id}`,
      });
    } catch (e) { /* skip invalid JSON */ }
  }

  res.json({ results });
});

app.get('/api/stream', async (req, res) => {
  const videoId = (req.query.id || '').trim();
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.json({ error: 'Invalid video ID' });
  }

  const ytdlp = await findYtDlp();
  if (!ytdlp) return res.json({ error: 'yt-dlp not found' });

  const streamType = req.query.type === 'video' ? 'video' : 'audio';
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  if (streamType === 'video') {
    // Get video+audio combined stream (includes sound)
    const format = 'best[ext=mp4][height<=720]/best[ext=mp4]/best';
    const args = [...ytdlp.args, '-f', format, '--get-url', '--no-playlist', url];
    const { stdout } = await runCommand(ytdlp.cmd, args, { timeout: 15000 });
    const videoUrl = stdout.trim();

    if (!videoUrl || !videoUrl.startsWith('http')) {
      return res.json({ error: 'Could not get stream URL' });
    }

    // Also get audio stream as fallback
    const audioArgs = [...ytdlp.args, '-f', 'bestaudio', '--get-url', '--no-playlist', url];
    const { stdout: audioOut } = await runCommand(ytdlp.cmd, audioArgs, { timeout: 15000 });
    const audioUrl = (audioOut || '').trim();

    res.json({ url: videoUrl, audioUrl: audioUrl || null });
  } else {
    const args = [...ytdlp.args, '-f', 'bestaudio', '--get-url', '--no-playlist', url];
    const { stdout } = await runCommand(ytdlp.cmd, args, { timeout: 15000 });
    const streamUrl = stdout.trim();

    if (!streamUrl || !streamUrl.startsWith('http')) {
      return res.json({ error: 'Could not get stream URL' });
    }
    res.json({ url: streamUrl });
  }
});

app.post('/api/download', async (req, res) => {
  const { url, title } = req.body;
  if (!url) return res.json({ error: 'No URL provided' });
  if (!/youtube\.com|youtu\.be/.test(url)) return res.json({ error: 'Invalid YouTube URL' });

  const ytdlp = await findYtDlp();
  if (!ytdlp) return res.json({ error: 'yt-dlp not found. Run: pip install yt-dlp' });

  const ffmpegLocation = await findFfmpeg();

  let videoId = 'audio_' + Date.now();
  const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) videoId = match[1];

  const tempFile = path.join(downloadsDir, videoId);
  let args;

  if (ffmpegLocation !== null) {
    args = [...ytdlp.args, '-x', '--audio-format', 'mp3', '--audio-quality', '0',
      '-o', `${tempFile}.%(ext)s`, '--no-playlist', '--no-mtime'];
    if (ffmpegLocation) args.push('--ffmpeg-location', ffmpegLocation);
    args.push(url);
  } else {
    args = [...ytdlp.args, '-f', 'bestaudio[ext=m4a]/bestaudio',
      '-o', `${tempFile}.%(ext)s`, '--no-playlist', '--no-mtime', url];
  }

  const { stderr } = await runCommand(ytdlp.cmd, args, { timeout: 120000 });

  // Find downloaded file
  let files = fs.readdirSync(downloadsDir)
    .filter(f => f.startsWith(videoId) && /\.(mp3|m4a|opus|webm|ogg|wav)$/i.test(f))
    .map(f => path.join(downloadsDir, f));

  if (files.length === 0) {
    const allFiles = fs.readdirSync(downloadsDir)
      .filter(f => /\.(mp3|m4a|opus|webm|ogg|wav)$/i.test(f))
      .map(f => ({ path: path.join(downloadsDir, f), mtime: fs.statSync(path.join(downloadsDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (allFiles.length > 0) files = [allFiles[0].path];
  }

  if (files.length === 0) {
    return res.json({ error: 'No audio file created', details: stderr.split('\n').slice(-5).join('\n') });
  }

  let file = files[0];
  const ext = path.extname(file);

  if (title) {
    const safeTitle = sanitizeFilename(title);
    if (safeTitle) {
      let newPath = path.join(downloadsDir, safeTitle + ext);
      if (fs.existsSync(newPath)) newPath = path.join(downloadsDir, `${safeTitle}_${videoId}${ext}`);
      try { fs.renameSync(file, newPath); file = newPath; } catch (e) { /* keep original */ }
    }
  }

  const finalTitle = title || path.basename(file, ext).replace(/_/g, ' ');

  // Fetch and save lyrics in background (don't block the response)
  fetchAndSaveLyrics(finalTitle, file).catch(() => {});

  res.json({
    success: true,
    title: finalTitle,
    file: `downloads/${path.basename(file)}`,
    size: fs.statSync(file).size,
  });
});

app.get('/api/library', (req, res) => {
  if (!fs.existsSync(downloadsDir)) return res.json({ songs: [] });

  const files = fs.readdirSync(downloadsDir)
    .filter(f => /\.(mp3|m4a|opus|webm|ogg|wav)$/i.test(f))
    .map(f => {
      const fullPath = path.join(downloadsDir, f);
      const stat = fs.statSync(fullPath);
      return { name: f, mtime: stat.mtimeMs, size: stat.size };
    })
    .sort((a, b) => b.mtime - a.mtime);

  const songs = files.map(f => ({
    id: 'dl-' + crypto.createHash('md5').update(f.name).digest('hex'),
    title: path.basename(f.name, path.extname(f.name)).replace(/_/g, ' '),
    artist: 'YouTube',
    file: `downloads/${f.name}`,
    size: f.size,
    date: new Date(f.mtime).toISOString().replace('T', ' ').substring(0, 16),
  }));

  res.json({ songs });
});

// API: Get available video qualities
app.get('/api/video/formats', async (req, res) => {
  const videoId = (req.query.id || '').trim();
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.json({ error: 'Invalid video ID' });
  }

  const ytdlp = await findYtDlp();
  if (!ytdlp) return res.json({ error: 'yt-dlp not found' });

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const args = [...ytdlp.args, '-F', '--no-playlist', url];

  const { stdout } = await runCommand(ytdlp.cmd, args);
  if (!stdout) return res.json({ formats: [] });

  const formats = [];
  const seen = new Set();
  for (const line of stdout.split('\n')) {
    // Match lines like: 137 mp4  1920x1080  30fps
    const match = line.match(/^(\d+)\s+(\w+)\s+(\d+x\d+)/);
    if (match && match[2] === 'mp4') {
      const resolution = match[3];
      if (!seen.has(resolution)) {
        seen.add(resolution);
        const height = resolution.split('x')[1];
        formats.push({
          id: match[1],
          resolution,
          label: `${height}p`,
        });
      }
    }
  }

  // Sort by resolution (highest first)
  formats.sort((a, b) => {
    const hA = parseInt(a.resolution.split('x')[1]);
    const hB = parseInt(b.resolution.split('x')[1]);
    return hB - hA;
  });

  // Add common presets if not found
  if (formats.length === 0) {
    formats.push(
      { id: 'bestvideo', resolution: 'best', label: 'Best' },
      { id: '137', resolution: '1920x1080', label: '1080p' },
      { id: '136', resolution: '1280x720', label: '720p' },
      { id: '135', resolution: '854x480', label: '480p' },
    );
  }

  res.json({ formats });
});

// API: Download video as MP4
app.post('/api/video/download', async (req, res) => {
  const { url, title, quality } = req.body;
  if (!url) return res.json({ error: 'No URL provided' });
  if (!/youtube\.com|youtu\.be/.test(url)) return res.json({ error: 'Invalid YouTube URL' });

  const ytdlp = await findYtDlp();
  if (!ytdlp) return res.json({ error: 'yt-dlp not found' });

  const ffmpegLocation = await findFfmpeg();

  let videoId = 'video_' + Date.now();
  const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) videoId = match[1];

  const tempFile = path.join(videosDir, videoId);

  // Build format string based on quality
  let formatStr;
  if (quality === 'best' || !quality) {
    formatStr = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
  } else {
    formatStr = `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]/best`;
  }

  const args = [...ytdlp.args,
    '-f', formatStr,
    '--merge-output-format', 'mp4',
    '-o', `${tempFile}.%(ext)s`,
    '--no-playlist', '--no-mtime',
  ];
  if (ffmpegLocation) args.push('--ffmpeg-location', ffmpegLocation);
  args.push(url);

  const { stderr } = await runCommand(ytdlp.cmd, args, { timeout: 300000 });

  // Find downloaded file
  let files = fs.readdirSync(videosDir)
    .filter(f => f.startsWith(videoId) && /\.(mp4|mkv|webm)$/i.test(f))
    .map(f => path.join(videosDir, f));

  if (files.length === 0) {
    const allFiles = fs.readdirSync(videosDir)
      .filter(f => /\.(mp4|mkv|webm)$/i.test(f))
      .map(f => ({ path: path.join(videosDir, f), mtime: fs.statSync(path.join(videosDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (allFiles.length > 0) files = [allFiles[0].path];
  }

  if (files.length === 0) {
    return res.json({ error: 'No video file created', details: stderr.split('\n').slice(-5).join('\n') });
  }

  let file = files[0];
  const ext = path.extname(file);

  if (title) {
    const safeTitle = sanitizeFilename(title);
    if (safeTitle) {
      let newPath = path.join(videosDir, safeTitle + ext);
      if (fs.existsSync(newPath)) newPath = path.join(videosDir, `${safeTitle}_${videoId}${ext}`);
      try { fs.renameSync(file, newPath); file = newPath; } catch (e) { /* keep original */ }
    }
  }

  res.json({
    success: true,
    title: title || path.basename(file, ext).replace(/_/g, ' '),
    file: `videos/${path.basename(file)}`,
    size: fs.statSync(file).size,
  });
});

// API: Get video library
app.get('/api/videos', (req, res) => {
  if (!fs.existsSync(videosDir)) return res.json({ videos: [] });

  const files = fs.readdirSync(videosDir)
    .filter(f => /\.(mp4|mkv|webm)$/i.test(f))
    .map(f => {
      const fullPath = path.join(videosDir, f);
      const stat = fs.statSync(fullPath);
      return { name: f, mtime: stat.mtimeMs, size: stat.size };
    })
    .sort((a, b) => b.mtime - a.mtime);

  const videos = files.map(f => ({
    id: 'vid-' + crypto.createHash('md5').update(f.name).digest('hex'),
    title: path.basename(f.name, path.extname(f.name)).replace(/_/g, ' '),
    file: `videos/${f.name}`,
    size: f.size,
    date: new Date(f.mtime).toISOString().replace('T', ' ').substring(0, 16),
  }));

  res.json({ videos });
});

// --- Lyrics ---

function httpGet(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'PlayFool/1.0' }, timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location, timeout).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function cleanTitle(title) {
  return title
    .replace(/\(official\s*(music\s*)?video\)/gi, '')
    .replace(/\(official\s*lyric\s*video\)/gi, '')
    .replace(/\(live\s*(performance|at|session).*?\)/gi, '')
    .replace(/\(lyrics?\)/gi, '')
    .replace(/\(audio\)/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\|.*$/, '')
    .replace(/ft\.?|feat\.?/gi, '')
    .replace(/MV|M\/V|Music Video/gi, '')
    .replace(/Tower Sessions?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getSearchVariants(title) {
  const cleaned = cleanTitle(title);
  const variants = [cleaned];

  // Try splitting by common delimiters: "Artist - Song" or "Artist Song"
  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ');
    variants.push(parts.join(' ')); // without dash
    if (parts.length >= 2) {
      variants.push(parts[1].trim()); // just song name
      variants.push(`${parts[0].trim()} ${parts[1].trim()}`); // artist + song
    }
  }

  return [...new Set(variants)]; // deduplicate
}

async function searchLrclib(query) {
  try {
    const { status, data } = await httpGet(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
    if (status !== 200) return null;
    const results = JSON.parse(data);
    if (!results || results.length === 0) return null;
    return results;
  } catch (e) {
    return null;
  }
}

function resultsToLrc(results, preferPlain) {
  // If preferPlain (e.g. live version), skip synced lyrics since timing won't match
  const best = preferPlain
    ? (results.find(r => r.plainLyrics) || results[0])
    : (results.find(r => r.syncedLyrics) || results[0]);

  if (!preferPlain && best.syncedLyrics) {
    return { type: 'synced', content: best.syncedLyrics };
  }
  if (best.plainLyrics) {
    // Plain lyrics - no timing, just text with placeholder times
    const lines = best.plainLyrics.split('\n').filter(l => l.trim());
    const lrc = lines.map((line, i) => {
      return `[00:00.00]${line}`;
    }).join('\n');
    return { type: 'plain', content: lrc };
  }
  return null;
}

async function fetchLyricsFromLrclib(title) {
  const variants = getSearchVariants(title);
  const isLiveOrCover = /live|session|cover|acoustic|remix|performance/i.test(title);

  for (const query of variants) {
    console.log(`Searching lyrics: "${query}"`);
    const results = await searchLrclib(query);
    if (results) {
      // For live/cover versions, prefer plain lyrics (synced timing won't match)
      const lrc = resultsToLrc(results, isLiveOrCover);
      if (lrc) return lrc;
    }
  }

  return null;
}

async function fetchAndSaveLyrics(title, audioFilePath) {
  const basename = path.basename(audioFilePath, path.extname(audioFilePath));
  const lrcPath = path.join(lyricsDir, basename + '.lrc');

  if (fs.existsSync(lrcPath)) return;

  const lyrics = await fetchLyricsFromLrclib(title);
  if (lyrics) {
    fs.writeFileSync(lrcPath, lyrics.content, 'utf-8');
    console.log(`Lyrics saved: ${path.basename(lrcPath)}`);
  }
}

// API: Get lyrics for a song
app.get('/api/lyrics', (req, res) => {
  const file = (req.query.file || '').trim();
  if (!file) return res.json({ error: 'No file provided' });

  const basename = path.basename(file, path.extname(file));
  const lrcPath = path.join(lyricsDir, basename + '.lrc');

  if (fs.existsSync(lrcPath)) {
    const content = fs.readFileSync(lrcPath, 'utf-8');
    return res.json({ lyrics: parseLrc(content) });
  }

  res.json({ lyrics: null });
});

// API: Fetch lyrics on demand
app.post('/api/lyrics/fetch', async (req, res) => {
  const { title, file } = req.body;
  if (!title || !file) return res.json({ error: 'Missing title or file' });

  const basename = path.basename(file, path.extname(file));
  const lrcPath = path.join(lyricsDir, basename + '.lrc');

  if (fs.existsSync(lrcPath)) {
    const content = fs.readFileSync(lrcPath, 'utf-8');
    return res.json({ lyrics: parseLrc(content) });
  }

  const lyrics = await fetchLyricsFromLrclib(title);
  if (lyrics) {
    fs.writeFileSync(lrcPath, lyrics.content, 'utf-8');
    return res.json({ lyrics: parseLrc(lyrics.content) });
  }

  res.json({ lyrics: null, error: 'Lyrics not found' });
});

function parseLrc(content) {
  const lines = content.split('\n');
  const parsed = [];
  let isSynced = false;

  for (const line of lines) {
    const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0'), 10);
      const time = minutes * 60 + seconds + ms / 1000;
      const text = match[4].trim();
      if (time > 0) isSynced = true;
      if (text) parsed.push({ time, text });
    }
  }

  return { lines: parsed, synced: isSynced };
}

// Catch-all: serve React app for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(buildDir, 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('Build not found. Run: npm run build');
});

function startServer(port) {
  const server = app.listen(port, () => console.log(`PlayFool server on port ${port}`));
  return server;
}

startServer(3001);
module.exports = { startServer };
