import type { RuleV2 } from '../../types/RuleV2';

export type RulePreset = 'tag' | 'property' | 'date' | 'blank';

/** A new rule the editor opens prefilled. Values stay empty where the user must choose. */
export function presetRule(preset: RulePreset, name: string): RuleV2 {
  const base: RuleV2 = {
    name,
    destination: '',
    aggregation: 'all',
    triggers: [{ criteriaType: 'tag', operator: 'includes item', value: '' }],
    active: true,
  };
  if (preset === 'property') {
    base.triggers = [
      {
        criteriaType: 'properties',
        operator: 'is',
        value: '',
        propertyName: '',
        propertyType: 'text',
      },
    ];
  } else if (preset === 'date') {
    base.destination = '{{file.created.year}}/{{file.created.month}}';
  }
  return base;
}

/** A new rule that matches the given note: one condition per tag and simple property. */
export function ruleFromNote(note: {
  tags: readonly string[];
  properties: Record<string, unknown>;
}): RuleV2 {
  const rule = presetRule('tag', '');
  const triggers: RuleV2['triggers'] = [];
  for (const tag of note.tags) {
    triggers.push({
      criteriaType: 'tag',
      operator: 'includes item',
      value: tag,
    });
  }
  for (const [name, value] of Object.entries(note.properties)) {
    if (name === 'tags' || name === 'position') continue;
    if (typeof value === 'string' && value.trim() !== '') {
      triggers.push({
        criteriaType: 'properties',
        operator: 'is',
        value,
        propertyName: name,
        propertyType: 'text',
      });
    }
  }
  if (triggers.length > 0) rule.triggers = triggers;
  return rule;
}
