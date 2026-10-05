import { z } from "zod";
import { api, id, requireRecord, HttpError } from "@/lib/api";
import { ItemModel, ListModel, UserModel } from "@/models";
import { itemInput } from "@/lib/validation";
import { requireListAccess, sameOrigin } from '@/lib/list-access';
export async function GET(request: Request) {
  return api(async () => {
    const listId = id.parse(new URL(request.url).searchParams.get("listId"));
    await requireListAccess(listId);
    return ItemModel.find({ listId })
      .populate("addedBy boughtBy")
      .sort({ createdAt: -1 })
      .lean();
  });
}
export async function POST(request: Request) {
  return api(async () => {
    sameOrigin(request);
    const data = itemInput
      .extend({ listId: id, addedBy: id })
      .parse(await request.json());
    await requireRecord(UserModel, data.addedBy);
    const list = await requireListAccess(data.listId);
    if (!list || list.isArchived)
      throw new HttpError("Choose an active list", 400);
    const item = await ItemModel.create(data);
    return item.populate("addedBy boughtBy");
  }, 201);
}
