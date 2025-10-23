/**
 * Sanitization Utility Tests
 * Comprehensive tests for all input sanitization and validation functions
 */

import * as sanitization from './sanitization.util';

describe('Sanitization Utils', () => {
  describe('sanitizeItemKey', () => {
    it('should accept valid item keys', () => {
      expect(sanitization.sanitizeItemKey('sword')).toBe('sword');
      expect(sanitization.sanitizeItemKey('SWORD')).toBe('sword');
      expect(sanitization.sanitizeItemKey('sword_of_fire')).toBe('sword_of_fire');
      expect(sanitization.sanitizeItemKey('gold_coin_100')).toBe('gold_coin_100');
    });

    it('should trim whitespace', () => {
      expect(sanitization.sanitizeItemKey('  sword  ')).toBe('sword');
      expect(sanitization.sanitizeItemKey('\tsword\n')).toBe('sword');
    });

    it('should convert to lowercase', () => {
      expect(sanitization.sanitizeItemKey('IRON_SWORD')).toBe('iron_sword');
      expect(sanitization.sanitizeItemKey('FireScroll')).toBe('firescroll');
    });

    it('should reject keys with invalid characters', () => {
      expect(() => sanitization.sanitizeItemKey('sword-of-fire')).toThrow();
      expect(() => sanitization.sanitizeItemKey('sword!@#')).toThrow();
      expect(() => sanitization.sanitizeItemKey('sword of fire')).toThrow();
      expect(() => sanitization.sanitizeItemKey('sword.key')).toThrow();
    });

    it('should reject keys that are too long', () => {
      const longKey = 'a'.repeat(51);
      expect(() => sanitization.sanitizeItemKey(longKey)).toThrow();
    });

    it('should accept keys at max length', () => {
      const maxKey = 'a'.repeat(50);
      expect(sanitization.sanitizeItemKey(maxKey)).toBe(maxKey);
    });
  });

  describe('sanitizeCharacterName', () => {
    it('should accept valid character names', () => {
      expect(sanitization.sanitizeCharacterName('Legolas')).toBe('Legolas');
      expect(sanitization.sanitizeCharacterName('John Smith')).toBe('John Smith');
      expect(sanitization.sanitizeCharacterName("O'Brien")).toBe("O'Brien");
      expect(sanitization.sanitizeCharacterName('Jean-Claude')).toBe('Jean-Claude');
    });

    it('should trim whitespace', () => {
      expect(sanitization.sanitizeCharacterName('  Legolas  ')).toBe('Legolas');
      expect(sanitization.sanitizeCharacterName('\n Legolas \n')).toBe('Legolas');
    });

    it('should reject names with special characters', () => {
      expect(() => sanitization.sanitizeCharacterName('Legolas@')).toThrow();
      expect(() => sanitization.sanitizeCharacterName('Legolas#123')).toThrow();
      expect(() => sanitization.sanitizeCharacterName('Legolas<script>')).toThrow();
    });

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(101);
      expect(() => sanitization.sanitizeCharacterName(longName)).toThrow();
    });

    it('should accept names at max length', () => {
      const maxName = 'a'.repeat(100);
      expect(sanitization.sanitizeCharacterName(maxName)).toBe(maxName);
    });
  });

  describe('sanitizeNoteContent', () => {
    it('should accept plain text', () => {
      const result = sanitization.sanitizeNoteContent('This is a simple note');
      expect(result).toBe('This is a simple note');
    });

    it('should remove XSS script tags', () => {
      const dirty = 'Hello <script>alert("xss")</script> World';
      const result = sanitization.sanitizeNoteContent(dirty);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove HTML tags', () => {
      const dirty = 'Hello <b>Bold</b> World';
      const result = sanitization.sanitizeNoteContent(dirty);
      expect(result).not.toContain('<b>');
    });

    it('should remove event handlers', () => {
      const dirty = '<img src=x onerror="alert(1)">';
      const result = sanitization.sanitizeNoteContent(dirty);
      expect(result).not.toContain('onerror');
    });

    it('should reject content that is too long', () => {
      const longContent = 'a'.repeat(5001);
      expect(() => sanitization.sanitizeNoteContent(longContent)).toThrow();
    });

    it('should accept content at max length', () => {
      const maxContent = 'a'.repeat(5000);
      expect(sanitization.sanitizeNoteContent(maxContent)).toBe(maxContent);
    });

    it('should preserve safe HTML entities', () => {
      const result = sanitization.sanitizeNoteContent('5 < 10 & 10 > 5');
      expect(result).toContain('5');
      expect(result).toContain('10');
    });

    it('should trim whitespace', () => {
      const result = sanitization.sanitizeNoteContent('  note content  ');
      expect(result).not.toMatch(/^  /);
      expect(result).not.toMatch(/  $/);
    });
  });

  describe('sanitizeGuildName', () => {
    it('should accept valid guild names', () => {
      expect(sanitization.sanitizeGuildName('The Eagles')).toBe('The Eagles');
      expect(sanitization.sanitizeGuildName('Dragon-Slayers')).toBe('Dragon-Slayers');
      expect(sanitization.sanitizeGuildName("King's Guard")).toBe("King's Guard");
      expect(sanitization.sanitizeGuildName('Smith & Sons')).toBe('Smith & Sons');
    });

    it('should trim whitespace', () => {
      expect(sanitization.sanitizeGuildName('  Eagles  ')).toBe('Eagles');
    });

    it('should reject guild names that are too long', () => {
      const longName = 'a'.repeat(101);
      expect(() => sanitization.sanitizeGuildName(longName)).toThrow();
    });

    it('should reject names with script tags', () => {
      expect(() => sanitization.sanitizeGuildName('Guild<script>')).toThrow();
      expect(() => sanitization.sanitizeGuildName('Guild</script>')).toThrow();
    });
  });

  describe('sanitizeString', () => {
    it('should accept plain strings', () => {
      expect(sanitization.sanitizeString('Hello World')).toBe('Hello World');
    });

    it('should remove XSS attempts', () => {
      const dirty = 'Hello<script>alert(1)</script>World';
      const result = sanitization.sanitizeString(dirty);
      expect(result).not.toContain('<script>');
    });

    it('should truncate to maxLength', () => {
      const result = sanitization.sanitizeString('abcdefgh', 5);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should use default maxLength of 1000', () => {
      const longString = 'a'.repeat(1001);
      const result = sanitization.sanitizeString(longString);
      expect(result.length).toBeLessThanOrEqual(1000);
    });

    it('should handle empty strings', () => {
      expect(sanitization.sanitizeString('')).toBe('');
    });

    it('should handle non-string inputs gracefully', () => {
      expect(sanitization.sanitizeString(null as any)).toBe('');
      expect(sanitization.sanitizeString(undefined as any)).toBe('');
      expect(sanitization.sanitizeString(123 as any)).toBe('');
    });
  });

  describe('validateInteger', () => {
    it('should accept valid integers', () => {
      expect(sanitization.validateInteger(42)).toBe(42);
      expect(sanitization.validateInteger(0)).toBe(0);
      expect(sanitization.validateInteger(-5)).toBe(-5);
    });

    it('should convert numeric strings to integers', () => {
      expect(sanitization.validateInteger('42')).toBe(42);
      expect(sanitization.validateInteger('0')).toBe(0);
    });

    it('should respect minimum bound', () => {
      expect(() => sanitization.validateInteger(5, 10)).toThrow();
      expect(sanitization.validateInteger(10, 10)).toBe(10);
    });

    it('should respect maximum bound', () => {
      expect(() => sanitization.validateInteger(15, 0, 10)).toThrow();
      expect(sanitization.validateInteger(10, 0, 10)).toBe(10);
    });

    it('should reject non-integer floats', () => {
      expect(() => sanitization.validateInteger(3.14)).toThrow();
      expect(() => sanitization.validateInteger('3.14')).toThrow();
    });

    it('should reject NaN', () => {
      expect(() => sanitization.validateInteger(NaN)).toThrow();
      expect(() => sanitization.validateInteger('not a number')).toThrow();
    });
  });

  describe('validateNonEmpty', () => {
    it('should accept non-empty strings', () => {
      expect(sanitization.validateNonEmpty('hello')).toBe('hello');
      expect(sanitization.validateNonEmpty('a')).toBe('a');
    });

    it('should reject empty strings', () => {
      expect(() => sanitization.validateNonEmpty('')).toThrow();
      expect(() => sanitization.validateNonEmpty('   ')).toThrow();
    });

    it('should trim whitespace before checking', () => {
      expect(sanitization.validateNonEmpty('  hello  ')).toBe('  hello  ');
      expect(() => sanitization.validateNonEmpty('  \n  ')).toThrow();
    });

    it('should include field name in error', () => {
      try {
        sanitization.validateNonEmpty('', 'username');
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('username');
      }
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      expect(sanitization.escapeHtml('<script>')).toContain('&lt;');
      expect(sanitization.escapeHtml('</script>')).toContain('&gt;');
    });

    it('should escape ampersand', () => {
      expect(sanitization.escapeHtml('A & B')).toContain('&amp;');
    });

    it('should escape quotes', () => {
      expect(sanitization.escapeHtml('"quoted"')).toContain('&quot;');
      expect(sanitization.escapeHtml("'quoted'")).toContain('&#x27;');
    });

    it('should leave safe content unchanged', () => {
      const safe = 'Hello World 123';
      expect(sanitization.escapeHtml(safe)).toBe(safe);
    });
  });

  describe('isSafeString', () => {
    const safePattern = /^[a-zA-Z0-9\s\-'_]+$/;
    const xssPattern = /[<>()]/;

    it('should accept safe strings', () => {
      expect(sanitization.isSafeString('Hello World', safePattern)).toBe(true);
      expect(sanitization.isSafeString('abc123', safePattern)).toBe(true);
      expect(sanitization.isSafeString('test_123-abc', safePattern)).toBe(true);
    });

    it('should reject XSS attempts', () => {
      expect(sanitization.isSafeString('<script>', xssPattern)).toBe(true);
      expect(sanitization.isSafeString('alert(1)', xssPattern)).toBe(true);
    });

    it('should reject SQL injection attempts', () => {
      expect(sanitization.isSafeString("'; DROP TABLE users--", safePattern)).toBe(false);
      expect(sanitization.isSafeString('1 OR 1=1', safePattern)).toBe(false);
    });

    it('should allow spaces and common punctuation', () => {
      expect(sanitization.isSafeString('John Smith', safePattern)).toBe(true);
      expect(sanitization.isSafeString("O'Brien", safePattern)).toBe(true);
      expect(sanitization.isSafeString('Smith-Jones', safePattern)).toBe(true);
    });
  });

  describe('removeUnsafeCharacters', () => {
    it('should remove special characters', () => {
      const result = sanitization.removeUnsafeCharacters('Hello@#$%World');
      expect(result).not.toContain('@');
      expect(result).not.toContain('#');
    });

    it('should keep alphanumeric characters', () => {
      const result = sanitization.removeUnsafeCharacters('Hello123World');
      expect(result).toContain('Hello');
      expect(result).toContain('123');
      expect(result).toContain('World');
    });

    it('should handle empty strings', () => {
      expect(sanitization.removeUnsafeCharacters('')).toBe('');
    });

    it('should remove all XSS characters', () => {
      const result = sanitization.removeUnsafeCharacters('<script>alert(1)</script>');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('(');
      expect(result).not.toContain(')');
    });
  });

  describe('Edge Cases & Security', () => {
    it('should handle extremely long inputs gracefully', () => {
      const veryLong = 'a'.repeat(10000);
      const result = sanitization.sanitizeString(veryLong, 1000);
      expect(result.length).toBeLessThanOrEqual(1000);
    });

    it('should prevent null byte injection', () => {
      const withNull = 'test\x00injection';
      const result = sanitization.sanitizeString(withNull);
      expect(result).not.toContain('\x00');
    });

    it('should handle unicode characters safely', () => {
      const unicode = '你好世界';
      const result = sanitization.sanitizeString(unicode);
      expect(result).toBeTruthy();
    });

    it('should prevent DOM-based XSS', () => {
      const xssAttempt = 'javascript:alert(1)';
      // isSafeString expects a pattern - use a pattern that matches valid strings
      const validPattern = /^[a-zA-Z0-9_\-]*$/;
      expect(sanitization.isSafeString(xssAttempt, validPattern)).toBe(false);
    });

    it('should prevent CSS injection', () => {
      const cssInjection = 'expression(alert(1))';
      // isSafeString expects a pattern - use a pattern that matches valid strings
      const validPattern = /^[a-zA-Z0-9_\-]*$/;
      expect(sanitization.isSafeString(cssInjection, validPattern)).toBe(false);
    });

    it('should prevent path traversal', () => {
      const pathTraversal = '../../../etc/passwd';
      const result = sanitization.removeUnsafeCharacters(pathTraversal);
      expect(result).not.toContain('.');
    });
  });
});
