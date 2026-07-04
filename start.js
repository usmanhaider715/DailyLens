/**
 * Hostinger / production entry: starts Express API then Next.js on PORT.
 * Hostinger expects the public app on process.env.PORT (default 3000).
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_PORT = Number(process.env.PORT) || 3000;
const API_PORT = Number(process.env.API_PORT) || 5001;

function spawnProc(label, cmd, args, cwd, extraEnv = {}) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, NODE_ENV: 'production', ...extraEnv },
    stdio: 'inherit',
  });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
      process.exit(code);
    }
  });
  return child;
}

function waitForApi(maxMs = 60000) {
  const url = `http://127.0.0.1:${API_PORT}/health`;
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      http
        .get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve();
          else if (Date.now() - start > maxMs) reject(new Error('API health check timeout'));
          else setTimeout(tick, 800);
        })
        .on('error', () => {
          if (Date.now() - start > maxMs) reject(new Error('API did not start in time'));
          else setTimeout(tick, 800);
        });
    };
    tick();
  });
}

console.log(`[DailyLens] Starting API on ${API_PORT}, web on ${WEB_PORT}…`);

spawnProc('api', 'node', ['server.js'], path.join(__dirname, 'server'), {
  PORT: String(API_PORT),
});

waitForApi()
  .then(() => {
    console.log('[DailyLens] API ready — starting Next.js…');
    spawnProc('web', 'node', ['node_modules/next/dist/bin/next', 'start', '-p', String(WEB_PORT)], path.join(__dirname, 'web'), {
      API_URL: `http://127.0.0.1:${API_PORT}`,
    });
  })
  .catch((err) => {
    console.error('[DailyLens]', err.message);
    process.exit(1);
  });
