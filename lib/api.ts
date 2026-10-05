import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "./mongodb";
export const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
export const name = z.string().trim().min(1).max(80);
export async function api(work: () => Promise<unknown>, status = 200) {
  try {
    await connectDB();
    return NextResponse.json(await work(), {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    if (error instanceof HttpError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error(error);
    return NextResponse.json(
      {
        error: process.env.MONGODB_URI
          ? "Database unavailable. Please try again."
          : "Set MONGODB_URI in .env.local to get started.",
      },
      { status: 503 },
    );
  }
}
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 404,
  ) {
    super(message);
  }
}
export async function requireRecord(
  model: { exists: (filter: object) => PromiseLike<unknown> },
  value: string,
) {
  if (!(await model.exists({ _id: value })))
    throw new HttpError("Record not found");
}
