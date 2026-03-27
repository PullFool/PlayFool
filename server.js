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

// Serve built React app with no-cache headers to prevent stale versions after update
const buildDir = path.join(__dirname, 'build');
if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir, {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));
}

// Downloads directories
const downloadsDir = path.join(os.homedir(), 'Music', 'PlayFool');
const videosDir = path.join(os.homedir(), 'Videos', 'PlayFool');
const appDataDir = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'PlayFool');
const lyricsDir = path.join(appDataDir, 'lyrics');
const thumbnailsDir = path.join(appDataDir, 'thumbnails');
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
if (!fs.existsSync(lyricsDir)) fs.mkdirSync(lyricsDir, { recursive: true });
if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

// Cache files for scan results
const musicCachePath = path.join(appDataDir, 'scan_music.json');
const videoCachePath = path.join(appDataDir, 'scan_videos.json');

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
  const isWin = process.platform === 'win32';
  const ytdlpName = isWin ? 'yt-dlp.exe' : 'yt-dlp';

  // 1. Check bundled yt-dlp in app directory
  const bundledPath = path.join(__dirname, 'bin', ytdlpName);
  if (fs.existsSync(bundledPath)) {
    const { err } = await runCommand(bundledPath, ['--version']);
    if (!err) return { cmd: bundledPath, args: [] };
  }

  // 2. Check bundled in ffmpeg directory (alternative location)
  const ffmpegDirPath = path.join(__dirname, 'ffmpeg', ytdlpName);
  if (fs.existsSync(ffmpegDirPath)) {
    const { err } = await runCommand(ffmpegDirPath, ['--version']);
    if (!err) return { cmd: ffmpegDirPath, args: [] };
  }

  // 3. Try system yt-dlp
  const { err: directErr } = await runCommand(isWin ? 'yt-dlp.exe' : 'yt-dlp', ['--version']);
  if (!directErr) return { cmd: isWin ? 'yt-dlp.exe' : 'yt-dlp', args: [] };

  // 4. Try python -m yt_dlp (fallback)
  const pythonCmds = isWin
    ? ['python', 'python3', 'py', 'C:\\Python314\\python.exe', 'C:\\Python312\\python.exe', 'C:\\Python311\\python.exe']
    : ['python3', 'python'];

  for (const py of pythonCmds) {
    const { err } = await runCommand(py, ['-m', 'yt_dlp', '--version']);
    if (!err) return { cmd: py, args: ['-m', 'yt_dlp'] };
  }

  return null;
}

