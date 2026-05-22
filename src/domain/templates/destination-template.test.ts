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
});
