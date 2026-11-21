import { describe, expect, it } from 'vitest';
import { seriousDomViolations } from './domRules';

describe('serious dom rules', () => {
  it('reports a nameless control, a nested control, and an empty heading', () => {
    document.body.innerHTML = `
      <button></button>
      <div role="button"><button>Inside</button></div>
      <h2></h2>
      <button aria-label="Save">Save</button>
    `;
    expect(seriousDomViolations(document.body)).toEqual([
      { rule: 'button-name', target: 'button' },
      { rule: 'nested-interactive', target: 'button' },
      { rule: 'empty-heading', target: 'h2' },
    ]);
  });
});
