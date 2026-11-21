import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {
  CdpWebSocket,
  collectFailures,
  freePort,
  resolveSmokeOutputDir,
  withTempSmokeVault,
} from './ui-smoke.mjs';

function rect(el: HTMLElement, width: number, height: number): void {
  el.getBoundingClientRect = () =>
    ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    }) as DOMRect;
}

function widths(el: Element, scrollWidth: number, clientWidth: number): void {
  Object.defineProperty(el, 'scrollWidth', {
    configurable: true,
    get: () => scrollWidth,
  });
  Object.defineProperty(el, 'clientWidth', {
    configurable: true,
    get: () => clientWidth,
  });
}

function box(
  el: HTMLElement,
  left: number,
  top: number,
  width: number,
  height: number
): void {
  el.getBoundingClientRect = () =>
    ({
      width,
      height,
      top,
      left,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON() {
        return {};
      },
    }) as DOMRect;
}

function checks(doc: Document, mobile = false, consoleErrors: string[] = []) {
  return collectFailures(doc, { mobile, consoleErrors }).map(
    (failure: { check: string }) => failure.check
  );
}

afterEach(() => {
  document.body.innerHTML = '';
  widths(document.documentElement, 0, 0);
  widths(document.body, 0, 0);
});

describe('collectFailures', () => {
  it('flags a mobile click target under 44px and accepts 44px', () => {
    const small = document.createElement('button');
    small.textContent = 'Small';
    rect(small, 40, 44);
    const ok = document.createElement('button');
    ok.textContent = 'Ok';
    rect(ok, 44, 44);
    document.body.append(small, ok);

    const failures = collectFailures(document, { mobile: true });
    expect(failures.filter(item => item.check === 'touch')).toEqual([
      expect.objectContaining({
        check: 'touch',
        target: 'button "Small"',
        detail: '40x44',
      }),
    ]);
  });

  it('ignores undersized click targets on desktop and zero-size targets', () => {
    const small = document.createElement('button');
    small.textContent = 'Small';
    rect(small, 20, 20);
    document.body.append(small);
    expect(checks(document, false)).not.toContain('touch');

    document.body.innerHTML = '';
    const hidden = document.createElement('a');
    hidden.href = '#next';
    hidden.textContent = 'Hidden';
    rect(hidden, 0, 0);
    document.body.append(hidden);
    expect(checks(document, true)).not.toContain('touch');
  });

  it('requires aria-label on icon buttons and not on text buttons', () => {
    const icon = document.createElement('div');
    icon.className = 'clickable-icon';
    const labeled = document.createElement('div');
    labeled.className = 'clickable-icon';
    labeled.setAttribute('aria-label', 'Close');
    const svgOnly = document.createElement('button');
    svgOnly.append(
      document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    );
    const text = document.createElement('button');
    text.textContent = 'Save';
    document.body.append(icon, labeled, svgOnly, text);

    const failures = collectFailures(document).filter(
      item => item.check === 'aria'
    );
    expect(failures.map(item => item.target)).toEqual([
      'div .clickable-icon',
      'button',
    ]);
  });

  it('flags inline style on plugin classes only', () => {
    const plugin = document.createElement('div');
    plugin.className = 'advancedNoteMover-modal';
    plugin.setAttribute('style', 'width: 400px');
    const prefixed = document.createElement('div');
    prefixed.className = 'anm-row';
    const plain = document.createElement('div');
    plain.className = 'modal';
    plain.setAttribute('style', 'color: red');
    document.body.append(plugin, prefixed, plain);

    const failures = collectFailures(document).filter(
      item => item.check === 'inlineStyle'
    );
    expect(failures).toEqual([
      expect.objectContaining({
        target: 'div .advancedNoteMover-modal',
        detail: 'width: 400px',
      }),
    ]);
  });

  it('reports console errors and ignores an empty list', () => {
    expect(checks(document, false, [])).not.toContain('console');
    const failures = collectFailures(document, {
      consoleErrors: ['plugin failed'],
    });
    expect(failures).toEqual([
      expect.objectContaining({
        check: 'console',
        detail: 'plugin failed',
      }),
    ]);
  });

  it('requires .modal-title only when a modal is open', () => {
    expect(checks(document)).not.toContain('modalTitle');
    const titled = document.createElement('div');
    titled.className = 'modal';
    titled.append(
      Object.assign(document.createElement('div'), { className: 'modal-title' })
    );
    document.body.append(titled);
    expect(checks(document)).not.toContain('modalTitle');

    document.body.innerHTML = '';
    const bare = document.createElement('div');
    bare.className = 'modal';
    document.body.append(bare);
    expect(checks(document)).toContain('modalTitle');
  });

  it('keeps a conflict-cache title outside the cleared content', () => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = 'Skipped move conflicts';
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.textContent = 'a.md';
    modal.append(title, content);
    document.body.append(modal);

    content.replaceChildren();

    expect(modal.querySelector('.modal-title')?.textContent).toBe(
      'Skipped move conflicts'
    );
    expect(checks(document)).not.toContain('modalTitle');
  });

  it('flags an entry with more than three full-width buttons', () => {
    function entryWithButtons(count: number, buttonWidth: number): void {
      document.body.replaceChildren();
      const entry = document.createElement('div');
      entry.className = 'advancedNoteMover-history-entry';
      box(entry, 0, 0, 320, 80);
      for (let index = 0; index < count; index += 1) {
        const button = document.createElement('button');
        button.textContent = `Action ${index}`;
        box(button, 0, index * 48, buttonWidth, 44);
        entry.append(button);
      }
      document.body.append(entry);
    }

    entryWithButtons(3, 320);
    expect(checks(document)).not.toContain('buttonStack');

    entryWithButtons(4, 320);
    expect(checks(document)).toContain('buttonStack');

    entryWithButtons(4, 44);
    expect(checks(document)).not.toContain('buttonStack');
  });

  it('flags horizontal overflow and accepts equal widths', () => {
    widths(document.documentElement, 400, 400);
    expect(checks(document)).not.toContain('overflow');
    widths(document.documentElement, 500, 400);
    const failures = collectFailures(document).filter(
      item => item.check === 'overflow'
    );
    expect(failures).toEqual([
      expect.objectContaining({
        detail: 'scrollWidth 500 > clientWidth 400',
      }),
    ]);
  });

  it('checks icon labels inside the rule editor and ignores the workspace behind it', () => {
    const workspace = document.createElement('span');
    workspace.className = 'clickable-icon';
    const modal = document.createElement('div');
    modal.className = 'modal';
    const editor = document.createElement('div');
    editor.className = 'advancedNoteMover-rule-editor-modal';
    const labeled = document.createElement('button');
    labeled.className =
      'clickable-icon advancedNoteMover-rule-trigger-delete-btn';
    labeled.setAttribute('aria-label', 'Delete condition');
    const unlabeled = document.createElement('button');
    unlabeled.className = 'clickable-icon';
    editor.append(labeled, unlabeled);
    modal.append(editor);
    document.body.append(workspace, modal);

    const failures = collectFailures(document).filter(
      item => item.check === 'aria'
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]?.target).toContain('clickable-icon');
    expect(failures[0]?.target).not.toContain('delete');
  });

  it('requires a mobile toggle to sit beside its name and stay at most 96px', () => {
    const root = document.createElement('div');
    root.className = 'advancedNoteMover-settings-root';
    const setting = document.createElement('div');
    setting.className = 'setting-item mod-toggle';
    setting.setAttribute('data-section-id', 'triggers');
    const name = document.createElement('div');
    name.className = 'setting-item-name';
    name.textContent = 'Enable on-edit trigger';
    const control = document.createElement('div');
    control.className = 'setting-item-control';
    setting.append(name, control);
    root.append(setting);
    document.body.append(root);

    box(setting, 0, 0, 320, 48);
    box(name, 0, 8, 180, 24);
    box(control, 240, 8, 40, 24);
    expect(checks(document, true)).not.toContain('togglePlace');
    expect(checks(document, true)).not.toContain('toggleHeight');

    box(setting, 0, 0, 320, 120);
    box(control, 0, 40, 40, 24);
    const failures = collectFailures(document, { mobile: true }).map(
      item => item.check
    );
    expect(failures).toContain('togglePlace');
    expect(failures).toContain('toggleHeight');
  });

  it('allows one primary button per section and warning buttons only for delete', () => {
    const root = document.createElement('div');
    root.className = 'advancedNoteMover-settings-root';
    const add = document.createElement('button');
    add.className = 'mod-cta';
    add.setAttribute('data-section-id', 'filters');
    add.textContent = 'Add filter';
    const clear = document.createElement('button');
    clear.className = 'mod-warning';
    clear.textContent = 'Clear history';
    const remove = document.createElement('button');
    remove.className = 'mod-warning';
    remove.textContent = 'Delete';
    root.append(add, clear);
    document.body.append(root, remove);
    expect(checks(document)).not.toContain('cta');
    expect(checks(document)).not.toContain('warning');

    const second = document.createElement('button');
    second.className = 'mod-cta';
    second.setAttribute('data-section-id', 'filters');
    second.textContent = 'Again';
    root.append(second);
    const importButton = document.createElement('button');
    importButton.className = 'mod-warning';
    importButton.textContent = 'Import settings';
    document.body.append(importButton);
    const failures = collectFailures(document).map(item => item.check);
    expect(failures).toContain('cta');
    expect(failures).toContain('warning');
  });
});

