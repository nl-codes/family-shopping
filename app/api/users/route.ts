import { z } from "zod";
import { api, name } from "@/lib/api";
import { UserModel } from "@/models";
export const runtime = "nodejs";
export async function GET() {
  return api(() => UserModel.find().sort({ createdAt: 1 }).lean());
}
export async function POST(request: Request) {
  return api(
    async () =>
      UserModel.create(z.object({ name }).parse(await request.json())),
    201,
  );
}
