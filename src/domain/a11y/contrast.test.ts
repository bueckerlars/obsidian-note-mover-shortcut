import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  composite,
  contrastRatio,
  cssDeclaration,
  parseHex,
  resolveColor,
} from './contrast';

// Default Obsidian theme tokens from app.css. The ratio is computed below.
const LIGHT: Record<string, string> = {
  '--color-base-00': '#ffffff',
  '--color-base-10': '#fafafa',
  '--color-base-20': '#f6f6f6',
  '--color-base-70': '#5c5c5c',
  '--background-primary': 'var(--color-base-00)',
  '--background-primary-alt': 'var(--color-base-10)',
  '--background-secondary': 'var(--color-base-20)',
  '--text-muted': 'var(--color-base-70)',
};

const DARK: Record<string, string> = {
  '--color-base-00': '#1e1e1e',
  '--color-base-10': '#242424',
  '--color-base-20': '#262626',
  '--color-base-70': '#b3b3b3',
  '--background-primary': 'var(--color-base-00)',
  '--background-primary-alt': 'var(--color-base-10)',
  '--background-secondary': 'var(--color-base-20)',
  '--text-muted': 'var(--color-base-70)',
};

const BACKGROUNDS = [
  '--background-primary',
  '--background-primary-alt',
  '--background-secondary',
] as const;

const TEXT_SELECTORS = [
  '.advancedNoteMover-drag-handle',
  '.advancedNoteMover-current-path',
  'body.is-mobile .advancedNoteMover-preview-path-mobile',
  'body.is-mobile .advancedNoteMover-preview-path-current',
];

const ICON_SELECTORS = ['.advancedNoteMover-rule-trigger-delete-btn'];

// Obsidian paints svg icons at this opacity in the default theme.
const ICON_OPACITY = 0.85;

function opacityOf(css: string, selector: string): number {
  const declared = cssDeclaration(css, selector, 'opacity');
  if (!declared) return 1;
  const value = Number(declared);
  if (!Number.isFinite(value)) {
    throw new Error(`unresolved opacity ${declared}`);
  }
  return value;
}

describe('muted text contrast', () => {
  const css = fs.readFileSync(
    path.resolve(process.cwd(), 'styles.css'),
    'utf8'
  );

  it('computes a known black on white ratio', () => {
    expect(contrastRatio(parseHex('#000000'), parseHex('#ffffff'))).toBeCloseTo(
      21,
      5
    );
  });

  it('rejects a color the theme does not define', () => {
    expect(() => resolveColor('var(--text-faint)', LIGHT)).toThrow(
      /unresolved color/
    );
  });

  it('fails closed when muted text is faded below the text threshold', () => {
    const faded = composite(
      resolveColor('var(--text-muted)', LIGHT),
      resolveColor('var(--background-primary)', LIGHT),
      0.4
    );
    expect(
      contrastRatio(faded, resolveColor('var(--background-primary)', LIGHT))
    ).toBeLessThan(4.5);
  });

  it('keeps handles and paths at muted text on light and dark backgrounds', () => {
    for (const selector of TEXT_SELECTORS) {
      expect(cssDeclaration(css, selector, 'color')).toBe('var(--text-muted)');
      const alpha = opacityOf(css, selector);
      for (const theme of [LIGHT, DARK]) {
        const background = BACKGROUNDS.map(token =>
          resolveColor(`var(${token})`, theme)
        );
        const foreground = resolveColor('var(--text-muted)', theme);
        for (const surface of background) {
          const ratio = contrastRatio(
            composite(foreground, surface, alpha),
            surface
          );
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('paints the selected match option with the normal text pair', () => {
    for (const selector of [
      '.advancedNoteMover-rule-aggregation-button.is-active',
      '.advancedNoteMover-rule-mobile .advancedNoteMover-rule-mobile-segment.is-active',
    ]) {
      expect(cssDeclaration(css, selector, 'color')).toBe('var(--text-normal)');
      expect(cssDeclaration(css, selector, 'background')).toBe(
        'var(--interactive-normal)'
      );
    }
  });

  it('keeps muted icons above the icon threshold after icon opacity', () => {
    for (const selector of ICON_SELECTORS) {
      expect(cssDeclaration(css, selector, 'color')).toBe('var(--text-muted)');
      const alpha = opacityOf(css, selector) * ICON_OPACITY;
      for (const theme of [LIGHT, DARK]) {
        const foreground = resolveColor('var(--text-muted)', theme);
        for (const token of BACKGROUNDS) {
          const surface = resolveColor(`var(${token})`, theme);
          const ratio = contrastRatio(
            composite(foreground, surface, alpha),
            surface
          );
          expect(ratio).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
});