function findFfmpeg() {
  const isWin = process.platform === 'win32';
  const ffmpegName = isWin ? 'ffmpeg.exe' : 'ffmpeg';

  // Check bundled locations
  const locations = [
    path.join(__dirname, 'ffmpeg', ffmpegName),
    path.join(__dirname, 'bin', ffmpegName),
  ];

  // Add platform-specific system locations
  if (isWin) {
    locations.push('C:\\ffmpeg\\bin\\ffmpeg.exe', 'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe');
  } else {
    locations.push('/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg', '/usr/bin/ffmpeg');
  }

  for (const p of locations) {
    if (fs.existsSync(p)) return path.dirname(p);
  }

  return new Promise((resolve) => {
    execFile(ffmpegName, ['-version'], (err) => resolve(err ? null : ''));
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
    const quality = parseInt(req.query.quality, 10) || 720;
    const format = `best[ext=mp4][height<=${quality}]/best[ext=mp4]/best`;
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

  // Save thumbnail in background if URL provided
  const thumbnail = req.body.thumbnail;
  if (thumbnail) {
    saveThumbnail(path.basename(file, ext), thumbnail).catch(() => {});
  }

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

  const songs = files.map(f => {
    const basename = path.basename(f.name, path.extname(f.name));
    const thumbPath = path.join(thumbnailsDir, basename + '.jpg');
    const hasThumbnail = fs.existsSync(thumbPath);
    return {
      id: 'dl-' + crypto.createHash('md5').update(f.name).digest('hex'),
      title: basename.replace(/_/g, ' '),
      artist: 'PlayFool',
      file: `downloads/${f.name}`,
      fullPath: path.join(downloadsDir, f.name),
      thumbnail: hasThumbnail ? `/thumbnails/${basename}.jpg` : null,
      size: f.size,
      date: new Date(f.mtime).toISOString().replace('T', ' ').substring(0, 16),
    };
  });

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

// Generate video thumbnail using ffmpeg
async function generateVideoThumbnail(videoPath, basename) {
  const safeBasename = basename.replace(/[<>:"/\\|?*]/g, '');
  const thumbPath = path.join(thumbnailsDir, 'vid_' + safeBasename + '.jpg');
  if (fs.existsSync(thumbPath)) return thumbPath;

  // Find ffmpeg executable directly
  const isWin = process.platform === 'win32';
  const ffmpegName = isWin ? 'ffmpeg.exe' : 'ffmpeg';
  const candidates = [
    path.join(__dirname, 'ffmpeg', ffmpegName),
    path.join(__dirname, 'bin', ffmpegName),
  ];
  if (isWin) candidates.push('C:\\ffmpeg\\bin\\ffmpeg.exe');
  else candidates.push('/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg', '/usr/bin/ffmpeg');

  let ffmpegExe = 'ffmpeg';
  for (const c of candidates) {
    if (fs.existsSync(c)) { ffmpegExe = c; break; }
  }

  return new Promise((resolve) => {
    execFile(ffmpegExe, [
      '-i', videoPath,
      '-ss', '00:00:03',
      '-vframes', '1',
      '-vf', 'scale=320:-1',
      '-update', '1',
      '-y',
      thumbPath,
    ], { timeout: 15000, windowsHide: true }, (err) => {
      if (fs.existsSync(thumbPath)) {
        console.log('Thumbnail generated:', thumbPath);
        resolve(thumbPath);
      } else {
        console.error('Thumbnail failed:', videoPath, err?.message);
        resolve(null);
      }
    });
  });
}

// API: Get video library
app.get('/api/videos', async (req, res) => {
  if (!fs.existsSync(videosDir)) return res.json({ videos: [] });

  const files = fs.readdirSync(videosDir)
    .filter(f => /\.(mp4|mkv|webm)$/i.test(f))
    .map(f => {
      const fullPath = path.join(videosDir, f);
      const stat = fs.statSync(fullPath);
      return { name: f, mtime: stat.mtimeMs, size: stat.size };
    })
    .sort((a, b) => b.mtime - a.mtime);

  const videos = [];
  for (const f of files) {
    const basename = path.basename(f.name, path.extname(f.name));
    const fullPath = path.join(videosDir, f.name);
    const thumbKey = 'vid_' + basename;
    const thumbExists = fs.existsSync(path.join(thumbnailsDir, thumbKey + '.jpg'));

    // Generate thumbnail in background if not exists
    if (!thumbExists) {
      generateVideoThumbnail(fullPath, basename).catch(() => {});
    }

    videos.push({
      id: 'vid-' + crypto.createHash('md5').update(f.name).digest('hex'),
      title: basename.replace(/_/g, ' '),
      file: `videos/${f.name}`,
      fullPath: fullPath,
      thumbnail: thumbExists ? `/thumbnails/${thumbKey}.jpg` : null,
      size: f.size,
      date: new Date(f.mtime).toISOString().replace('T', ' ').substring(0, 16),
    });
  }

  res.json({ videos });
});

// --- Thumbnails ---

async function saveThumbnail(basename, url) {
  const thumbPath = path.join(thumbnailsDir, basename + '.jpg');
  if (fs.existsSync(thumbPath)) return;

  try {
    await new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, { timeout: 10000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          saveThumbnail(basename, res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) { reject(); return; }
        const file = fs.createWriteStream(thumbPath);
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', reject);
    });
  } catch (e) { /* silently fail */ }
}

// Serve thumbnails
app.use('/thumbnails', express.static(thumbnailsDir));

app.get('/api/thumbnail', (req, res) => {
  const file = (req.query.file || '').trim();
  if (!file) return res.status(400).send('No file');

  const basename = path.basename(file, path.extname(file));
  const thumbPath = path.join(thumbnailsDir, basename + '.jpg');

  if (fs.existsSync(thumbPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    fs.createReadStream(thumbPath).pipe(res);
  } else {
    res.status(404).send('No thumbnail');
  }
});

// API: Generate video thumbnails on demand
app.post('/api/videos/thumbnails', async (req, res) => {
  if (!fs.existsSync(videosDir)) return res.json({ generated: 0 });
  const videoExts = /\.(mp4|mkv|webm|avi|mov)$/i;
  const files = fs.readdirSync(videosDir).filter(f => videoExts.test(f));
  let generated = 0;
  for (const f of files) {
    const basename = path.basename(f, path.extname(f));
    const result = await generateVideoThumbnail(path.join(videosDir, f), basename);
    if (result) generated++;
  }
  res.json({ generated });
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

// API: Scan PC for music files
app.get('/api/scan', async (req, res) => {
  const homeDir = os.homedir();
  const scanDirs = [
    path.join(homeDir, 'Music'),
    path.join(homeDir, 'Downloads'),
    path.join(homeDir, 'Desktop'),
    path.join(homeDir, 'Documents'),
  ];

  const audioExts = /\.(mp3|m4a|opus|ogg|wav|flac|aac|wma)$/i;
  const allSongs = [];
  const seen = new Set();

  // Also include PlayFool downloads
  if (fs.existsSync(downloadsDir)) {
    const dlFiles = fs.readdirSync(downloadsDir).filter(f => audioExts.test(f));
    for (const f of dlFiles) {
      const fullPath = path.join(downloadsDir, f);
      seen.add(fullPath.toLowerCase());
    }
  }

  function scanDir(dir, depth = 0) {
    if (depth > 3) return; // Don't go too deep
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && depth < 3) {
          // Skip system/hidden folders
          if (entry.name.startsWith('.') || entry.name === 'node_modules' ||
              entry.name === 'AppData' || entry.name === '$Recycle.Bin') continue;
          scanDir(fullPath, depth + 1);
        } else if (entry.isFile() && audioExts.test(entry.name)) {
          const key = fullPath.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            try {
              const stat = fs.statSync(fullPath);
              allSongs.push({
                id: 'scan-' + crypto.createHash('md5').update(fullPath).digest('hex'),
                title: path.basename(entry.name, path.extname(entry.name)).replace(/_/g, ' '),
                artist: path.basename(dir),
                file: fullPath,
                fullPath: fullPath,
                size: stat.size,
                date: new Date(stat.mtimeMs).toISOString().replace('T', ' ').substring(0, 16),
                source: 'local',
              });
            } catch (e) { /* skip unreadable files */ }
          }
        }
      }
    } catch (e) { /* skip inaccessible dirs */ }
  }

  for (const dir of scanDirs) {
    if (fs.existsSync(dir)) scanDir(dir);
  }

  // Sort by modification date, newest first
  allSongs.sort((a, b) => b.date.localeCompare(a.date));

  // Save to cache
  try { fs.writeFileSync(musicCachePath, JSON.stringify(allSongs), 'utf-8'); } catch(e) {}

  res.json({ songs: allSongs });
});

// API: Get cached scan results (no rescan)
app.get('/api/scan/cached', (req, res) => {
  if (fs.existsSync(musicCachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(musicCachePath, 'utf-8'));
      // Verify files still exist
      const valid = cached.filter(s => fs.existsSync(s.fullPath));
      return res.json({ songs: valid });
    } catch(e) {}
  }
  res.json({ songs: [] });
});

// API: Remove item from scan cache
app.post('/api/scan/remove', (req, res) => {
  const { id, type } = req.body;
  if (!id) return res.json({ error: 'No id' });

  const cachePath = type === 'video' ? videoCachePath : musicCachePath;
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      const updated = cached.filter(item => item.id !== id);
      fs.writeFileSync(cachePath, JSON.stringify(updated), 'utf-8');
      return res.json({ success: true, remaining: updated.length });
    } catch(e) {}
  }
  res.json({ success: true });
});

