import { describe, it, expect } from 'vitest';
import {
  validateDestinationTemplate,
  renderDestinationTemplate,
} from './DestinationTemplate';

describe('DestinationTemplate', () => {
  it('validates plain path', () => {
    expect(validateDestinationTemplate('Projects/A').isValid).toBe(true);
  });

  it('rejects unclosed placeholder', () => {
    const r = validateDestinationTemplate('a/{{tag.foo');
    expect(r.isValid).toBe(false);
  });

  it('renders tag and property placeholders', () => {
    const out = renderDestinationTemplate(
      'P/{{property.status}}/{{tag.tasks}}',
      {
        tags: ['#tasks/personal'],
        properties: { status: 'Done' },
      }
    );
    expect(out).toContain('Done');
    expect(out).toContain('tasks/personal');
  });

  it('renders date property components', () => {
    const out = renderDestinationTemplate('Archive/{{property.created.year}}', {
      tags: [],
      properties: { created: '2025-06-13' },
    });
    expect(out).toBe('Archive/2025');
  });

  it('renders monthName and day date components', () => {
    const out = renderDestinationTemplate(
      '{{property.created.monthName}}/{{property.created.day}}',
      {
        tags: [],
        properties: { created: '2025-06-13' },
      }
    );
    expect(out).toBe('June/13');
  });

  it('prefers literal property keys over date components', () => {
    const out = renderDestinationTemplate('X/{{property.created.year}}', {
      tags: [],
      properties: {
        'created.year': 'manual',
        created: '2025-06-13',
      },
    });
    expect(out).toBe('X/manual');
  });
});
