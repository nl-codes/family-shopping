import { cookies } from 'next/headers';
import { z } from 'zod';
import { api, id, HttpError } from '@/lib/api';
import { ListModel, ListSessionModel } from '@/models';
import { formatCode, normalizeCode, matchesCode, newToken, tokenHash, unseal } from '@/lib/access-crypto';
import { accessCookie, cookieOptions, limitAttempts, requireListAccess, sameOrigin } from '@/lib/list-access';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return api(async () => {
    const listId = id.parse((await context.params).id);
    await requireListAccess(listId, true);
    const list = await ListModel.findById(listId).select('+accessCodeEncrypted');
    if (!list?.accessCodeEncrypted) throw new HttpError('Owner setup is required for this list', 409);
    return { code: formatCode(unseal(list.accessCodeEncrypted, listId)) };
  });
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    sameOrigin(request);
    const listId = id.parse((await context.params).id);
    await limitAttempts(listId);
    const { code } = z.object({ code: z.string().max(30) }).parse(await request.json());
    const normalized = normalizeCode(code);
    if (!/^[a-z]{6}$/.test(normalized)) throw new HttpError('Enter six letters, like abc-def', 400);
    const list = await ListModel.findById(listId).select('+accessCodeHash');
    if (!list) throw new HttpError('List not found');
    if (!list.accessCodeHash || !matchesCode(listId, normalized, list.accessCodeHash)) throw new HttpError('Incorrect access code', 403);
    const token = newToken();
    await ListSessionModel.create({listId, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 7 * 86400000)});
    (await cookies()).set(accessCookie(listId), token, cookieOptions(request, 7 * 86400));
    return { ok: true };
  });
}
export async function DELETE(request: Request, context: Context) {
  return api(async () => {
    sameOrigin(request);
    const listId = id.parse((await context.params).id), jar = await cookies();
    const token = jar.get(accessCookie(listId))?.value;
    if (token) await ListSessionModel.deleteMany({listId, tokenHash: tokenHash(token)});
    jar.set(accessCookie(listId), '', cookieOptions(request, 0));
    return { ok: true };
  });
}
