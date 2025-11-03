import { getAnonymousUserId, isValidUserId, getUserIdForForum } from '../../../src/services/userService.js';
import { jest } from '@jest/globals';

describe('UserService', () => {
  describe('getAnonymousUserId', () => {
    it('should return the anonymous user ID', () => {
      const anonymousId = getAnonymousUserId();
      expect(anonymousId).toBe('00000000-0000-0000-0000-000000000000');
    });
  });

  describe('isValidUserId', () => {
    it('should return true for valid UUIDs', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(isValidUserId(validUUID)).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      const invalidUUID = 'invalid-uuid';
      expect(isValidUserId(invalidUUID)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isValidUserId(null)).toBe(false);
      expect(isValidUserId(undefined)).toBe(false);
    });
  });

  describe('getUserIdForForum', () => {
    it('should return the user ID if valid', () => {
      const validUserId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = getUserIdForForum(validUserId);
      expect(userId).toBe(validUserId);
    });

    it('should return anonymous ID if no user ID provided', () => {
      const userId = getUserIdForForum(null);
      expect(userId).toBe('00000000-0000-0000-0000-000000000000');
    });

    it('should return anonymous ID if user ID is invalid', () => {
      const invalidUserId = 'invalid-user-id';
      const userId = getUserIdForForum(invalidUserId);
      expect(userId).toBe('00000000-0000-0000-0000-000000000000');
    });
  });
});