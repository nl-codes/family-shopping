import { z } from "zod";
import { api, id, HttpError } from "@/lib/api";
import { ListModel, ItemModel } from "@/models";
import { requireListAccess, sameOrigin, publicList } from "@/lib/list-access";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return api(async () => {
    sameOrigin(request);
    const listId = id.parse((await context.params).id);
    await requireListAccess(listId, true);
    const data = z
      .object({
        title: z.string().trim().min(1).max(120).optional(),
        isArchived: z.boolean().optional(),
      })
      .parse(await request.json());
    const list = await ListModel.findByIdAndUpdate(listId, data, {
      new: true,
      runValidators: true,
    });
    if (!list) throw new HttpError("List not found");
    return publicList(await list.populate("createdBy", "name"));
  });
}
export async function DELETE(request: Request, context: Context) {
  return api(async () => {
    sameOrigin(request);
    const listId = id.parse((await context.params).id);
    const clearing =
      new URL(request.url).searchParams.get("completed") === "true";
    const existing = await requireListAccess(listId, !clearing);
    if (!existing) throw new HttpError("List not found");
    if (new URL(request.url).searchParams.get("completed") === "true") {
      if (existing.isArchived)
        throw new HttpError("Restore this list before clearing items", 400);
      await ItemModel.deleteMany({ listId, status: "COMPLETED" });
      return { ok: true };
    }
    await ItemModel.deleteMany({ listId });
    await ListModel.findByIdAndDelete(listId);
    return { ok: true };
  });
}
