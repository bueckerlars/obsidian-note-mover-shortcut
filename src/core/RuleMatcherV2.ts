import type { FileMetadata } from '../types/Common';
import type { RuleV2, Trigger } from '../types/RuleV2';
import type { MetadataExtractor } from './MetadataExtractor';
import { RuleMatcherV2Engine } from '../domain/rules/v2/RuleMatcherV2Engine';

/**
 * Rule V2 matcher — thin adapter over {@link RuleMatcherV2Engine} (domain).
 */
export class RuleMatcherV2 {
  private readonly engine = new RuleMatcherV2Engine();

  /** @param _metadataExtractor unused; kept for call-site compatibility. */
  constructor(_metadataExtractor?: MetadataExtractor) {}

  public findMatchingRule(
    metadata: FileMetadata,
    rules: RuleV2[]
  ): RuleV2 | null {
    return this.engine.findMatchingRule(metadata, rules);
  }

  public evaluateTrigger(metadata: FileMetadata, trigger: Trigger): boolean {
    return this.engine.evaluateTrigger(metadata, trigger);
  }

  public warmRegexCacheFromRules(rules: RuleV2[]): void {
    this.engine.warmRegexCacheFromRules(rules);
  }
}
