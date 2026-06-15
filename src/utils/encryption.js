import crypto from 'crypto';

const KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
if (KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)');
}

const IV_LEN = 12;
const TAG_LEN = 16;

export function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return 'ENC:' + Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(value) {
  if (!value || !value.startsWith('ENC:')) return value;
  try {
    const buf = Buffer.from(value.slice(4), 'base64');
    if (buf.length < IV_LEN + TAG_LEN) {
      throw new Error('Ciphertext too short');
    }
    const iv = buf.slice(0, IV_LEN);
    const tag = buf.slice(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = buf.slice(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext, 'binary', 'utf8') + decipher.final('utf8');
  } catch {
    return null;
  }
}
