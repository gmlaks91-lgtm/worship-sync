import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, extname } from 'path';
import { spawn } from 'child_process';

const BASE_URL = 'https://raw.githubusercontent.com/gmlaks91-lgtm/worship-sync/main';
const DEST_ROOT = 'C:\\Users\\USER\\Desktop\\찰리\\worship-sync';
const LIST_FILE = 'C:\\Users\\USER\\Desktop\\찰리\\worship-sync\\worship-sync-files.txt';
const BINARY_EXT = new Set(['.png', '.ico', '.jpg', '.jpeg', '.gif', '.webp', '.woff', '.woff2', '.ttf', '.eot']);

const raw = readFileSync(LIST_FILE);
const text = raw[0] === 0xff && raw[1] === 0xfe ? raw.toString('utf16le') : raw.toString('utf8');
const lines = text.split(/\r?\n/);
const paths = lines.slice(1).map((p) => p.replace(/\r$/, '').trim()).filter(Boolean);

mkdirSync(DEST_ROOT, { recursive: true });

function curlDownload(url, destPath, binary) {
  return new Promise((resolve, reject) => {
    if (!binary) {
      const proc = spawn('curl.exe', ['-sfL', url], { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => { stdout += d; });
      proc.stderr.on('data', (d) => { stderr += d; });
      proc.on('close', (code) => {
        if (code !== 0) reject(new Error(stderr || `curl exit ${code}`));
        else {
          writeFileSync(destPath, stdout, 'utf8');
          resolve();
        }
      });
      return;
    }
    const proc = spawn('curl.exe', ['-sfL', '-o', destPath, url], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr || `curl exit ${code}`));
      else resolve();
    });
  });
}

function toRawUrl(path) {
  const encoded = path.split('/').map((seg) => encodeURIComponent(seg)).join('/');
  return `${BASE_URL}/${encoded}`;
}

async function downloadPath(path) {
  const destPath = join(DEST_ROOT, path);
  mkdirSync(dirname(destPath), { recursive: true });
  const url = toRawUrl(path);
  const binary = BINARY_EXT.has(extname(path).toLowerCase());
  await curlDownload(url, destPath, binary);
}

const CONCURRENCY = 25;
const failures = [];
let success = 0;

for (let i = 0; i < paths.length; i += CONCURRENCY) {
  const batch = paths.slice(i, i + CONCURRENCY);
  const results = await Promise.allSettled(batch.map((p) => downloadPath(p)));
  results.forEach((r, idx) => {
    if (r.status === 'fulfilled') success++;
    else failures.push(`${batch[idx]}: ${r.reason?.message || r.reason}`);
  });
  process.stdout.write(`\rProgress: ${Math.min(i + CONCURRENCY, paths.length)}/${paths.length}`);
}

console.log(`\nDownloaded: ${success}/${paths.length}`);
if (failures.length) {
  console.log(`Failures (${failures.length}):`);
  failures.slice(0, 20).forEach((f) => console.log(`  ${f}`));
  process.exit(1);
}
