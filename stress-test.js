/**
 * PlayFool Stress Test
 *
 * Tests the app under heavy load: concurrent searches, library reads,
 * rapid stream requests, and download queue flooding.
 *
 * Usage: node stress-test.js [port]
 *   port defaults to 3001
 */

const http = require('http');

const PORT = parseInt(process.argv[2], 10) || 3001;
const BASE = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;
const results = [];

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const opts = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000,
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });

    if (options.body) req.write(options.body);
    req.end();
  });
}

function log(label, pass, detail = '') {
  const icon = pass ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] ${label}${detail ? ' - ' + detail : ''}`);
  if (pass) passed++; else failed++;
  results.push({ label, pass, detail });
}

// --- Test suites ---

async function testLibraryConcurrency() {
  console.log('\n--- Library endpoint concurrency (20 parallel requests) ---');
  const promises = Array.from({ length: 20 }, () =>
    fetch(`${BASE}/api/library`).then(r => JSON.parse(r.body))
  );
  const start = Date.now();
  const responses = await Promise.allSettled(promises);
  const elapsed = Date.now() - start;

  const succeeded = responses.filter(r => r.status === 'fulfilled').length;
  const failedReqs = responses.filter(r => r.status === 'rejected').length;

  log('20 concurrent /api/library', succeeded === 20, `${succeeded}/20 ok, ${elapsed}ms`);
  if (failedReqs > 0) log('No failed requests', false, `${failedReqs} failed`);
}

async function testSearchConcurrency() {
  console.log('\n--- Search endpoint concurrency (5 parallel searches) ---');
  const queries = ['lofi beats', 'rock music', 'jazz piano', 'electronic dance', 'classical violin'];
  const promises = queries.map(q =>
    fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}`)
      .then(r => ({ query: q, ...JSON.parse(r.body) }))
      .catch(e => ({ query: q, error: e.message }))
  );
  const start = Date.now();
  const responses = await Promise.all(promises);
  const elapsed = Date.now() - start;

  let okCount = 0;
  for (const r of responses) {
    if (r.results && r.results.length > 0) okCount++;
    else if (r.error) log(`Search "${r.query}"`, false, r.error);
  }
  log(`${okCount}/5 searches returned results`, okCount >= 3, `${elapsed}ms total`);
}

async function testRapidLibraryPolling() {
  console.log('\n--- Rapid library polling (50 requests in ~1s) ---');
  const start = Date.now();
  let ok = 0;
  let err = 0;

  const batch = [];
  for (let i = 0; i < 50; i++) {
    batch.push(
      fetch(`${BASE}/api/library`)
        .then(r => { if (r.status === 200) ok++; else err++; })
        .catch(() => err++)
    );
  }
  await Promise.all(batch);
  const elapsed = Date.now() - start;
  log('50 rapid library polls', ok >= 45, `${ok}/50 ok, ${err} errors, ${elapsed}ms`);
}

async function testVideoLibrary() {
  console.log('\n--- Video library endpoint ---');
  try {
    const r = await fetch(`${BASE}/api/videos`);
    const data = JSON.parse(r.body);
    log('/api/videos responds', r.status === 200, `${(data.videos || []).length} videos`);
  } catch (e) {
    log('/api/videos responds', false, e.message);
  }
}

async function testStreamEndpointValidation() {
  console.log('\n--- Stream endpoint input validation ---');

  // Invalid ID
  try {
    const r = await fetch(`${BASE}/api/stream?id=INVALID&type=video`);
    const data = JSON.parse(r.body);
    log('Rejects invalid video ID', !!data.error, data.error || 'no error returned');
  } catch (e) {
    log('Rejects invalid video ID', false, e.message);
  }

  // Empty ID
  try {
    const r = await fetch(`${BASE}/api/stream?id=&type=video`);
    const data = JSON.parse(r.body);
    log('Rejects empty video ID', !!data.error);
  } catch (e) {
    log('Rejects empty video ID', false, e.message);
  }

  // SQL-injection-style input
  try {
    const r = await fetch(`${BASE}/api/stream?id=' OR 1=1--&type=video`);
    const data = JSON.parse(r.body);
    log('Rejects injection attempt', !!data.error);
  } catch (e) {
    log('Rejects injection attempt', false, e.message);
  }
}