describe('withTempSmokeVault', () => {
  it('deletes the temp vault when port 9333 is taken', async () => {
    const held = net.createServer();
    await new Promise<void>((resolve, reject) => {
      held.once('error', reject);
      held.listen(9333, '127.0.0.1', () => resolve());
    });
    let tmp = '';
    try {
      await expect(
        withTempSmokeVault(async (run: { tmp: string }) => {
          tmp = run.tmp;
          expect(fs.existsSync(tmp)).toBe(true);
          await freePort(9333);
        })
      ).rejects.toThrow();
      expect(tmp).not.toBe('');
      expect(fs.existsSync(tmp)).toBe(false);
    } finally {
      await new Promise<void>(resolve => held.close(() => resolve()));
    }
  });
});

function serverTextFrame(text: string): Buffer {
  const payload = Buffer.from(text);
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payload.length), 2);
  return Buffer.concat([header, payload]);
}

function decodeClientTexts(buffer: Buffer): string[] {
  const texts: string[] = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const opcode = buffer[offset] & 0x0f;
    let length = buffer[offset + 1] & 0x7f;
    let header = 2;
    if (length === 126) {
      length = buffer.readUInt16BE(offset + 2);
      header = 4;
    } else if (length === 127) {
      length = Number(buffer.readBigUInt64BE(offset + 2));
      header = 10;
    }
    const masked = (buffer[offset + 1] & 0x80) !== 0;
    const maskLength = masked ? 4 : 0;
    const start = offset + header + maskLength;
    const payload = Buffer.from(buffer.subarray(start, start + length));
    if (masked) {
      const mask = buffer.subarray(offset + header, start);
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index & 3];
      }
    }
    if (opcode === 0x1) {
      texts.push(payload.toString('utf8'));
    }
    offset = start + length;
  }
  return texts;
}

