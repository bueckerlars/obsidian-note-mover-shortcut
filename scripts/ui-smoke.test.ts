import fs from 'node:fs';
import net from 'node:net';
import { collectFailures, freePort, withTempSmokeVault } from './ui-smoke.mjs';

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
