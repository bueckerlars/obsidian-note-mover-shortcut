import { RuleMatcherV2 } from '../RuleMatcherV2';
import { MetadataExtractor } from '../MetadataExtractor';
import { FileMetadata } from '../../types/Common';
import { RuleV2, Trigger, AggregationType } from '../../types/RuleV2';

// Mock MetadataExtractor
jest.mock('../MetadataExtractor');
const MockedMetadataExtractor = MetadataExtractor as jest.MockedClass<
  typeof MetadataExtractor
>;

describe('RuleMatcherV2', () => {
  let ruleMatcher: RuleMatcherV2;
  let mockMetadataExtractor: any;

  beforeEach(() => {
    mockMetadataExtractor = {
      parseListProperty: jest.fn((value: any) => {
        if (Array.isArray(value)) {
          return value
            .map(item => String(item).trim())
            .filter(item => item.length > 0);
        }
        if (typeof value === 'string') {
          return value
            .split(/[,\n]/)
            .map(item => item.trim())
            .filter(item => item.length > 0);
        }
        return [String(value).trim()].filter(item => item.length > 0);
      }),
    };

    ruleMatcher = new RuleMatcherV2(mockMetadataExtractor);
  });

  describe('findMatchingRule', () => {
    const baseMetadata: FileMetadata = {
      fileName: 'test.md',
      filePath: 'folder/test.md',
      tags: ['#project', '#work'],
      properties: { status: 'active', priority: 5 },
      fileContent: 'Test content',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
      extension: 'md',
      links: ['[[other-note]]'],
      embeds: ['![[image.png]]'],
      headings: ['# Main Title', '## Subtitle'],
    };

    it('should return null when no rules match', () => {
      const rules: RuleV2[] = [
        {
          name: 'Test Rule',
          destination: '/test',
          aggregation: 'all',
          triggers: [
            {
              criteriaType: 'fileName',
              operator: 'is',
              value: 'different.md',
            },
          ],
          active: true,
        },
      ];

      const result = ruleMatcher.findMatchingRule(baseMetadata, rules);
      expect(result).toBeNull();
    });

    it('should return first matching rule (first-match-wins)', () => {
      const rules: RuleV2[] = [
        {
          name: 'First Rule',
          destination: '/first',
          aggregation: 'all',
          triggers: [
            {
              criteriaType: 'fileName',
              operator: 'is',
              value: 'test.md',
            },
          ],
          active: true,
        },
        {
          name: 'Second Rule',
          destination: '/second',
          aggregation: 'all',
          triggers: [
            {
              criteriaType: 'fileName',
              operator: 'is',
              value: 'test.md',
            },
          ],
          active: true,
        },
      ];

      const result = ruleMatcher.findMatchingRule(baseMetadata, rules);
      expect(result).toBe(rules[0]);
    });

    it('should skip inactive rules', () => {
      const rules: RuleV2[] = [
        {
          name: 'Inactive Rule',
          destination: '/inactive',
          aggregation: 'all',
          triggers: [
            {
              criteriaType: 'fileName',
              operator: 'is',
              value: 'test.md',
            },
          ],
          active: false,
        },
      ];

      const result = ruleMatcher.findMatchingRule(baseMetadata, rules);
      expect(result).toBeNull();
    });

    it('should skip rules with no triggers', () => {
      const rules: RuleV2[] = [
        {
          name: 'No Triggers Rule',
          destination: '/no-triggers',
          aggregation: 'all',
          triggers: [],
          active: true,
        },
      ];

      const result = ruleMatcher.findMatchingRule(baseMetadata, rules);
      expect(result).toBeNull();
    });
  });

  describe('evaluateTrigger - Text Operators', () => {
    const metadata: FileMetadata = {
      fileName: 'test-file.md',
      filePath: 'folder/test-file.md',
      tags: [],
      properties: {},
      fileContent: '',
      createdAt: null,
      updatedAt: null,
      extension: 'md',
      links: [],
      embeds: [],
      headings: ['# Main Title', '## Subtitle'],
    };

    describe('fileName criteria', () => {
      it('should match "is" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'fileName',
          operator: 'is',
          value: 'test-file.md',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "contains" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'fileName',
          operator: 'contains',
          value: 'test',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "starts with" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'fileName',
          operator: 'starts with',
          value: 'test',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "ends with" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'fileName',
          operator: 'ends with',
          value: '.md',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match regex operator', () => {
        const trigger: Trigger = {
          criteriaType: 'fileName',
          operator: 'match regex',
          value: 'test.*\\.md',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should handle invalid regex gracefully', () => {
        const trigger: Trigger = {
          criteriaType: 'fileName',
          operator: 'match regex',
          value: '[invalid',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(false);
      });
    });

    describe('extension criteria', () => {
      it('should match extension "is" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'extension',
          operator: 'is',
          value: 'md',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });
    });

    describe('headings criteria', () => {
      it('should match headings "includes item" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'headings',
          operator: 'includes item',
          value: '# Main Title',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match headings "count is" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'headings',
          operator: 'count is',
          value: '2',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });
    });
  });

  describe('evaluateTrigger - List Operators', () => {
    const metadata: FileMetadata = {
      fileName: 'test.md',
      filePath: 'folder/test.md',
      tags: ['#project', '#work', '#urgent'],
      properties: {},
      fileContent: '',
      createdAt: null,
      updatedAt: null,
      extension: 'md',
      links: ['[[note1]]', '[[note2]]'],
      embeds: ['![[image1.png]]'],
      headings: [],
    };

    describe('tag criteria', () => {
      it('should match "includes item" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'tag',
          operator: 'includes item',
          value: '#project',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "all are" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'tag',
          operator: 'all are',
          value: '#project',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(false);
      });

      it('should match "count is more than" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'tag',
          operator: 'count is more than',
          value: '2',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });
    });

    describe('links criteria', () => {
      it('should match "includes item" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'links',
          operator: 'includes item',
          value: '[[note1]]',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "count is" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'links',
          operator: 'count is',
          value: '2',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });
    });

    describe('embeds criteria', () => {
      it('should match "includes item" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'embeds',
          operator: 'includes item',
          value: '![[image1.png]]',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });
    });
  });

  describe('evaluateTrigger - Date Operators', () => {
    const metadata: FileMetadata = {
      fileName: 'test.md',
      filePath: 'folder/test.md',
      tags: [],
      properties: {},
      fileContent: '',
      createdAt: new Date('2023-01-15T10:00:00Z'),
      updatedAt: new Date('2023-01-20T15:30:00Z'),
      extension: 'md',
      links: [],
      embeds: [],
      headings: [],
    };

    describe('created_at criteria', () => {
      it('should match "date is" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'created_at',
          operator: 'date is',
          value: '2023-01-15',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "is before" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'created_at',
          operator: 'is before',
          value: '2023-01-20',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "is after" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'created_at',
          operator: 'is after',
          value: '2023-01-10',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "date is today" operator', () => {
        const today = new Date();
        const metadataToday: FileMetadata = {
          ...metadata,
          createdAt: today,
        };

        const trigger: Trigger = {
          criteriaType: 'created_at',
          operator: 'date is today',
          value: '',
        };

        expect(ruleMatcher.evaluateTrigger(metadataToday, trigger)).toBe(true);
      });

      it('should match "is under X days ago" operator', () => {
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 5);
        const metadataRecent: FileMetadata = {
          ...metadata,
          createdAt: recentDate,
        };

        const trigger: Trigger = {
          criteriaType: 'created_at',
          operator: 'is under X days ago',
          value: '10',
        };

        expect(ruleMatcher.evaluateTrigger(metadataRecent, trigger)).toBe(true);
      });
    });

    describe('modified_at criteria', () => {
      it('should match "is after" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'modified_at',
          operator: 'is after',
          value: '2023-01-15',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });
    });
  });

  describe('evaluateTrigger - Property Operators', () => {
    const metadata: FileMetadata = {
      fileName: 'test.md',
      filePath: 'folder/test.md',
      tags: [],
      properties: {
        status: 'active',
        priority: 5,
        completed: true,
        tags: ['urgent', 'important'],
        created: '2023-01-15',
      },
      fileContent: '',
      createdAt: null,
      updatedAt: null,
      extension: 'md',
      links: [],
      embeds: [],
      headings: [],
    };

    describe('text property operators', () => {
      it('should match "is" operator for text property', () => {
        const trigger: Trigger = {
          criteriaType: 'properties',
          operator: 'is',
          value: 'active',
          propertyName: 'status',
          propertyType: 'text',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "contains" operator for text property', () => {
        const trigger: Trigger = {
          criteriaType: 'properties',
          operator: 'contains',
          value: 'act',
          propertyName: 'status',
          propertyType: 'text',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });
    });

    describe('number property operators', () => {
      it('should match "equals" operator for number property', () => {
        const trigger: Trigger = {
          criteriaType: 'properties',
          operator: 'equals',
          value: '5',
          propertyName: 'priority',
          propertyType: 'number',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "is more than" operator for number property', () => {
        const trigger: Trigger = {
          criteriaType: 'properties',
          operator: 'is more than',
          value: '3',
          propertyName: 'priority',
          propertyType: 'number',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "is divisible by" operator for number property', () => {
        const trigger: Trigger = {
          criteriaType: 'properties',
          operator: 'is divisible by',
          value: '5',
          propertyName: 'priority',
          propertyType: 'number',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });
    });

    describe('checkbox property operators', () => {
      it('should match "is true" operator for checkbox property', () => {
        const trigger: Trigger = {
          criteriaType: 'properties',
          operator: 'is true',
          value: '',
          propertyName: 'completed',
          propertyType: 'checkbox',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });
    });

    describe('base property operators', () => {
      it('should match "has any value" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'properties',
          operator: 'has any value',
          value: '',
          propertyName: 'status',
          propertyType: 'text',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "has no value" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'properties',
          operator: 'has no value',
          value: '',
          propertyName: 'nonexistent',
          propertyType: 'text',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "property is present" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'properties',
          operator: 'property is present',
          value: '',
          propertyName: 'status',
          propertyType: 'text',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });

      it('should match "property is missing" operator', () => {
        const trigger: Trigger = {
          criteriaType: 'properties',
          operator: 'property is missing',
          value: '',
          propertyName: 'nonexistent',
          propertyType: 'text',
        };

        expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
      });
    });
  });

  describe('evaluateAggregation', () => {
    it('should return true for "all" aggregation when all results are true', () => {
      const result = (ruleMatcher as any).evaluateAggregation(
        [true, true, true],
        'all'
      );
      expect(result).toBe(true);
    });

    it('should return false for "all" aggregation when any result is false', () => {
      const result = (ruleMatcher as any).evaluateAggregation(
        [true, false, true],
        'all'
      );
      expect(result).toBe(false);
    });

    it('should return true for "any" aggregation when any result is true', () => {
      const result = (ruleMatcher as any).evaluateAggregation(
        [false, true, false],
        'any'
      );
      expect(result).toBe(true);
    });

    it('should return false for "any" aggregation when all results are false', () => {
      const result = (ruleMatcher as any).evaluateAggregation(
        [false, false, false],
        'any'
      );
      expect(result).toBe(false);
    });

    it('should return true for "none" aggregation when all results are false', () => {
      const result = (ruleMatcher as any).evaluateAggregation(
        [false, false, false],
        'none'
      );
      expect(result).toBe(true);
    });

    it('should return false for "none" aggregation when any result is true', () => {
      const result = (ruleMatcher as any).evaluateAggregation(
        [false, true, false],
        'none'
      );
      expect(result).toBe(false);
    });

    it('should return false for empty results array', () => {
      const result = (ruleMatcher as any).evaluateAggregation([], 'all');
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle null dates gracefully', () => {
      const metadata: FileMetadata = {
        fileName: 'test.md',
        filePath: 'folder/test.md',
        tags: [],
        properties: {},
        fileContent: '',
        createdAt: null,
        updatedAt: null,
        extension: 'md',
        links: [],
        embeds: [],
        headings: [],
      };

      const trigger: Trigger = {
        criteriaType: 'created_at',
        operator: 'is',
        value: '2023-01-01',
      };

      expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(false);
    });

    it('should handle empty arrays gracefully', () => {
      const metadata: FileMetadata = {
        fileName: 'test.md',
        filePath: 'folder/test.md',
        tags: [],
        properties: {},
        fileContent: '',
        createdAt: null,
        updatedAt: null,
        extension: 'md',
        links: [],
        embeds: [],
        headings: [],
      };

      const trigger: Trigger = {
        criteriaType: 'tag',
        operator: 'count is',
        value: '0',
      };

      expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(true);
    });

    it('should handle missing V2 fields gracefully', () => {
      const metadata: FileMetadata = {
        fileName: 'test.md',
        filePath: 'folder/test.md',
        tags: [],
        properties: {},
        fileContent: '',
        createdAt: null,
        updatedAt: null,
        // V2 fields are undefined
      };

      const trigger: Trigger = {
        criteriaType: 'extension',
        operator: 'is',
        value: 'md',
      };

      expect(ruleMatcher.evaluateTrigger(metadata, trigger)).toBe(false);
    });
  });
});
