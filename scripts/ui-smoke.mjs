import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(ROOT, 'scripts/fixtures/vault');
const BASELINE_DIR = path.join(ROOT, 'docs/analysis/screenshots/phase-0');
const PLUGIN_ID = 'note-mover-shortcut';

export function resolveSmokeOutputDir(args, env) {
  const token = args[0];
  if (token === '--baseline') {
    return BASELINE_DIR;
  }
  const requested = token || env.SMOKE_OUT;
  if (!requested) {
    return null;
  }
  return path.resolve(ROOT, requested);
}

const VIEWPORTS = [
  { id: 'desktop', width: 1400, height: 1100, mobile: false },
  { id: 'mobile', width: 390, height: 844, mobile: true },
];

const SCREENS = [
  { id: 'settings-triggers', kind: 'settings', heading: 'Triggers' },
  { id: 'settings-filter', kind: 'settings', heading: 'Filter' },
  { id: 'settings-rules', kind: 'settings', heading: 'Rules' },
  { id: 'settings-attachments', kind: 'settings', heading: 'Attachments' },
  {
    id: 'settings-conflict-resolution',
    kind: 'settings',
    heading: 'Conflict resolution',
  },
  { id: 'settings-history', kind: 'settings', heading: 'History' },
  { id: 'settings-import-export', kind: 'settings', heading: 'Import/export' },
  { id: 'settings-performance', kind: 'settings', heading: 'Performance' },
  { id: 'settings-updates', kind: 'settings', heading: 'Updates' },
  { id: 'rule-editor', kind: 'modal' },
  { id: 'history', kind: 'modal' },
  { id: 'preview', kind: 'modal' },
  { id: 'conflict-cache', kind: 'modal' },
  { id: 'confirm', kind: 'modal' },
  { id: 'update-changelog', kind: 'modal' },
];

function findObsidianBinary() {
  const candidates = [
    process.env.OBSIDIAN_BIN,
    '/Applications/Obsidian.app/Contents/MacOS/Obsidian',
    '/usr/bin/obsidian',
    '/usr/local/bin/obsidian',
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function freePort(start) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(start, '127.0.0.1', () => {
      const address = server.address();
      const port =
        typeof address === 'object' && address ? address.port : start;
      server.close(() => resolve(port));
    });
  });
}

function requireBuildArtifacts() {
  const missing = ['main.js', 'manifest.json', 'styles.css'].filter(
    name => !fs.existsSync(path.join(ROOT, name))
  );
  if (missing.length === 0) {
    return null;
  }
  return `Missing ${missing.join(', ')}. Run npm run build before UI smoke.`;
}

function prepareVault(tmp) {
  const vault = path.join(tmp, 'vault');
  const userData = path.join(tmp, 'user-data');
  fs.cpSync(FIXTURE, vault, { recursive: true });
  const pluginDir = path.join(vault, '.obsidian', 'plugins', PLUGIN_ID);
  fs.mkdirSync(pluginDir, { recursive: true });
  for (const name of ['main.js', 'manifest.json', 'styles.css']) {
    fs.copyFileSync(path.join(ROOT, name), path.join(pluginDir, name));
  }
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')
  );
  const data = {
    settings: {
      triggers: {
        enablePeriodicMovement: false,
        periodicMovementInterval: 5,
        enableOnEditTrigger: false,
      },
      filters: { filter: [] },
      retentionPolicy: { value: 30, unit: 'days' },
      rulesV2: [],
      enableRuleEvaluationCache: true,
      enableVaultIndexCache: true,
      enablePerformanceDebug: false,
      showReleaseNotesOnUpdate: true,
      createMissingDestinationFolders: true,
      attachments: {
        moveWithNote: false,
        skipSharedAttachments: true,
        deleteEmptyAssetFolders: false,
      },
      conflictResolution: { strategy: 'skip' },
    },
    history: { history: [], bulkOperations: [] },
    conflictSkipCache: { entries: [] },
    lastSeenVersion: manifest.version,
    schemaVersion: 1,
  };
  fs.writeFileSync(
    path.join(pluginDir, 'data.json'),
    `${JSON.stringify(data, null, 2)}\n`
  );
  fs.mkdirSync(userData, { recursive: true });
  fs.writeFileSync(
    path.join(userData, 'obsidian.json'),
    `${JSON.stringify(
      {
        vaults: {
          smoke: { path: vault, ts: Date.now(), open: true },
        },
      },
      null,
      2
    )}\n`
  );
  return { tmp, vault, userData };
}

