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

  it('accepts file placeholders as valid syntax', () => {
    expect(
      validateDestinationTemplate('Inbox/{{file.created.DD-MM-YYYY}}').isValid
    ).toBe(true);
    expect(validateDestinationTemplate('{{file.modified.year}}').isValid).toBe(
      true
    );
  });

  it('rejects unknown placeholder prefixes', () => {
    const r = validateDestinationTemplate('Clients/{{category.foo}}');
    expect(r.isValid).toBe(false);
    expect(r.errors[0]).toContain('file');
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

  it('renders moment-style date format patterns', () => {
    const context = {
      tags: [],
      properties: { created: '2025-06-13' },
    };

    expect(
      renderDestinationTemplate('Journal/{{property.created.MMM}}', context)
    ).toBe('Journal/Jun');
    expect(
      renderDestinationTemplate('Days/{{property.created.YYYY-MM-DD}}', context)
    ).toBe('Days/2025-06-13');
    expect(
      renderDestinationTemplate(
        'Inbox/{{property.created.DD-MM-YYYY}}',
        context
      )
    ).toBe('Inbox/13-06-2025');
    expect(
      renderDestinationTemplate(
        'Archive/{{property.created:YYYY.MM.DD}}',
        context
      )
    ).toBe('Archive/2025.06.13');
    expect(
      renderDestinationTemplate(
        'Inbox/{{property.created:DD-MM-YYYY}}',
        context
      )
    ).toBe('Inbox/13-06-2025');
  });

  it('prefers literal colon keys over reconstructed dot format keys', () => {
    expect(
      renderDestinationTemplate('X/{{property.created:DD-MM-YYYY}}', {
        tags: [],
        properties: {
          'created:DD-MM-YYYY': 'manual-colon',
          created: '2025-06-13',
        },
      })
    ).toBe('X/manual-colon');
  });

  describe('file placeholders', () => {
    const createdAt = new Date(2025, 5, 13, 15, 30, 0);
    const updatedAt = new Date(2024, 0, 2, 9, 0, 0);

    const fileContext = {
      tags: [],
      properties: {},
      createdAt,
      updatedAt,
    };

    it('renders bare created/modified as ISO local dates', () => {
      expect(
        renderDestinationTemplate('Inbox/{{file.created}}', fileContext)
      ).toBe('Inbox/2025-06-13');
      expect(
        renderDestinationTemplate('Inbox/{{file.modified}}', fileContext)
      ).toBe('Inbox/2024-01-02');
    });

    it('renders date components from filesystem times', () => {
      expect(
        renderDestinationTemplate(
          'Archive/{{file.created.year}}/{{file.created.month}}',
          fileContext
        )
      ).toBe('Archive/2025/06');
      expect(
        renderDestinationTemplate(
          'Days/{{file.modified.dayOfWeek}}',
          fileContext
        )
      ).toBe('Days/tuesday');
      expect(
        renderDestinationTemplate(
          '{{file.created.monthName}}/{{file.created.day}}',
          fileContext
        )
      ).toBe('June/13');
    });

    it('renders moment-style formats for file timestamps', () => {
      expect(
        renderDestinationTemplate(
          'Inbox/{{file.created.DD-MM-YYYY}}',
          fileContext
        )
      ).toBe('Inbox/13-06-2025');
      expect(
        renderDestinationTemplate('Journal/{{file.created.MMM}}', fileContext)
      ).toBe('Journal/Jun');
      expect(
        renderDestinationTemplate(
          'Archive/{{file.created:YYYY.MM.DD}}',
          fileContext
        )
      ).toBe('Archive/2025.06.13');
      expect(
        renderDestinationTemplate(
          'Days/{{file.modified.YYYY-MM-DD}}',
          fileContext
        )
      ).toBe('Days/2024-01-02');
    });

    it('accepts created/modified aliases', () => {
      expect(renderDestinationTemplate('{{file.createdAt}}', fileContext)).toBe(
        '2025-06-13'
      );
      expect(
        renderDestinationTemplate('{{file.created_at.year}}', fileContext)
      ).toBe('2025');
      expect(renderDestinationTemplate('{{file.updated}}', fileContext)).toBe(
        '2024-01-02'
      );
      expect(
        renderDestinationTemplate('{{file.updatedAt.month}}', fileContext)
      ).toBe('01');
      expect(
        renderDestinationTemplate('{{file.modified_at.day}}', fileContext)
      ).toBe('02');
    });

    it('returns empty string when timestamps are missing', () => {
      expect(
        renderDestinationTemplate('Inbox/{{file.created}}', {
          tags: [],
          properties: {},
        })
      ).toBe('Inbox/');
      expect(
        renderDestinationTemplate('Inbox/{{file.modified.year}}', {
          tags: [],
          properties: {},
          createdAt: null,
          updatedAt: null,
        })
      ).toBe('Inbox/');
    });

    it('returns empty string for unknown file keys', () => {
      expect(renderDestinationTemplate('X/{{file.unknown}}', fileContext)).toBe(
        'X/'
      );
      expect(
        renderDestinationTemplate('X/{{file.foo.year}}', fileContext)
      ).toBe('X/');
    });

    it('does not use frontmatter for file placeholders', () => {
      expect(
        renderDestinationTemplate('{{file.created}}', {
          tags: [],
          properties: { created: '1999-01-01' },
          createdAt,
        })
      ).toBe('2025-06-13');
    });

    it('can combine file placeholders with property and tag placeholders', () => {
      const out = renderDestinationTemplate(
        '{{file.created.year}}/{{property.client}}/{{tag.tasks}}',
        {
          tags: ['#tasks/personal'],
          properties: { client: 'Acme' },
          createdAt,
        }
      );
      expect(out).toBe('2025/Acme/tasks/personal');
    });
  });
});