describe('CdpWebSocket', () => {
  it('exchanges a large CDP text frame without a global WebSocket', async () => {
    const payload = 'x'.repeat(70000);
    const clientBytes: Buffer[] = [];
    const server = net.createServer(socket => {
      let pending = Buffer.alloc(0);
      let accepted = false;
      socket.on('data', chunk => {
        pending = Buffer.concat([pending, chunk]);
        if (!accepted) {
          const end = pending.indexOf('\r\n\r\n');
          if (end === -1) {
            return;
          }
          const head = pending.subarray(0, end).toString('latin1');
          const key = head.match(/Sec-WebSocket-Key: (\S+)/)?.[1];
          if (!key) {
            socket.destroy();
            return;
          }
          const accept = crypto
            .createHash('sha1')
            .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
            .digest('base64');
          socket.write(
            'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' +
              `${accept}\r\n\r\n`
          );
          pending = Buffer.from(pending.subarray(end + 4));
          accepted = true;
          socket.write(Buffer.from([0x89, 4]));
          socket.write(Buffer.from('ping'));
          const frame = serverTextFrame(payload);
          socket.write(frame.subarray(0, 30));
          socket.write(frame.subarray(30));
        }
        if (pending.length > 0) {
          clientBytes.push(Buffer.from(pending));
          pending = Buffer.alloc(0);
        }
      });
    });
    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('debug server has no port');
    }
    const socket = new CdpWebSocket(
      `ws://127.0.0.1:${address.port}/devtools/page/1`
    );
    try {
      const text = await new Promise<string>((resolve, reject) => {
        socket.addEventListener(
          'message',
          (event: Event & { data?: unknown }) => {
            resolve(String(event.data));
          }
        );
        socket.addEventListener(
          'error',
          () => reject(new Error('CDP socket failed')),
          { once: true }
        );
      });
      expect(text).toBe(payload);
      socket.send('{"id":1,"method":"Runtime.enable"}');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(decodeClientTexts(Buffer.concat(clientBytes))).toEqual([
        '{"id":1,"method":"Runtime.enable"}',
      ]);
    } finally {
      socket.close();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});

describe('resolveSmokeOutputDir', () => {
  it('writes a requested phase directory and leaves the baseline unselected', () => {
    const phase = resolveSmokeOutputDir(
      ['docs/analysis/screenshots/phase-3'],
      {}
    );
    const fromEnv = resolveSmokeOutputDir([], {
      SMOKE_OUT: 'docs/analysis/screenshots/phase-3',
    });
    const baseline = resolveSmokeOutputDir(['--baseline'], {
      SMOKE_OUT: 'docs/analysis/screenshots/phase-3',
    });

    expect(phase).toBe(fromEnv);
    expect(phase?.endsWith(`${path.sep}phase-3`)).toBe(true);
    expect(baseline?.endsWith(`${path.sep}phase-0`)).toBe(true);
    expect(phase).not.toBe(baseline);
    expect(resolveSmokeOutputDir([], {})).toBeNull();
    expect(resolveSmokeOutputDir([], { SMOKE_OUT: '' })).toBeNull();
  });
});
