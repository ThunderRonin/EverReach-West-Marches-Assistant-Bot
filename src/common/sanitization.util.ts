/**
 * Input Sanitization Utilities
 * Provides functions for sanitizing and validating user input
 */

import xss from 'xss';
import * as validator from 'validator';
import {
  SANITIZATION_RULES,
  XSS_OPTIONS,
  SANITIZATION_ERROR_MESSAGES,
  INPUT_LENGTH_LIMITS,
} from '../config/sanitization.config';

/**
 * Sanitize item key input
 * Validates against pattern and length constraints
 * @param key - The item key to sanitize
 * @returns Sanitized item key
 * @throws Error if key is invalid
 */
export function sanitizeItemKey(key: string): string {
  if (!key || typeof key !== 'string') {
    throw new Error(SANITIZATION_ERROR_MESSAGES.CONTENT_EMPTY);
  }

  const trimmed = key.trim();

  if (trimmed.length < INPUT_LENGTH_LIMITS.MIN_ITEM_KEY) {
    throw new Error(SANITIZATION_ERROR_MESSAGES.CONTENT_EMPTY);
  }

  if (trimmed.length > INPUT_LENGTH_LIMITS.MAX_ITEM_KEY) {
    throw new Error(
      SANITIZATION_ERROR_MESSAGES.CONTENT_TOO_LONG.replace(
        '{maxLength}',
        INPUT_LENGTH_LIMITS.MAX_ITEM_KEY.toString(),
      ),
    );
  }

  if (!SANITIZATION_RULES.ITEM_KEY.pattern.test(trimmed)) {
    throw new Error(SANITIZATION_ERROR_MESSAGES.INVALID_ITEM_KEY);
  }

  return trimmed.toLowerCase();
}

/**
 * Sanitize character name input
 * Validates against pattern and length constraints
 * @param name - The character name to sanitize
 * @returns Sanitized character name
 * @throws Error if name is invalid
 */
export function sanitizeCharacterName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error(SANITIZATION_ERROR_MESSAGES.CONTENT_EMPTY);
  }

  const trimmed = name.trim();

  if (trimmed.length < INPUT_LENGTH_LIMITS.MIN_CHARACTER_NAME) {
    throw new Error(SANITIZATION_ERROR_MESSAGES.CONTENT_EMPTY);
  }

  if (trimmed.length > INPUT_LENGTH_LIMITS.MAX_CHARACTER_NAME) {
    throw new Error(
      SANITIZATION_ERROR_MESSAGES.CONTENT_TOO_LONG.replace(
        '{maxLength}',
        INPUT_LENGTH_LIMITS.MAX_CHARACTER_NAME.toString(),
      ),
    );
  }

  if (!SANITIZATION_RULES.CHARACTER_NAME.pattern.test(trimmed)) {
    throw new Error(SANITIZATION_ERROR_MESSAGES.INVALID_CHARACTER_NAME);
  }

  return trimmed;
}

/**
 * Sanitize note/text content
 * Removes XSS payloads and validates length
 * @param content - The content to sanitize
 * @returns Sanitized content with XSS removed
 * @throws Error if content is invalid
 */
export function sanitizeNoteContent(content: string): string {
  if (typeof content !== 'string') {
    throw new Error(SANITIZATION_ERROR_MESSAGES.CONTENT_EMPTY);
  }

  const trimmed = content.trim();

  // Note content can be empty, so we only check max length
  if (trimmed.length > INPUT_LENGTH_LIMITS.MAX_NOTE_CONTENT) {
    throw new Error(
      SANITIZATION_ERROR_MESSAGES.CONTENT_TOO_LONG.replace(
        '{maxLength}',
        INPUT_LENGTH_LIMITS.MAX_NOTE_CONTENT.toString(),
      ),
    );
  }

  // Use xss library to remove any potential script/HTML injections
  return xss(trimmed, XSS_OPTIONS);
}

/**
 * Sanitize guild/server name
 * Validates against pattern and length constraints
 * @param name - The guild name to sanitize
 * @returns Sanitized guild name
 * @throws Error if name is invalid
 */
export function sanitizeGuildName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error(SANITIZATION_ERROR_MESSAGES.CONTENT_EMPTY);
  }

  const trimmed = name.trim();

  if (trimmed.length < INPUT_LENGTH_LIMITS.MIN_GUILD_NAME) {
    throw new Error(SANITIZATION_ERROR_MESSAGES.CONTENT_EMPTY);
  }

  if (trimmed.length > INPUT_LENGTH_LIMITS.MAX_GUILD_NAME) {
    throw new Error(
      SANITIZATION_ERROR_MESSAGES.CONTENT_TOO_LONG.replace(
        '{maxLength}',
        INPUT_LENGTH_LIMITS.MAX_GUILD_NAME.toString(),
      ),
    );
  }

  if (!SANITIZATION_RULES.GUILD_NAME.pattern.test(trimmed)) {
    throw new Error(SANITIZATION_ERROR_MESSAGES.INVALID_GUILD_NAME);
  }

  return trimmed;
}

/**
 * Generic sanitization function for string values
 * Applies XSS prevention without pattern validation
 * @param value - The value to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized value
 */
export function sanitizeString(value: string, maxLength = 1000): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return trimmed.substring(0, maxLength);
  }

  // Apply XSS prevention
  return xss(trimmed, XSS_OPTIONS);
}

/**
 * Validate integer input
 * Ensures input is a positive integer within optional bounds
 * @param value - The value to validate
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns Validated integer
 * @throws Error if value is invalid
 */
export function validateInteger(value: any, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const num = Number(value);

  if (!Number.isInteger(num)) {
    throw new Error(`Value must be an integer`);
  }

  if (num < min) {
    throw new Error(`Value must be at least ${min}`);
  }

  if (num > max) {
    throw new Error(`Value must not exceed ${max}`);
  }

  return num;
}

/**
 * Validate string is not empty
 * @param value - The value to validate
 * @param fieldName - Name of field for error message
 * @returns Trimmed string
 * @throws Error if empty
 */
export function validateNonEmpty(value: string, fieldName = 'Input'): string {
  if (!value || typeof value !== 'string') {
    throw new Error(`${fieldName} cannot be empty`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }

  return trimmed;
}

/**
 * Escape HTML characters to prevent injection
 * @param str - String to escape
 * @returns Escaped string
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }

  return validator.escape(str);
}

/**
 * Check if string contains only safe characters
 * @param str - String to check
 * @param pattern - Pattern to validate against
 * @returns True if string matches pattern
 */
export function isSafeString(str: string, pattern: RegExp): boolean {
  if (typeof str !== 'string') {
    return false;
  }

  return pattern.test(str.trim());
}

/**
 * Remove all non-alphanumeric characters except specified allowed characters
 * @param str - String to clean
 * @param allowedChars - String of allowed characters beyond alphanumeric
 * @returns Cleaned string
 */
export function removeUnsafeCharacters(str: string, allowedChars = ''): string {
  if (typeof str !== 'string') {
    return '';
  }

  const escapedAllowedChars = allowedChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`[^a-zA-Z0-9${escapedAllowedChars}]`, 'g');

  return str.replace(pattern, '');
}