async function testDownloadValidation() {
  console.log('\n--- Download endpoint validation ---');

  // No URL
  try {
    const r = await fetch(`${BASE}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = JSON.parse(r.body);
    log('Rejects missing URL', !!data.error);
  } catch (e) {
    log('Rejects missing URL', false, e.message);
  }

  // Non-YouTube URL
  try {
    const r = await fetch(`${BASE}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://evil.com/malware.exe' }),
    });
    const data = JSON.parse(r.body);
    log('Rejects non-YouTube URL', !!data.error);
  } catch (e) {
    log('Rejects non-YouTube URL', false, e.message);
  }
}

async function testStaticFileServing() {
  console.log('\n--- Static file serving ---');

  try {
    const r = await fetch(`${BASE}/`);
    log('Serves index.html', r.status === 200 && r.body.includes('html'));
  } catch (e) {
    log('Serves index.html', false, e.message);
  }

  // Path traversal attempt
  try {
    const r = await fetch(`${BASE}/downloads/../../etc/passwd`);
    log('Blocks path traversal (downloads)', r.status !== 200 || !r.body.includes('root:'));
  } catch (e) {
    log('Blocks path traversal (downloads)', true, 'request failed (expected)');
  }
}

async function testMemoryLeakIndicators() {
  console.log('\n--- Memory pressure test (100 rapid requests) ---');
  const start = Date.now();
  const batch = [];
  for (let i = 0; i < 100; i++) {
    batch.push(
      fetch(`${BASE}/api/library`).catch(() => null)
    );
  }
  await Promise.all(batch);
  const elapsed = Date.now() - start;

  // Second burst to check degradation
  const start2 = Date.now();
  const batch2 = [];
  for (let i = 0; i < 100; i++) {
    batch2.push(
      fetch(`${BASE}/api/library`).catch(() => null)
    );
  }
  await Promise.all(batch2);
  const elapsed2 = Date.now() - start2;

  const degradation = elapsed2 / elapsed;
  log('No significant degradation after 200 requests', degradation < 3,
    `Burst 1: ${elapsed}ms, Burst 2: ${elapsed2}ms, ratio: ${degradation.toFixed(2)}x`);
}

async function testPlaylistEndpoints() {
  console.log('\n--- Playlist endpoints ---');

  try {
    const r = await fetch(`${BASE}/api/playlists`);
    // Playlists are managed client-side via localStorage, so this endpoint
    // may not exist as an API route — a 200 with HTML (SPA fallback) is acceptable
    let isJson = false;
    try { JSON.parse(r.body); isJson = true; } catch(e) {}
    log('/api/playlists responds', r.status === 200, isJson ? 'JSON API' : 'SPA fallback (client-side playlists)');
  } catch (e) {
    log('/api/playlists responds', false, e.message);
  }
}

async function testConcurrentMixedEndpoints() {
  console.log('\n--- Mixed concurrent requests (library + videos + playlists) ---');
  const start = Date.now();
  const promises = [
    ...Array.from({ length: 10 }, () => fetch(`${BASE}/api/library`).catch(() => null)),
    ...Array.from({ length: 10 }, () => fetch(`${BASE}/api/videos`).catch(() => null)),
    ...Array.from({ length: 10 }, () => fetch(`${BASE}/api/playlists`).catch(() => null)),
  ];

  const responses = await Promise.allSettled(promises);
  const elapsed = Date.now() - start;
  const succeeded = responses.filter(r => r.status === 'fulfilled' && r.value !== null).length;

  log('30 mixed concurrent requests', succeeded >= 25, `${succeeded}/30 ok, ${elapsed}ms`);
}

// --- Main ---

async function main() {
  console.log(`\nPlayFool Stress Test - targeting ${BASE}`);
  console.log('='.repeat(55));

  // Check server is running
  try {
    await fetch(`${BASE}/api/library`);
  } catch (e) {
    console.error(`\nERROR: Cannot connect to ${BASE}. Is the app running?\n`);
    process.exit(1);
  }

  await testLibraryConcurrency();
  await testVideoLibrary();
  await testPlaylistEndpoints();
  await testStaticFileServing();
  await testStreamEndpointValidation();
  await testDownloadValidation();
  await testRapidLibraryPolling();
  await testSearchConcurrency();
  await testConcurrentMixedEndpoints();
  await testMemoryLeakIndicators();

  console.log('\n' + '='.repeat(55));
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('='.repeat(55) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Stress test crashed:', e);
  process.exit(1);
});
