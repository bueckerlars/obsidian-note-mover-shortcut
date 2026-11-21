export type Rgb = { r: number; g: number; b: number };

export function parseHex(hex: string): Rgb {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) {
    throw new Error(`unresolved color ${hex}`);
  }
  const value = match[1];
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

export function resolveColor(
  value: string,
  tokens: Record<string, string>
): Rgb {
  let current = value.trim();
  const seen = new Set<string>();
  while (current.startsWith('var(') && current.endsWith(')')) {
    const name = current.slice(4, -1).split(',')[0]?.trim() ?? '';
    if (!name || seen.has(name) || !(name in tokens)) {
      throw new Error(`unresolved color ${value}`);
    }
    seen.add(name);
    current = tokens[name].trim();
  }
  return parseHex(current);
}

function channel(value: number): number {
  const unit = value / 255;
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const luminance = (color: Rgb) =>
    0.2126 * channel(color.r) +
    0.7152 * channel(color.g) +
    0.0722 * channel(color.b);
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function composite(
  foreground: Rgb,
  background: Rgb,
  alpha: number
): Rgb {
  if (alpha < 0 || alpha > 1) {
    throw new Error(`unresolved opacity ${alpha}`);
  }
  const mix = (fg: number, bg: number) => fg * alpha + bg * (1 - alpha);
  return {
    r: mix(foreground.r, background.r),
    g: mix(foreground.g, background.g),
    b: mix(foreground.b, background.b),
  };
}

export function cssDeclaration(
  css: string,
  selector: string,
  property: string
): string | null {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks: string[] = [];
  const rules = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = rules.exec(source))) {
    const selectors = match[1]
      .split(',')
      .map(part => part.trim().replace(/\s+/g, ' '));
    if (selectors.includes(selector)) {
      blocks.push(match[2]);
    }
  }
  const propertyPattern = new RegExp(
    `(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`,
    'm'
  );
  let value: string | null = null;
  for (const block of blocks) {
    const found = block.match(propertyPattern);
    if (found?.[1]) {
      value = found[1].trim();
    }
  }
  return value;
}
