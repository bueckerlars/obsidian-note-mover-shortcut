import { describe, expect, it } from 'vitest';
import { isNewerVersion, shouldOfferReleaseNotes } from './version-compare';

describe('version-compare', () => {
  describe('isNewerVersion', () => {
    it('returns true when current is newer', () => {
      expect(isNewerVersion('1.0.4', '1.0.3')).toBe(true);
      expect(isNewerVersion('1.1.0', '1.0.9')).toBe(true);
    });

    it('returns false when versions are equal', () => {
      expect(isNewerVersion('1.0.4', '1.0.4')).toBe(false);
    });

    it('returns false when current is older', () => {
      expect(isNewerVersion('1.0.3', '1.0.4')).toBe(false);
    });
  });

  describe('shouldOfferReleaseNotes', () => {
    it('returns false without a stored last seen version', () => {
      expect(shouldOfferReleaseNotes(undefined, '1.0.4')).toBe(false);
      expect(shouldOfferReleaseNotes('', '1.0.4')).toBe(false);
      expect(shouldOfferReleaseNotes('  ', '1.0.4')).toBe(false);
    });

    it('returns true only after a version bump', () => {
      expect(shouldOfferReleaseNotes('1.0.3', '1.0.4')).toBe(true);
      expect(shouldOfferReleaseNotes('1.0.4', '1.0.4')).toBe(false);
    });
  });
});