// Serve scanned local files
app.get('/api/localfile', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).send('No path');

  // Security: only serve audio files from user directories
  const homeDir = os.homedir();
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(homeDir)) {
    return res.status(403).send('Access denied');
  }

  if (!fs.existsSync(resolved)) return res.status(404).send('File not found');

  const ext = path.extname(resolved).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  res.setHeader('Accept-Ranges', 'bytes');
  fs.createReadStream(resolved).pipe(res);
});

// API: Scan PC for video files
app.get('/api/scan/videos', async (req, res) => {
  const homeDir = os.homedir();
  const scanDirs = [
    path.join(homeDir, 'Videos'),
    path.join(homeDir, 'Downloads'),
    path.join(homeDir, 'Desktop'),
    path.join(homeDir, 'Documents'),
  ];

  const videoExts = /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i;
  const allVideos = [];
  const seen = new Set();

  // Exclude PlayFool videos dir (already shown)
  if (fs.existsSync(videosDir)) {
    const dlFiles = fs.readdirSync(videosDir).filter(f => videoExts.test(f));
    for (const f of dlFiles) {
      seen.add(path.join(videosDir, f).toLowerCase());
    }
  }

  function scanDir(dir, depth = 0) {
    if (depth > 3) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && depth < 3) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' ||
              entry.name === 'AppData' || entry.name === '$Recycle.Bin') continue;
          scanDir(fullPath, depth + 1);
        } else if (entry.isFile() && videoExts.test(entry.name)) {
          const key = fullPath.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            try {
              const stat = fs.statSync(fullPath);
              allVideos.push({
                id: 'scan-vid-' + crypto.createHash('md5').update(fullPath).digest('hex'),
                title: path.basename(entry.name, path.extname(entry.name)).replace(/_/g, ' '),
                file: fullPath,
                fullPath: fullPath,
                size: stat.size,
                date: new Date(stat.mtimeMs).toISOString().replace('T', ' ').substring(0, 16),
                source: 'scanned',
              });
            } catch (e) { /* skip */ }
          }
        }
      }
    } catch (e) { /* skip */ }
  }

  for (const dir of scanDirs) {
    if (fs.existsSync(dir)) scanDir(dir);
  }

  allVideos.sort((a, b) => b.date.localeCompare(a.date));

  // Generate thumbnails for scanned videos in background
  for (const v of allVideos) {
    const basename = v.title.replace(/[<>:"/\\|?*]/g, '');
    const thumbKey = 'vid_' + basename;
    if (!fs.existsSync(path.join(thumbnailsDir, thumbKey + '.jpg'))) {
      generateVideoThumbnail(v.fullPath, basename).catch(() => {});
    }
    v.thumbnail = fs.existsSync(path.join(thumbnailsDir, thumbKey + '.jpg'))
      ? `/thumbnails/${thumbKey}.jpg` : null;
  }

  // Save to cache
  try { fs.writeFileSync(videoCachePath, JSON.stringify(allVideos), 'utf-8'); } catch(e) {}

  res.json({ videos: allVideos });
});

