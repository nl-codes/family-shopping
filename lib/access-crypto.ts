import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
function key() {
  const secret = process.env.LIST_ACCESS_SECRET;
  if (!secret || !/^[a-f\d]{64}$/i.test(secret)) throw new Error('LIST_ACCESS_SECRET must be 32 random bytes encoded as hex');
  return Buffer.from(secret, 'hex');
}
export const newToken = () => randomBytes(32).toString('hex');
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export function newCode() { return Array.from({length:6}, () => String.fromCharCode(97 + randomInt(26))).join(''); }
export function normalizeCode(value: string) { return value.toLowerCase().replace(/[\s-]/g, ''); }
export function formatCode(value: string) { return `${value.slice(0,3)}-${value.slice(3)}`; }
export function codeHash(listId: string, code: string) { return createHmac('sha256', key()).update(`${listId}:${code}`).digest('hex'); }
export function matchesCode(listId: string, code: string, hash: string) {
  const actual = Buffer.from(codeHash(listId, code), 'hex');
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function seal(value: string, context: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(v => v.toString('base64url')).join('.');
}
export function unseal(value: string, context: string) {
  const [iv, tag, data] = value.split('.').map(v => Buffer.from(v, 'base64url'));
  const cipher = createDecipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(context)); cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
}
