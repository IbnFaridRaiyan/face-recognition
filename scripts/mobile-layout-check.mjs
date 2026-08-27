import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profilePath = mkdtempSync(join(tmpdir(), 'sentinel-mobile-check-'));
const port = 9237;
const chrome = spawn(chromePath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`,
  `--user-data-dir=${profilePath}`, 'about:blank',
], { stdio: 'ignore' });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function connect() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const page = pages.find((item) => item.type === 'page' && !item.url.startsWith('chrome-extension://'));
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* Chrome is still starting. */ }
    await delay(150);
  }
  throw new Error('Chrome DevTools did not become ready.');
}

let socket;
let nextId = 0;
const pending = new Map();

function send(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

try {
  const websocketUrl = await connect();
  socket = new WebSocket(websocketUrl);
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 900, deviceScaleFactor: 1, mobile: true,
    screenWidth: 390, screenHeight: 900,
  });
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/#demo' });
  await delay(1000);
  await send('Runtime.evaluate', { expression: "document.documentElement.style.scrollBehavior='auto'; document.querySelector('#demo')?.scrollIntoView()" });
  await delay(250);
  const evaluation = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const stepList = document.querySelector('.step-list');
      return ({
      url: location.href,
      title: document.title,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      steps: [...document.querySelectorAll('[data-step]')].map((step) => ({
        width: Math.round(step.getBoundingClientRect().width),
        height: Math.round(step.getBoundingClientRect().height),
        flexDirection: getComputedStyle(step).flexDirection,
      })),
      stepColumns: stepList ? getComputedStyle(stepList).gridTemplateColumns : 'missing',
      footer: document.querySelector('.footer-bottom')?.innerText || 'missing',
      authenticatorVisible: Boolean(document.querySelector('#authenticator')),
    }); })()`,
  });
  console.log(JSON.stringify(evaluation.result?.value ?? evaluation, null, 2));
  const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync('mobile-cdp.png', Buffer.from(screenshot.data, 'base64'));
} finally {
  socket?.close();
  chrome.kill();
  await delay(250);
  rmSync(profilePath, { recursive: true, force: true });
}
