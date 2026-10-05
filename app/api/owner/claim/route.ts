import { cookies } from 'next/headers';
import { z } from 'zod';
import { api, HttpError } from '@/lib/api';
import { OwnerClaimModel, ListModel } from '@/models';
import { tokenHash, unseal } from '@/lib/access-crypto';
import { OWNER_COOKIE, cookieOptions, ownerHash, sameOrigin } from '@/lib/list-access';
export async function POST(request: Request) {
  return api(async () => {
    sameOrigin(request);
    const { token } = z.object({token:z.string().regex(/^[a-f\d]{64}$/)}).parse(await request.json());
    const claim = await OwnerClaimModel.findOneAndDelete({_id:tokenHash(token), expiresAt:{$gt:new Date()}});
    if (!claim) throw new HttpError('This owner setup link has expired or was already used', 403);
    const claimedToken = unseal(claim.ownerTokenEncrypted, 'owner-claim');
    // Preserve lists already owned in this browser when accepting a legacy setup link.
    const currentOwner = await ownerHash();
    if (currentOwner) await ListModel.updateMany({ownerKeyHash:currentOwner},{$set:{ownerKeyHash:tokenHash(claimedToken)}});
    (await cookies()).set(OWNER_COOKIE, claimedToken, cookieOptions(request, 365 * 86400));
    return {ok:true};
  });
}
