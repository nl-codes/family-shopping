import { z } from "zod";
import { api, id, requireRecord, HttpError } from "@/lib/api";
import { ItemModel, UserModel, ListModel } from "@/models";
import { itemInput } from "@/lib/validation";
import { requireListAccess, sameOrigin } from "@/lib/list-access";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return api(async () => {
    sameOrigin(request);
    const itemId = id.parse((await context.params).id);
    const data = itemInput
      .partial()
      .extend({
        status: z.enum(["PENDING", "PARTIAL", "COMPLETED"]).optional(),
        actorId: id.optional(),
      })
      .parse(await request.json());
    const existing = await ItemModel.findById(itemId);
    if (!existing) throw new HttpError("Item not found");
    const list = await requireListAccess(String(existing.listId));
    if (!list || list.isArchived)
      throw new HttpError("Restore this list before editing items", 400);
    const { actorId, ...changes } = data;
    const update: Record<string, unknown> = { ...changes };
    if (data.status) {
      if (!actorId) throw new HttpError("Choose a family member", 400);
      await requireRecord(UserModel, actorId);
      update.boughtBy = data.status === "COMPLETED" ? actorId : null;
      update.buyLocation = data.status === "COMPLETED" ? new Date() : null;
    }
    const item = await ItemModel.findByIdAndUpdate(itemId, update, {
      new: true,
      runValidators: true,
    }).populate("addedBy boughtBy");
    if (!item) throw new HttpError("Item not found");
    return item;
  });
}
export async function DELETE(request: Request, context: Context) {
  return api(async () => {
    sameOrigin(request);
    const itemId = id.parse((await context.params).id);
    const existing = await ItemModel.findById(itemId);
    if (!existing) throw new HttpError("Item not found");
    const list = await requireListAccess(String(existing.listId));
    if (!list || list.isArchived)
      throw new HttpError("Restore this list before deleting items", 400);
    const item = await ItemModel.findByIdAndDelete(itemId);
    if (!item) throw new HttpError("Item not found");
    return { ok: true };
  });
}
