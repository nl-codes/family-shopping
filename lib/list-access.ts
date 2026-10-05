import { cookies } from 'next/headers';
import { ListModel, ListSessionModel, AccessAttemptModel } from '@/models';
import { HttpError } from './api';
import { newToken, tokenHash } from './access-crypto';
export const OWNER_COOKIE = 'shopping_owner';
export const accessCookie = (id: string) => `shopping_access_${id}`;
const tokenPattern = /^[a-f\d]{64}$/;
export function cookieOptions(request: Request, maxAge: number) {
  const url = new URL(request.url);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  return { httpOnly: true, sameSite: 'strict' as const, secure: !local, path: '/', maxAge };
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError('Cross-origin requests are not allowed', 403);
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError('Cross-origin requests are not allowed', 403);
}
export async function ownerHash() {
  const token = (await cookies()).get(OWNER_COOKIE)?.value;
  return token && tokenPattern.test(token) ? tokenHash(token) : null;
}
export async function ensureOwner(request: Request) {
  const jar = await cookies();
  let token = jar.get(OWNER_COOKIE)?.value;
  if (!token || !tokenPattern.test(token)) token = newToken();
  jar.set(OWNER_COOKIE, token, cookieOptions(request, 365 * 86400));
  return tokenHash(token);
}
export async function hasAccess(listId: string, ownerKeyHash?: string) {
  if (ownerKeyHash && ownerKeyHash === await ownerHash()) return true;
  const token = (await cookies()).get(accessCookie(listId))?.value;
  if (!token || !tokenPattern.test(token)) return false;
  return !!await ListSessionModel.exists({ listId, tokenHash: tokenHash(token), expiresAt: { $gt: new Date() } });
}
export async function requireListAccess(listId: string, ownerOnly = false) {
  const list = await ListModel.findById(listId).select('+ownerKeyHash');
  if (!list) throw new HttpError('List not found');
  const isOwner = !!list.ownerKeyHash && list.ownerKeyHash === await ownerHash();
  if (ownerOnly && !isOwner) throw new HttpError('Only the list owner can do this', 403);
  if (!isOwner && !await hasAccess(listId)) throw new HttpError('Enter the access code to open this list', 403);
  return list;
}
export async function publicList(list: { _id: unknown; title: string; createdBy: unknown; isArchived: boolean; ownerKeyHash?: string }) {
  const listId = String(list._id);
  const isOwner = !!list.ownerKeyHash && list.ownerKeyHash === await ownerHash();
  return { _id: listId, title: list.title, createdBy: list.createdBy, isArchived: list.isArchived, isOwner, unlocked: isOwner || await hasAccess(listId) };
}
// A database-backed, per-list window cannot be bypassed by clearing cookies or changing IP.
export async function limitAttempts(listId: string) {
  const window = Math.floor(Date.now() / (15 * 60 * 1000));
  const record = await AccessAttemptModel.findOneAndUpdate(
    { _id: `${listId}:${window}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * 15 * 60 * 1000) } },
    { upsert: true, returnDocument: 'after' },
  );
  if (record.count > 20) throw new HttpError('Too many attempts for this list. Try again in 15 minutes.', 429);
}