// API: Get cached video scan results
app.get('/api/scan/videos/cached', (req, res) => {
  if (fs.existsSync(videoCachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(videoCachePath, 'utf-8'));
      const valid = cached.filter(v => fs.existsSync(v.fullPath)).map(v => {
        // Check if thumbnail was generated since last cache
        const basename = v.title.replace(/[<>:"/\\|?*]/g, '');
        const thumbKey = 'vid_' + basename;
        const thumbPath = path.join(thumbnailsDir, thumbKey + '.jpg');
        v.thumbnail = fs.existsSync(thumbPath) ? `/thumbnails/${thumbKey}.jpg` : null;
        return v;
      });
      return res.json({ videos: valid });
    } catch(e) {}
  }
  res.json({ videos: [] });
});

// Serve scanned local video files
app.get('/api/localvideo', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).send('No path');

  const homeDir = os.homedir();
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(homeDir)) {
    return res.status(403).send('Access denied');
  }

  if (!fs.existsSync(resolved)) return res.status(404).send('File not found');

  const ext = path.extname(resolved).toLowerCase();
  const mimeMap = { '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime', '.wmv': 'video/x-ms-wmv', '.flv': 'video/x-flv', '.webm': 'video/webm' };
  const contentType = mimeMap[ext] || 'video/mp4';
  const stat = fs.statSync(resolved);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });
    fs.createReadStream(resolved, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(resolved).pipe(res);
  }
});

// API: Toggle mini player mode
let isMiniMode = false;
app.post('/api/mini-toggle', (req, res) => {
  try {
    if (typeof nw !== 'undefined') {
      const win = nw.Window.get();
      const hasVideo = req.body && req.body.hasVideo;
      // Exit fullscreen first if active
      try { win.leaveFullscreen(); } catch(e) {}
      try { win.leaveKioskMode(); } catch(e) {}

      isMiniMode = !isMiniMode;
      if (isMiniMode) {
        const height = hasVideo ? 310 : 70;
        // Restore window first, then resize after delay
        try { win.restore(); } catch(e) {}
        setTimeout(() => {
          win.setMinimumSize(380, height);
          win.resizeTo(420, height);
          win.setAlwaysOnTop(true);
        }, 200);
      } else {
        win.setMinimumSize(900, 600);
        win.resizeTo(1200, 800);
        win.setAlwaysOnTop(false);
      }
      res.json({ mini: isMiniMode });
    } else {
      res.json({ error: 'Not running in NW.js', mini: false });
    }
  } catch (e) {
    res.json({ error: e.message, mini: false });
  }
});

