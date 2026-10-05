import { z } from "zod";
import { api, id, requireRecord } from "@/lib/api";
import { ListModel, UserModel } from "@/models";
import { newCode, codeHash, seal } from '@/lib/access-crypto';
import { ensureOwner, publicList, sameOrigin } from '@/lib/list-access';
export const runtime = "nodejs";
export async function GET() {
  return api(async () => {
    const lists = await ListModel.find().select('+ownerKeyHash').populate('createdBy', 'name').sort({createdAt:-1});
    return Promise.all(lists.map(list => publicList(list)));
  });
}
export async function POST(request: Request) {
  return api(async () => {
    sameOrigin(request);
    const data = z
      .object({ title: z.string().trim().min(1).max(120), createdBy: id })
      .parse(await request.json());
    await requireRecord(UserModel, data.createdBy);
    const list = new ListModel(data);
    const code = newCode();
    list.ownerKeyHash = await ensureOwner(request);
    list.accessCodeHash = codeHash(String(list._id), code);
    list.accessCodeEncrypted = seal(code, String(list._id));
    await list.save();
    await list.populate('createdBy', 'name');
    return publicList(list);
  }, 201);
}
