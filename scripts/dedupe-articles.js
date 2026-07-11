#!/usr/bin/env node
/** Wrapper — runs server/scripts/dedupe-articles.js */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(__dirname, '../server/scripts/dedupe-articles.js');
const child = spawn(process.execPath, [script, ...process.argv.slice(2)], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
