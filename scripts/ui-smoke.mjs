import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(ROOT, 'scripts/fixtures/vault');
const OUT_DIR = path.join(ROOT, 'docs/analysis/screenshots/phase-0');
const PLUGIN_ID = 'note-mover-shortcut';

export const VIEWPORTS = [
  { id: 'desktop', width: 1400, height: 1100, mobile: false },
  { id: 'mobile', width: 390, height: 844, mobile: true },
];

export const SCREENS = [
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

export function findObsidianBinary() {
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

function freePort(start) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(start, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : start;
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

function prepareVault() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anm-ui-smoke-'));
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

function stopObsidian(child, userData) {
  if (child && child.exitCode == null && !child.killed) {
    child.kill('SIGTERM');
  }
  if (userData) {
    spawnSync('pkill', ['-f', userData], { stdio: 'ignore' });
  }
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
    this.closed = new Promise(resolve => {
      ws.addEventListener('close', () => resolve());
    });
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data.toString());
      const done = this.pending.get(message.id);
      if (!done) {
        return;
      }
      this.pending.delete(message.id);
      done(message);
    });
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

async function connect(webSocketUrl) {
  const ws = new WebSocket(webSocketUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('CDP socket failed')), {
      once: true,
    });
  });
  const cdp = new Cdp(ws);
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
    heading.scrollIntoView({ block: 'start' });
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
      /add rule/i.test(labelOf(el))
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

function callExpression(action, arg) {
  return `(${anmSmoke.toString()})(${JSON.stringify(action)}, ${JSON.stringify(
    arg ?? null
  )})`;
}

async function evaluate(cdp, action, arg, timeoutMs = 60000) {
  const result = await cdp.send(
    'Runtime.evaluate',
    {
      expression: callExpression(action, arg),
      awaitPromise: true,
      returnByValue: true,
    },
    timeoutMs
  );
  if (result.exceptionDetails) {
    const exception = result.exceptionDetails.exception;
    throw new Error(
      exception?.description || result.exceptionDetails.text || 'Page eval failed'
    );
  }
  return result.result?.value;
}

async function setViewport(cdp, viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
}

async function saveShot(cdp, viewport, screen) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(OUT_DIR, `${viewport.id}-${screen.id}.png`);
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
  const binary = findObsidianBinary();
  if (!binary) {
    console.error(
      'Obsidian binary not found. Set OBSIDIAN_BIN or install Obsidian. UI smoke did not run.'
    );
    process.exitCode = 1;
    return;
  }
  const missingBuild = requireBuildArtifacts();
  if (missingBuild) {
    console.error(missingBuild);
    process.exitCode = 1;
    return;
  }

  const run = prepareVault();
  const port = await freePort(9333);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let child;
  let cdp;
  const failures = [];
  let saved = 0;
  try {
    child = launchObsidian(binary, run.userData, port);
    cdp = await connect(
      (await waitForPage(port, 90000)).webSocketDebuggerUrl
    );
    const version = await evaluate(cdp, 'boot', null, 120000);
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
          if (screen.kind === 'settings') {
            await evaluate(cdp, 'settings', screen.heading);
          } else {
            await evaluate(cdp, screen.id);
          }
          await sleep(400);
          await saveShot(cdp, viewport, screen);
          if (screen.kind === 'modal') {
            await evaluate(cdp, 'close');
          }
          saved += 1;
          console.log(`ok ${name}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push(`${name}: ${message.split('\n')[0]}`);
          console.error(`fail ${name}: ${message.split('\n')[0]}`);
          await evaluate(cdp, 'close').catch(() => undefined);
        }
      }
    }
  } finally {
    cdp?.ws.close();
    stopObsidian(child, run.userData);
  }

  console.log(`Saved ${saved} PNG files to docs/analysis/screenshots/phase-0/`);
  if (failures.length > 0) {
    console.error(`UI smoke failed ${failures.length} screen(s).`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
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
