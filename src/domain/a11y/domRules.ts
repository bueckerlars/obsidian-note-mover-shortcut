const INTERACTIVE =
  'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"]';

export type DomViolation = {
  rule: 'button-name' | 'nested-interactive' | 'empty-heading';
  target: string;
};

function describe(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role');
  const label = el.getAttribute('aria-label');
  return [tag, role ? `role=${role}` : '', label ? `label=${label}` : '']
    .filter(Boolean)
    .join(' ');
}

function accessibleName(el: Element): string {
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const root = el.ownerDocument;
    const text = labelledBy
      .split(/\s+/)
      .map(id => root.getElementById(id)?.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) return text;
  }
  const label = el.getAttribute('aria-label')?.trim();
  if (label) return label;
  if (el.tagName === 'INPUT') {
    const labels = (el as HTMLInputElement).labels;
    if (labels?.length) {
      const fromLabel = Array.from(labels)
        .map(item => item.textContent ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (fromLabel) return fromLabel;
    }
  }
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function seriousDomViolations(root: ParentNode): DomViolation[] {
  const violations: DomViolation[] = [];
  const interactives = Array.from(root.querySelectorAll(INTERACTIVE));
  for (const el of interactives) {
    if (!accessibleName(el)) {
      violations.push({ rule: 'button-name', target: describe(el) });
    }
    const parent = el.parentElement?.closest(INTERACTIVE);
    if (parent && parent !== el) {
      violations.push({ rule: 'nested-interactive', target: describe(el) });
    }
  }
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    if (!accessibleName(heading)) {
      violations.push({
        rule: 'empty-heading',
        target: heading.tagName.toLowerCase(),
      });
    }
  });
  return violations;
}
