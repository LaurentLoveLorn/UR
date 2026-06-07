import type { Config, Context } from "@netlify/functions";
import { db } from "../../db/index.js";
import { applications } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { verifyToken } from "./auth.js";

function requireAdmin(req: Request): boolean {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  return verifyToken(token);
}

export default async (req: Request, context: Context) => {
  if (!requireAdmin(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ref } = context.params;

  if (req.method === "PATCH") {
    const { status } = (await req.json()) as { status: string };
    const validStatuses = ["new", "pending", "paid", "rejected"];
    if (!validStatuses.includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }
    const [updated] = await db
      .update(applications)
      .set({ status })
      .where(eq(applications.ref, ref))
      .returning();
    if (!updated) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json(updated);
  }

  if (req.method === "DELETE") {
    const [deleted] = await db
      .delete(applications)
      .where(eq(applications.ref, ref))
      .returning();
    if (!deleted) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/applications/:ref",
};