// --- Auto-Update ---
const updateDir = path.join(appDataDir, 'updates');
if (!fs.existsSync(updateDir)) fs.mkdirSync(updateDir, { recursive: true });

let updateProgress = { percent: 0, done: false, error: null };

app.post('/api/update/download', async (req, res) => {
  const { url, fileName } = req.body;
  if (!url || !fileName) return res.json({ error: 'Missing url or fileName' });

  updateProgress = { percent: 0, done: false, error: null };
  const filePath = path.join(updateDir, fileName);

  try {
    await new Promise((resolve, reject) => {
      const download = (downloadUrl) => {
        const client = downloadUrl.startsWith('https') ? https : http;
        client.get(downloadUrl, { headers: { 'User-Agent': 'PlayFool-Updater' } }, (response) => {
          // Handle redirects
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            download(response.headers.location);
            return;
          }
          if (response.statusCode !== 200) {
            updateProgress.error = `HTTP ${response.statusCode}`;
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }

          const totalSize = parseInt(response.headers['content-length'], 10) || 0;
          let downloaded = 0;
          const file = fs.createWriteStream(filePath);

          response.on('data', (chunk) => {
            downloaded += chunk.length;
            if (totalSize > 0) {
              updateProgress.percent = Math.round((downloaded / totalSize) * 100);
            }
          });

          response.pipe(file);
          file.on('finish', () => {
            file.close();
            updateProgress.percent = 100;
            updateProgress.done = true;
            resolve();
          });

          file.on('error', (err) => {
            fs.unlinkSync(filePath);
            updateProgress.error = err.message;
            reject(err);
          });
        }).on('error', (err) => {
          updateProgress.error = err.message;
          reject(err);
        });
      };

      download(url);
    });

    res.json({ success: true, path: filePath });
  } catch (e) {
    updateProgress.error = e.message;
    res.json({ error: e.message });
  }
});

app.get('/api/update/progress', (req, res) => {
  res.json(updateProgress);
});

app.post('/api/update/install', (req, res) => {
  // Find the downloaded installer
  const files = fs.readdirSync(updateDir).filter(f => f.endsWith('.exe'));
  if (files.length === 0) return res.json({ error: 'No installer found' });

  const installerPath = path.join(updateDir, files[files.length - 1]);
  res.json({ success: true, installing: true });

  // Run installer silently and quit app
  setTimeout(() => {
    const { spawn } = require('child_process');
    spawn(installerPath, ['/SILENT', '/SUPPRESSMSGBOXES', '/NORESTART'], {
      detached: true,
      stdio: 'ignore',
    }).unref();

    // Quit app after launching installer
    setTimeout(() => {
      if (typeof nw !== 'undefined') {
        nw.App.quit();
      }
      process.exit(0);
    }, 1000);
  }, 500);
});

// Catch-all: serve React app for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(buildDir, 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('Build not found. Run: npm run build');
});

function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`PlayFool server on port ${port}`);
      resolve(server);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} in use, trying ${port + 1}...`);
        resolve(startServer(port + 1));
      } else {
        console.error('Server error:', err);
        reject(err);
      }
    });
  });
}

let activeServer = null;

startServer(3001).then((server) => {
  activeServer = server;
  const port = server.address().port;
  console.log(`PlayFool running on port ${port}`);
  if (typeof global !== 'undefined') {
    global.PLAYFOOL_PORT = port;
  }
}).catch((err) => {
  console.error('Failed to start server:', err);
});

// Shut down server and force exit when NW.js window closes
if (typeof nw !== 'undefined') {
  nw.Window.get().on('close', function() {
    // Close the server first
    if (activeServer) {
      activeServer.close(() => {
        process.exit(0);
      });
    }
    this.close(true);
    // Force exit after 2 seconds if server doesn't close cleanly
    setTimeout(() => process.exit(0), 2000);
  });
}

// Also handle process signals
process.on('SIGINT', () => {
  if (activeServer) activeServer.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  if (activeServer) activeServer.close();
  process.exit(0);
});

module.exports = { startServer };
