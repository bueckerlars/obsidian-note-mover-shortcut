import type { FileMetadata } from '../../../types/Common';
import type { RuleV2, Trigger } from '../../../types/RuleV2';
import { RuleMatcherV2Engine } from './RuleMatcherV2Engine';

export interface FailedCondition {
  criteriaType: string;
  operator: string;
  value: string;
}

export type RuleTestStatus = 'matched' | 'inactive' | 'empty' | 'failed';

export interface RuleTestResult {
  ruleName: string;
  matched: boolean;
  failedCondition: FailedCondition | null;
  status: RuleTestStatus;
}

function failedFrom(trigger: Trigger): FailedCondition {
  return {
    criteriaType: trigger.criteriaType,
    operator: String(trigger.operator),
    value: trigger.value,
  };
}

function unmatched(
  ruleName: string,
  status: 'inactive' | 'empty'
): RuleTestResult {
  return {
    ruleName,
    matched: false,
    failedCondition: null,
    status,
  };
}

/**
 * Explains each rule for one note. A match has no failed condition.
 * Otherwise the first condition that decided the miss is returned.
 */
export function testRules(
  metadata: FileMetadata,
  rules: readonly RuleV2[],
  engine = new RuleMatcherV2Engine()
): RuleTestResult[] {
  return rules.map(rule => explainRule(metadata, rule, engine));
}

function explainRule(
  metadata: FileMetadata,
  rule: RuleV2,
  engine: RuleMatcherV2Engine
): RuleTestResult {
  if (!rule.active) {
    return unmatched(rule.name, 'inactive');
  }
  if (rule.triggers.length === 0) {
    return unmatched(rule.name, 'empty');
  }

  const results = rule.triggers.map(trigger => ({
    trigger,
    passed: engine.evaluateTrigger(metadata, trigger),
  }));
  const firstFailed = results.find(item => !item.passed);
  const firstPassed = results.find(item => item.passed);

  if (rule.aggregation === 'any') {
    if (firstPassed) {
      return {
        ruleName: rule.name,
        matched: true,
        failedCondition: null,
        status: 'matched',
      };
    }
    return {
      ruleName: rule.name,
      matched: false,
      failedCondition: failedFrom(results[0].trigger),
      status: 'failed',
    };
  }

  if (rule.aggregation === 'none') {
    if (!firstPassed) {
      return {
        ruleName: rule.name,
        matched: true,
        failedCondition: null,
        status: 'matched',
      };
    }
    return {
      ruleName: rule.name,
      matched: false,
      failedCondition: failedFrom(firstPassed.trigger),
      status: 'failed',
    };
  }

  if (!firstFailed) {
    return {
      ruleName: rule.name,
      matched: true,
      failedCondition: null,
      status: 'matched',
    };
  }
  return {
    ruleName: rule.name,
    matched: false,
    failedCondition: failedFrom(firstFailed.trigger),
    status: 'failed',
  };
}