export async function withTempSmokeVault(task) {
  let tmp;
  let userData;
  let child;
  try {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anm-ui-smoke-'));
    const prepared = prepareVault(tmp);
    userData = prepared.userData;
    return await task(prepared, nextChild => {
      child = nextChild;
    });
  } finally {
    await stopObsidian(child, userData, tmp);
  }
}

function launchObsidian(bin, userData, port) {
  if (process.platform === 'darwin') {
    const appPath = bin.includes('.app/')
      ? bin.slice(0, bin.indexOf('.app/') + 4)
      : bin;
    return spawn(
      'open',
      [
        '-n',
        '-a',
        appPath,
        '--args',
        `--user-data-dir=${userData}`,
        `--remote-debugging-port=${port}`,
      ],
      { stdio: 'ignore' }
    );
  }
  return spawn(
    bin,
    [`--user-data-dir=${userData}`, `--remote-debugging-port=${port}`],
    { stdio: 'ignore' }
  );
}

async function stopObsidian(child, userData, tmp) {
  if (child && child.exitCode == null && !child.killed) {
    child.kill('SIGTERM');
  }
  if (userData) {
    spawnSync('pkill', ['-f', userData], { stdio: 'ignore' });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const probe = spawnSync('pgrep', ['-f', userData], { stdio: 'ignore' });
      if (probe.status !== 0) {
        break;
      }
      await sleep(200);
    }
  }
  if (!tmp) {
    return;
  }
  spawnSync('rm', ['-rf', tmp], { stdio: 'ignore' });
}

