import { lintCss } from './lint-css.mjs';

const messages = (css: string) => lintCss(css).map(f => f.message);

describe('lintCss', () => {
  it('accepts plain css', () => {
    expect(
      lintCss('.a { color: red; gap: 4px; }\n@media (x) { .b { top: 0; } }')
    ).toEqual([]);
  });

  it('reports :has, display: contents, clip-path and column-gap with their line', () => {
    const css =
      '.a:has(.b) {\n  display: contents;\n  clip-path: inset(50%);\n  column-gap: 4px;\n}';
    expect(lintCss(css).map(f => f.line)).toEqual([1, 2, 3, 4]);
  });

  it('reports a duplicate property in one block only', () => {
    const css = '.a {\n  height: 1px;\n  height: 2px;\n}\n.b { height: 1px; }';
    expect(messages(css)).toEqual(['Duplicate "height" in one block.']);
    expect(lintCss(css)[0].line).toBe(3);
  });

  it('ignores comments, custom properties and semicolons in urls', () => {
    const css =
      '/* :has( display: contents */\n.a { --x: 1; --x: 2; background: url("data:image/png;base64,AA"); }';
    expect(lintCss(css)).toEqual([]);
  });
});
