import http from 'node:http';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { Client } from '@xhayper/discord-rpc';

const { clientId: CLIENT_ID } = JSON.parse(
  fs.readFileSync(new URL('./config.json', import.meta.url), 'utf8')
);
const ICON = fs.readFileSync(new URL('./icon.ico', import.meta.url)).toString('base64');
const PORT = 6969;
const STALE_MS = 15000;

if (!CLIENT_ID || CLIENT_ID === 'YOUR_APPLICATION_ID') {
  console.error('Set your Discord Application ID in config.json');
  process.exit(1);
}

const rpc = new Client({ clientId: CLIENT_ID });
let ready = false;
let last = null;
let lastUpdate = 0;

async function connect() {
  try {
    await rpc.login();
  } catch {
    console.log('Discord not found, retrying in 5s...');
    setTimeout(connect, 5000);
  }
}

rpc.on('ready', () => {
  ready = true;
  console.log('Connected to Discord as', rpc.user?.username);
});
rpc.on('disconnected', () => {
  ready = false;
  console.log('Discord disconnected, reconnecting...');
  setTimeout(connect, 5000);
});
connect();

const cut = (value, max = 128) => {
  let s = String(value ?? '').trim();
  if (s.length < 2) s = (s + '  ').slice(0, 2);
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
};

async function clear() {
  if (ready && last) {
    try { await rpc.user?.clearActivity(); } catch {}
  }
  last = null;
}

async function update(d) {
  if (!ready) return;

  const expectedStart = Date.now() - d.current * 1000;
  const changed =
    !last ||
    last.id !== d.id ||
    last.paused !== d.paused ||
    (!d.paused && Math.abs(last.start - expectedStart) > 3000);
  if (!changed) return;

  const activity = {
    type: 2,
    details: cut(d.title),
    details_url: d.url,
    state: cut(d.paused ? `⏸ ${d.author}` : d.author),
    assets: {
      large_image: d.thumb,
      large_text: cut(d.title),
      large_url: d.url,
    },
    buttons: [{ label: 'Open video', url: d.url }],
  };

  if (d.channelUrl) {
    activity.state_url = d.channelUrl;
    activity.buttons.push({ label: 'Open channel', url: d.channelUrl });
  }
  if (d.avatar) {
    activity.assets.small_image = d.avatar;
    activity.assets.small_text = cut(d.author);
    if (d.channelUrl) activity.assets.small_url = d.channelUrl;
  }
  if (!d.paused) {
    activity.timestamps = {
      start: Math.floor(expectedStart),
      end: Math.floor(expectedStart + d.duration * 1000),
    };
  }

  try {
    await rpc.request('SET_ACTIVITY', { pid: process.pid, activity });
    last = { id: d.id, paused: d.paused, start: expectedStart };
  } catch (e) {
    console.error('SET_ACTIVITY error:', e.message);
  }
}

setInterval(() => {
  if (last && Date.now() - lastUpdate > STALE_MS) clear();
}, 3000);

function startTray() {
  try {
    const require = createRequire(import.meta.url);
    const mod = require('systray2');
    const SysTray = mod.default ?? mod;
    const systray = new SysTray({
      menu: {
        icon: ICON,
        title: '',
        tooltip: 'YouTube → Discord RPC',
        items: [
          { title: 'YouTube → Discord RPC', tooltip: '', checked: false, enabled: false },
          { title: 'Exit', tooltip: 'Stop the bridge', checked: false, enabled: true },
        ],
      },
      debug: false,
      copyDir: true,
    });
    systray.onClick(async (action) => {
      if (action.seq_id === 1) {
        await clear();
        try { rpc.destroy(); } catch {}
        systray.kill();
      }
    });
  } catch (e) {
    console.error('Tray failed to start:', e.message);
  }
}

http
  .createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'POST') {
      res.writeHead(200).end('ok');
      return;
    }
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        if (req.url === '/clear') {
          await clear();
        } else if (req.url === '/presence') {
          lastUpdate = Date.now();
          await update(JSON.parse(body));
        }
        res.writeHead(200).end('ok');
      } catch {
        res.writeHead(400).end('bad request');
      }
    });
  })
  .on('error', (e) => {
    console.error('Failed to start server:', e.message);
    process.exit(1);
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log(`Listening on http://127.0.0.1:${PORT}`);
    startTray();
  });
