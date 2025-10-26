import { RuleManagerV2 } from '../RuleManagerV2';
import { RuleV2 } from '../../types/RuleV2';
import { TFile } from 'obsidian';

// Mock the entire module
jest.mock('../MetadataExtractor');
jest.mock('../RuleMatcherV2');
jest.mock('../RuleMatcher');

describe('RuleManagerV2', () => {
  let ruleManager: RuleManagerV2;
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      vault: {
        getFiles: jest.fn(),
      },
    };

    ruleManager = new RuleManagerV2(mockApp, '/');
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(ruleManager).toBeInstanceOf(RuleManagerV2);
    });
  });

  describe('setRules', () => {
    it('should set rules', () => {
      const rules: RuleV2[] = [
        {
          name: 'Test Rule',
          destination: '/test',
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

      ruleManager.setRules(rules);
      expect(ruleManager.getTotalRuleCount()).toBe(1);
    });
  });

  describe('setFilter', () => {
    it('should set filter', () => {
      const filter = ['fileName: test.md', 'tag: #draft'];
      ruleManager.setFilter(filter);
      expect(ruleManager).toBeDefined();
    });
  });

  describe('getActiveRuleCount', () => {
    it('should return count of active rules', () => {
      const rules: RuleV2[] = [
        {
          name: 'Active Rule 1',
          destination: '/test1',
          aggregation: 'all',
          triggers: [],
          active: true,
        },
        {
          name: 'Inactive Rule',
          destination: '/test2',
          aggregation: 'all',
          triggers: [],
          active: false,
        },
        {
          name: 'Active Rule 2',
          destination: '/test3',
          aggregation: 'all',
          triggers: [],
          active: true,
        },
      ];

      ruleManager.setRules(rules);
      expect(ruleManager.getActiveRuleCount()).toBe(2);
    });
  });

  describe('getTotalRuleCount', () => {
    it('should return total count of rules', () => {
      const rules: RuleV2[] = [
        {
          name: 'Rule 1',
          destination: '/test1',
          aggregation: 'all',
          triggers: [],
          active: true,
        },
        {
          name: 'Rule 2',
          destination: '/test2',
          aggregation: 'all',
          triggers: [],
          active: false,
        },
      ];

      ruleManager.setRules(rules);
      expect(ruleManager.getTotalRuleCount()).toBe(2);
    });
  });

  describe('validateRules', () => {
    it('should return empty array for valid rules', () => {
      const rules: RuleV2[] = [
        {
          name: 'Valid Rule',
          destination: '/test',
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

      ruleManager.setRules(rules);
      const errors = ruleManager.validateRules();
      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid rules', () => {
      const rules: RuleV2[] = [
        {
          name: '', // Invalid: no name
          destination: '/test',
          aggregation: 'all',
          triggers: [],
          active: true,
        },
        {
          name: 'No Destination',
          destination: '', // Invalid: no destination
          aggregation: 'all',
          triggers: [],
          active: true,
        },
        {
          name: 'No Triggers',
          destination: '/test',
          aggregation: 'all',
          triggers: [], // Invalid: active rule with no triggers
          active: true,
        },
      ];

      ruleManager.setRules(rules);
      const errors = ruleManager.validateRules();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('has no name'))).toBe(true);
      expect(errors.some(error => error.includes('has no destination'))).toBe(
        true
      );
      expect(errors.some(error => error.includes('has no triggers'))).toBe(
        true
      );
    });

    it('should not validate inactive rules with no triggers', () => {
      const rules: RuleV2[] = [
        {
          name: 'Inactive Rule',
          destination: '/test',
          aggregation: 'all',
          triggers: [], // OK for inactive rules
          active: false,
        },
      ];

      ruleManager.setRules(rules);
      const errors = ruleManager.validateRules();
      expect(errors).toHaveLength(0);
    });
  });
});
