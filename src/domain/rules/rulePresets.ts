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
