import { encrypt, decrypt } from '../../src/utils/encryption.js';

describe('AES-256-GCM Encryption Utility', () => {
  test('roundtrip: decrypt(encrypt(plaintext)) === plaintext', () => {
    const plaintext = 'sensitive project description — confidential';
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  test('semantic security: same plaintext produces different ciphertexts (random IV)', () => {
    const plaintext = 'same input';
    const cipher1 = encrypt(plaintext);
    const cipher2 = encrypt(plaintext);
    expect(cipher1).not.toBe(cipher2);
  });

  test('encrypted output carries the ENC: prefix marker', () => {
    expect(encrypt('anything')).toMatch(/^ENC:/);
  });

  test('auth tag integrity: tampered auth tag causes decrypt to return null', () => {
    const ciphertext = encrypt('integrity check');
    // ENC:<base64(IV[12B]|tag[16B]|ciphertext)>
    // IV base64 chars: 0-15 (12 bytes → 16 chars). Auth tag base64 chars: 16-37 (16 bytes → 22 chars).
    // Corrupt chars 16-27 (within the auth tag region) to invalidate the GCM tag.
    const corrupted = ciphertext.slice(0, 16) + 'AAAAAAAAAAAA' + ciphertext.slice(28);
    expect(decrypt(corrupted)).toBeNull();
  });

  test('malformed ENC: payload (too short) returns null without throwing', () => {
    const tooShort = 'ENC:' + Buffer.alloc(10).toString('base64');
    expect(decrypt(tooShort)).toBeNull();
  });

  test('plain-text passthrough: decrypt leaves non-encrypted strings unchanged', () => {
    expect(decrypt('plain text without prefix')).toBe('plain text without prefix');
    expect(decrypt('another plain string')).toBe('another plain string');
  });

  test('null/undefined passthrough: encrypt and decrypt handle falsy values without throwing', () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt(undefined)).toBeUndefined();
    expect(decrypt(null)).toBeNull();
    expect(decrypt(undefined)).toBeUndefined();
    expect(decrypt('')).toBe('');
  });
});
