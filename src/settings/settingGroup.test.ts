import { describe, expect, it } from 'vitest';
import { isNativeSettingGroupAvailable } from './settingGroup';

describe('isNativeSettingGroupAvailable', () => {
  it('uses the native group when the class has the 1.11 API', () => {
    class Group {
      addSearch(): void {}
    }
    expect(isNativeSettingGroupAvailable(Group)).toBe(true);
  });

  it('falls back when the export is missing or incomplete', () => {
    expect(isNativeSettingGroupAvailable(undefined)).toBe(false);
    expect(isNativeSettingGroupAvailable(class {})).toBe(false);
  });
});