async function waitForPage(port, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const pages = await response.json();
        const page = pages.find(
          entry =>
            entry.type === 'page' &&
            !String(entry.url || '').startsWith('devtools://')
        );
        if (page?.webSocketDebuggerUrl) {
          return page;
        }
      }
    } catch {
      // Obsidian is still starting.
    }
    await sleep(500);
  }
  throw new Error(
    `Obsidian did not open a debug page on port ${port} within ${timeoutMs}ms.`
  );
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.consoleErrors = [];
    this.closed = new Promise(resolve => {
      ws.addEventListener('close', () => resolve());
    });
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data.toString());
      this.recordConsole(message);
      const done = this.pending.get(message.id);
      if (!done) {
        return;
      }
      this.pending.delete(message.id);
      done(message);
    });
  }

  recordConsole(message) {
    if (
      message.method === 'Runtime.consoleAPICalled' &&
      message.params?.type === 'error'
    ) {
      const args = message.params.args || [];
      const text = args
        .map(arg => arg.value ?? arg.description ?? arg.type)
        .join(' ')
        .trim();
      this.consoleErrors.push(text || 'console error');
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params?.exceptionDetails;
      const text =
        details?.exception?.description ||
        details?.text ||
        'uncaught exception';
      this.consoleErrors.push(String(text).split('\n')[0]);
    }
  }

  takeConsoleErrors() {
    const errors = this.consoleErrors;
    this.consoleErrors = [];
    return errors;
  }

  send(method, params = {}, timeoutMs = 20000) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, message => {
        clearTimeout(timer);
        if (message.error) {
          reject(new Error(`${method}: ${message.error.message}`));
          return;
        }
        resolve(message.result);
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

function encodeClientFrame(opcode, payload) {
  const body = Buffer.from(payload);
  const mask = crypto.randomBytes(4);
  const length = body.length;
  let header;
  if (length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 0xfe;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 0xff;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  const masked = Buffer.alloc(length);
  for (let index = 0; index < length; index += 1) {
    masked[index] = body[index] ^ mask[index & 3];
  }
  return Buffer.concat([header, mask, masked]);
}

export class CdpWebSocket extends EventTarget {
  constructor(url) {
    super();
    const target = new URL(url);
    this.buffer = Buffer.alloc(0);
    this.fragments = [];
    this.opened = false;
    this.socket = net.connect(Number(target.port), target.hostname);
    const key = crypto.randomBytes(16).toString('base64');
    const requestPath = `${target.pathname}${target.search}` || '/';
    this.socket.on('connect', () => {
      this.socket.write(
        `GET ${requestPath} HTTP/1.1\r\nHost: ${target.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    this.socket.on('data', chunk => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      if (!this.opened) {
        const end = this.buffer.indexOf('\r\n\r\n');
        if (end === -1) {
          return;
        }
        const head = this.buffer.subarray(0, end).toString('latin1');
        this.buffer = Buffer.from(this.buffer.subarray(end + 4));
        if (!/^HTTP\/1\.[01] 101\b/.test(head)) {
          this.dispatchEvent(new Event('error'));
          this.socket.destroy();
          return;
        }
        this.opened = true;
        this.dispatchEvent(new Event('open'));
      }
      this.readFrames();
    });
    this.socket.on('error', () => {
      this.dispatchEvent(new Event('error'));
    });
    this.socket.on('close', () => {
      this.dispatchEvent(new Event('close'));
    });
  }

  send(data) {
    this.socket.write(encodeClientFrame(0x1, Buffer.from(String(data))));
  }

  close() {
    this.socket.end();
  }

  readFrames() {
    while (this.buffer.length >= 2) {
      const opcode = this.buffer[0] & 0x0f;
      const fin = (this.buffer[0] & 0x80) !== 0;
      let length = this.buffer[1] & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < 4) {
          return;
        }
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) {
          return;
        }
        length = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }
      const masked = (this.buffer[1] & 0x80) !== 0;
      const maskLength = masked ? 4 : 0;
      if (this.buffer.length < offset + maskLength + length) {
        return;
      }
      const payload = Buffer.from(
        this.buffer.subarray(offset + maskLength, offset + maskLength + length)
      );
      if (masked) {
        const mask = this.buffer.subarray(offset, offset + 4);
        for (let index = 0; index < payload.length; index += 1) {
          payload[index] ^= mask[index & 3];
        }
      }
      this.buffer = Buffer.from(
        this.buffer.subarray(offset + maskLength + length)
      );
      if (opcode === 0x8) {
        this.socket.end();
        continue;
      }
      if (opcode === 0x9) {
        this.socket.write(encodeClientFrame(0xa, payload));
        continue;
      }
      if (opcode !== 0x0 && opcode !== 0x1 && opcode !== 0x2) {
        continue;
      }
      if (opcode !== 0x0) {
        this.fragments = [];
      }
      this.fragments.push(payload);
      if (!fin) {
        continue;
      }
      const text = Buffer.concat(this.fragments).toString('utf8');
      this.fragments = [];
      const event = new Event('message');
      event.data = text;
      this.dispatchEvent(event);
    }
  }
}

function openCdpSocket(url) {
  if (typeof globalThis.WebSocket === 'function') {
    return new WebSocket(url);
  }
  return new CdpWebSocket(url);
}

async function connect(webSocketUrl) {
  const ws = openCdpSocket(webSocketUrl);
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('CDP socket failed')), {
      once: true,
    });
  });
  const cdp = new Cdp(ws);
  await opened;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  return cdp;
}

async function anmSmoke(action, arg) {
  const sleepMs = ms => new Promise(resolve => setTimeout(resolve, ms));
  const app = () => globalThis.app;
  const labelOf = el => (el.textContent || '').replace(/\s+/g, ' ').trim();

  function clickMatch(pattern) {
    const node = [...document.querySelectorAll('button, [role="button"]')].find(
      el => pattern.test(labelOf(el))
    );
    if (!node) {
      return false;
    }
    node.click();
    return true;
  }

  async function waitFor(read, timeoutMs, label) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const value = read();
      if (value) {
        return value;
      }
      await sleepMs(100);
    }
    throw new Error(label);
  }

  async function closeModals() {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const modal = document.querySelector('.modal');
      if (!modal) {
        return;
      }
      const closeButton = document.querySelector(
        '.modal-container .modal-close-button, .modal .modal-close-button'
      );
      if (closeButton) {
        closeButton.click();
      }
      await sleepMs(150);
    }
    if (document.querySelector('.modal')) {
      throw new Error('A modal stayed open');
    }
  }

  async function openPluginSettings() {
    app().setting.open();
    await app().setting.openTabById('note-mover-shortcut');
  }

  function findSettingName(name) {
    return [...document.querySelectorAll('.setting-item-name')].find(
      el => labelOf(el) === name
    );
  }

  function revealSetting(heading) {
    const item = heading.closest('.setting-item') || heading;
    let scroller = item.parentElement;
    while (scroller && scroller !== document.body) {
      const overflow = getComputedStyle(scroller).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') {
        break;
      }
      scroller = scroller.parentElement;
    }
    if (scroller && scroller !== document.body) {
      scroller.style.paddingBottom = `${scroller.clientHeight}px`;
    }
    item.scrollIntoView({ block: 'start' });
    if (scroller && scroller !== document.body) {
      const delta =
        item.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      if (Math.abs(delta) > 1) {
        scroller.scrollTop += delta;
      }
      const gap =
        item.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      if (gap > 24) {
        throw new Error('Settings section is not at the top of the view');
      }
    }
  }

  if (action === 'boot') {
    await waitFor(() => app()?.vault, 45000, 'Obsidian did not finish loading');
    const started = Date.now();
    while (Date.now() - started < 30000) {
      clickMatch(/trust author and enable plugins/i);
      clickMatch(/enable community plugins/i);
      clickMatch(/^trust vault$/i);
      if (typeof app().plugins?.setEnable === 'function') {
        app().plugins.setEnable(true);
      }
      if (app().plugins?.plugins?.['note-mover-shortcut']) {
        break;
      }
      try {
        const enabled = app().plugins.enabledPlugins;
        if (!enabled?.has?.('note-mover-shortcut')) {
          await app().plugins.enablePlugin('note-mover-shortcut');
        }
      } catch {
        // The trust dialog can reject enable calls until it is dismissed.
      }
      await sleepMs(300);
    }
    const plugin = app().plugins?.plugins?.['note-mover-shortcut'];
    if (!plugin) {
      throw new Error('Plugin note-mover-shortcut is not loaded');
    }
    const file = app().vault.getAbstractFileByPath('Sample.md');
    if (!file) {
      throw new Error('Sample.md is missing from the smoke vault');
    }
    await app().workspace.getLeaf(false).openFile(file);
    return plugin.manifest.version;
  }

  if (action === 'set-mobile') {
    app().emulateMobile(Boolean(arg));
    return 'requested';
  }

  if (action === 'settings') {
    await closeModals();
    await openPluginSettings();
    const heading = await waitFor(
      () => findSettingName(arg),
      8000,
      `Settings section not found: ${arg}`
    );
    revealSetting(heading);
    return arg;
  }

  if (action === 'rule-editor') {
    await closeModals();
    await openPluginSettings();
    await waitFor(
      () => findSettingName('Rules'),
      8000,
      'Rules section not found'
    );
    const button = [...document.querySelectorAll('button')].find(el =>
      /add rule/i.test(el.getAttribute('aria-label') || labelOf(el))
    );
    if (!button) {
      throw new Error('Add rule button not found');
    }
    button.click();
    await waitFor(
      () => document.querySelector('.modal'),
      8000,
      'Rule editor did not open'
    );
    return action;
  }

  if (action === 'history') {
    await closeModals();
    if (typeof app().setting?.close === 'function') {
      app().setting.close();
    }
    app().commands.executeCommandById('note-mover-shortcut:show-history');
    await waitFor(
      () => document.querySelector('.modal'),
      8000,
      'History modal did not open'
    );
    return action;
  }

  if (action === 'preview') {
    await closeModals();
    if (typeof app().setting?.close === 'function') {
      app().setting.close();
    }
    const file = app().vault.getAbstractFileByPath('Sample.md');
    await app().workspace.getLeaf(false).openFile(file);
    const command =
      app().commands.commands['note-mover-shortcut:preview-note-movement'];
    if (!command) {
      throw new Error('Preview command is missing');
    }
    if (command.checkCallback && !command.checkCallback(true)) {
      throw new Error('Preview command is unavailable');
    }
    if (command.checkCallback) {
      command.checkCallback(false);
    } else {
      app().commands.executeCommandById(
        'note-mover-shortcut:preview-note-movement'
      );
    }
    await waitFor(
      () => document.querySelector('.modal'),
      15000,
      'Preview modal did not open'
    );
    return action;
  }

  if (action === 'conflict-cache') {
    await closeModals();
    if (typeof app().setting?.close === 'function') {
      app().setting.close();
    }
    app().commands.executeCommandById(
      'note-mover-shortcut:show-conflict-skip-cache'
    );
    await waitFor(
      () => document.querySelector('.modal'),
      15000,
      'Conflict cache modal did not open'
    );
    return action;
  }

  if (action === 'confirm') {
    await closeModals();
    await openPluginSettings();
    const heading = await waitFor(
      () => findSettingName('History'),
      8000,
      'History section not found'
    );
    heading.scrollIntoView({ block: 'start' });
    const button = await waitFor(
      () =>
        [...document.querySelectorAll('button')].find(
          el => labelOf(el) === 'Clear history'
        ),
      8000,
      'Clear history button not found'
    );
    button.click();
    await waitFor(
      () => document.querySelector('.modal'),
      8000,
      'Confirm modal did not open'
    );
    return action;
  }

  if (action === 'update-changelog') {
    await closeModals();
    if (typeof app().setting?.close === 'function') {
      app().setting.close();
    }
    const plugin = app().plugins.plugins['note-mover-shortcut'];
    await plugin.updateManager.showUpdateModal(true);
    await waitFor(
      () => document.querySelector('.modal'),
      8000,
      'Update modal did not open'
    );
    return action;
  }

  if (action === 'close') {
    await closeModals();
    if (typeof app().setting?.close === 'function') {
      app().setting.close();
    }
    return 'closed';
  }

  throw new Error(`Unknown smoke action: ${action}`);
}

export function collectFailures(doc, options = {}) {
  const failures = [];
  const mobile = options.mobile === true;
  const consoleErrors = Array.isArray(options.consoleErrors)
    ? options.consoleErrors
    : [];

  function describe(el) {
    const tag = el.tagName ? el.tagName.toLowerCase() : 'node';
    const className =
      typeof el.className === 'string'
        ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.')
        : '';
    const text = (el.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
    return [tag, className && `.${className}`, text && `"${text}"`]
      .filter(Boolean)
      .join(' ');
  }

  if (mobile) {
    const targets = doc.querySelectorAll(
      'button, a[href], [role="button"], .clickable-icon, input:not([type="hidden"]), select, textarea, summary'
    );
    for (const el of targets) {
      const rect = el.getBoundingClientRect();
      const width = rect?.width ?? 0;
      const height = rect?.height ?? 0;
      if (width === 0 && height === 0) {
        continue;
      }
      if (width < 44 || height < 44) {
        failures.push({
          check: 'touch',
          target: describe(el),
          detail: `${Math.round(width)}x${Math.round(height)}`,
        });
      }
    }
  }

  const editor = doc.querySelector(
    '.advancedNoteMover-rule-editor-modal, .advancedNoteMover-rule-editor--mobile'
  );
  const ariaRoots = editor
    ? [editor.closest('.modal') || editor]
    : [doc];

  for (const root of ariaRoots) {
    for (const el of root.querySelectorAll('.clickable-icon')) {
      const label = el.getAttribute('aria-label');
      if (!label || !label.trim()) {
        failures.push({
          check: 'aria',
          target: describe(el),
          detail: 'missing aria-label',
        });
      }
    }
  }

  for (const root of ariaRoots) {
    for (const el of root.querySelectorAll('button')) {
      if (el.matches('.clickable-icon')) {
        continue;
      }
      if (!el.querySelector('svg')) {
        continue;
      }
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) {
        continue;
      }
      const label = el.getAttribute('aria-label');
      if (!label || !label.trim()) {
        failures.push({
          check: 'aria',
          target: describe(el),
          detail: 'missing aria-label',
        });
      }
    }
  }

  for (const el of doc.querySelectorAll('[class]')) {
    const classes =
      typeof el.className === 'string' ? el.className.split(/\s+/) : [];
    const pluginOwned = classes.some(
      name => name.startsWith('advancedNoteMover-') || name.startsWith('anm-')
    );
    if (!pluginOwned) {
      continue;
    }
    const style = el.getAttribute('style');
    if (!style || !style.trim()) {
      continue;
    }
    failures.push({
      check: 'inlineStyle',
      target: describe(el),
      detail: style.trim().slice(0, 120),
    });
  }

  for (const message of consoleErrors) {
    if (!message) {
      continue;
    }
    failures.push({
      check: 'console',
      target: 'console',
      detail: String(message).split('\n')[0].slice(0, 200),
    });
  }

  for (const modal of doc.querySelectorAll('.modal')) {
    if (!modal.querySelector('.modal-title')) {
      failures.push({
        check: 'modalTitle',
        target: describe(modal),
        detail: 'missing .modal-title',
      });
    }
  }

  if (mobile) {
    for (const setting of doc.querySelectorAll('.setting-item.mod-toggle')) {
      const name = setting.querySelector('.setting-item-name');
      const control = setting.querySelector('.setting-item-control');
      if (!name || !control) {
        continue;
      }
      const nameRect = name.getBoundingClientRect();
      const controlRect = control.getBoundingClientRect();
      const settingRect = setting.getBoundingClientRect();
      if (
        nameRect.width === 0 &&
        controlRect.width === 0 &&
        settingRect.height === 0
      ) {
        continue;
      }
      if (settingRect.height > 96) {
        failures.push({
          check: 'toggleHeight',
          target: describe(setting),
          detail: `${Math.round(settingRect.height)}px`,
        });
      }
      if (controlRect.left + 4 < nameRect.right) {
        failures.push({
          check: 'togglePlace',
          target: describe(setting),
          detail: `control left ${Math.round(controlRect.left)}, name right ${Math.round(nameRect.right)}`,
        });
      }
    }
  }

  const ctaCounts = new Map();
  for (const button of doc.querySelectorAll(
    '.advancedNoteMover-settings-root .mod-cta'
  )) {
    const sectionId =
      button.closest('[data-section-id]')?.getAttribute('data-section-id') ??
      'unknown';
    ctaCounts.set(sectionId, (ctaCounts.get(sectionId) ?? 0) + 1);
  }
  for (const [sectionId, count] of ctaCounts) {
    if (count > 1) {
      failures.push({
        check: 'cta',
        target: sectionId,
        detail: `${count} primary buttons`,
      });
    }
  }

  for (const button of doc.querySelectorAll('.mod-warning')) {
    const label = (button.getAttribute('aria-label') || button.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    const allowed =
      label.includes('clear history') ||
      label === 'delete' ||
      label.startsWith('delete ');
    if (!allowed) {
      failures.push({
        check: 'warning',
        target: describe(button),
        detail: label || 'unlabeled warning button',
      });
    }
  }

  const stackRoots = doc.querySelectorAll(
    '.advancedNoteMover-history-entry, .advancedNoteMover-modal-list-item, .advancedNoteMover-conflict-modal'
  );
  for (const entry of stackRoots) {
    const entryRect = entry.getBoundingClientRect();
    if (!entryRect || entryRect.width === 0) {
      continue;
    }
    let fullWidth = 0;
    for (const button of entry.querySelectorAll('button')) {
      const rect = button.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) {
        continue;
      }
      if (rect.width >= entryRect.width - 8) {
        fullWidth += 1;
      }
    }
    if (fullWidth > 3) {
      failures.push({
        check: 'buttonStack',
        target: describe(entry),
        detail: `${fullWidth} full-width buttons`,
      });
    }
  }

  const overflowRoots = [
    doc.documentElement,
    doc.body,
    ...doc.querySelectorAll(
      '.modal, .vertical-tab-content, .advancedNoteMover-settings-root'
    ),
  ].filter(Boolean);
  const seen = new Set();
  for (const el of overflowRoots) {
    if (seen.has(el)) {
      continue;
    }
    seen.add(el);
    if (el.scrollWidth > el.clientWidth) {
      failures.push({
        check: 'overflow',
        target: describe(el),
        detail: `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`,
      });
    }
  }

  return failures;
}

function callExpression(action, arg) {
  return `(${anmSmoke.toString()})(${JSON.stringify(action)}, ${JSON.stringify(
    arg ?? null
  )})`;
}

async function evaluateExpression(cdp, expression, timeoutMs = 60000) {
  const result = await cdp.send(
    'Runtime.evaluate',
    {
      expression,
      awaitPromise: true,
      returnByValue: true,
    },
    timeoutMs
  );
  if (result.exceptionDetails) {
    const exception = result.exceptionDetails.exception;
    throw new Error(
      exception?.description ||
        result.exceptionDetails.text ||
        'Page eval failed'
    );
  }
  return result.result?.value;
}

async function evaluate(cdp, action, arg, timeoutMs = 60000) {
  return evaluateExpression(cdp, callExpression(action, arg), timeoutMs);
}

const CHECKS = [
  'touch',
  'aria',
  'inlineStyle',
  'console',
  'modalTitle',
  'overflow',
  'togglePlace',
  'toggleHeight',
  'cta',
  'warning',
  'buttonStack',
];
const SMOKE_REPORT = path.join(ROOT, 'docs/analysis/baseline-smoke.json');

function smokeReportPath(outDir) {
  return outDir === BASELINE_DIR
    ? SMOKE_REPORT
    : path.join(outDir, 'smoke.json');
}

function writeSmokeReport(report, reportPath = SMOKE_REPORT) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function printAssertionTable(rows) {
  const header = ['screen', ...CHECKS].join('\t');
  console.log(header);
  for (const row of rows) {
    const cells = CHECKS.map(check => {
      const count = row.failures.filter(
        failure => failure.check === check
      ).length;
      return count === 0 ? 'pass' : `fail ${count}`;
    });
    console.log([`${row.viewport}/${row.screen}`, ...cells].join('\t'));
  }
}

async function setViewport(cdp, viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
}

async function saveShot(cdp, viewport, screen, outDir) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(outDir, `${viewport.id}-${screen.id}.png`);
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  return file;
}

async function reloadMobile(cdp, port) {
  await Promise.race([
    evaluate(cdp, 'set-mobile', true).catch(() => undefined),
    cdp.closed,
    sleep(15000),
  ]);
  const started = Date.now();
  let lastError = 'emulateMobile(true) did not mark the app as mobile';
  while (Date.now() - started < 90000) {
    try {
      const page = await waitForPage(port, 5000);
      const next = await connect(page.webSocketDebuggerUrl);
      const result = await next.send('Runtime.evaluate', {
        expression: 'document.body?.classList.contains("is-mobile") === true',
        returnByValue: true,
      });
      if (result.result?.value === true) {
        return next;
      }
      next.ws.close();
      lastError = 'Page is up but body is not .is-mobile yet';
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(500);
  }
  throw new Error(lastError);
}

async function main() {
  const outDir = resolveSmokeOutputDir(process.argv.slice(2), process.env);
  if (!outDir) {
    console.error(
      'Pass a screenshot directory or set SMOKE_OUT. Pass --baseline to write docs/analysis/screenshots/phase-0.'
    );
    process.exitCode = 1;
    return;
  }
  const binary = findObsidianBinary();
  if (!binary) {
    const reason =
      'Obsidian binary not found. Set OBSIDIAN_BIN or install Obsidian. UI smoke did not run.';
    console.error(reason);
    writeSmokeReport({ ran: false, reason }, smokeReportPath(outDir));
    process.exitCode = 1;
    return;
  }
  const missingBuild = requireBuildArtifacts();
  if (missingBuild) {
    console.error(missingBuild);
    writeSmokeReport(
      { ran: false, reason: missingBuild },
      smokeReportPath(outDir)
    );
    process.exitCode = 1;
    return;
  }

  const failures = [];
  const rows = [];
  let saved = 0;
  let booted = false;
  let crashed;
  try {
    await withTempSmokeVault(async (run, setChild) => {
      const port = await freePort(9333);
      fs.mkdirSync(outDir, { recursive: true });
      let cdp;
      try {
        const child = launchObsidian(binary, run.userData, port);
        setChild(child);
        cdp = await connect(
          (await waitForPage(port, 90000)).webSocketDebuggerUrl
        );
        const version = await evaluate(cdp, 'boot', null, 120000);
        booted = true;
        console.log(`Plugin ${version} loaded from ${run.vault}`);
        for (const viewport of VIEWPORTS) {
          if (viewport.mobile) {
            cdp = await reloadMobile(cdp, port);
            await evaluate(cdp, 'boot', null, 120000);
          }
          await setViewport(cdp, viewport);
          await sleep(500);
          for (const screen of SCREENS) {
            const name = `${viewport.id}/${screen.id}`;
            try {
              cdp.takeConsoleErrors();
              if (screen.kind === 'settings') {
                await evaluate(cdp, 'settings', screen.heading);
              } else {
                await evaluate(cdp, screen.id);
              }
              await sleep(400);
              const consoleErrors = cdp.takeConsoleErrors();
              const assertionFailures = await evaluateExpression(
                cdp,
                `(${collectFailures.toString()})(document, ${JSON.stringify({
                  mobile: viewport.mobile,
                  consoleErrors,
                })})`
              );
              await saveShot(cdp, viewport, screen, outDir);
              if (screen.kind === 'modal') {
                await evaluate(cdp, 'close');
              }
              saved += 1;
              rows.push({
                viewport: viewport.id,
                screen: screen.id,
                failures: Array.isArray(assertionFailures)
                  ? assertionFailures
                  : [],
              });
              console.log(`ok ${name}`);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              failures.push(`${name}: ${message.split('\n')[0]}`);
              console.error(`fail ${name}: ${message.split('\n')[0]}`);
              await evaluate(cdp, 'close').catch(() => undefined);
            }
          }
        }
      } catch (error) {
        crashed = error instanceof Error ? error.message : String(error);
        console.error(crashed);
      } finally {
        cdp?.ws.close();
      }
    });
  } catch (error) {
    crashed = error instanceof Error ? error.message : String(error);
    console.error(crashed);
  }

  const assertionFailureCount = rows.reduce(
    (sum, row) => sum + row.failures.length,
    0
  );
  writeSmokeReport(
    {
      ran: booted && !crashed,
      screenshots: saved,
      checks: CHECKS,
      openErrors: failures,
      assertionFailures: assertionFailureCount,
      ...(crashed ? { reason: crashed } : {}),
      results: rows,
    },
    smokeReportPath(outDir)
  );
  if (rows.length > 0) {
    printAssertionTable(rows);
  }
  console.log(`Saved ${saved} PNG files to ${outDir}/`);
  console.log(`Assertion failures: ${assertionFailureCount}`);
  if (crashed || failures.length > 0) {
    if (failures.length > 0) {
      console.error(`UI smoke failed ${failures.length} screen(s).`);
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
    }
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
