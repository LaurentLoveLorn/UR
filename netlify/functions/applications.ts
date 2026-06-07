import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { applications } from "../../db/schema.js";
import { eq, or } from "drizzle-orm";
import { verifyToken } from "./auth.js";

function genRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < 6; i++)
    r += chars[Math.floor(Math.random() * chars.length)];
  return "1MS-2025-" + r;
}

function requireAdmin(req: Request): boolean {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  return verifyToken(token);
}

export default async (req: Request) => {
  if (req.method === "GET") {
    if (!requireAdmin(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const apps = await db
      .select()
      .from(applications)
      .orderBy(applications.submittedAt);
    return Response.json(apps);
  }

  if (req.method === "POST") {
    const body = (await req.json()) as Record<string, unknown>;

    // Check for duplicate ID or email
    const existing = await db
      .select({ ref: applications.ref, idNo: applications.idNo, email: applications.email })
      .from(applications)
      .where(
        or(
          eq(applications.idNo, String(body.idNo || "").toUpperCase()),
          eq(applications.email, String(body.email || "").toLowerCase())
        )
      );

    if (existing.length > 0) {
      const dupId = existing.find(
        (a) => a.idNo === String(body.idNo || "").toUpperCase()
      );
      const dupEmail = existing.find(
        (a) => a.email === String(body.email || "").toLowerCase()
      );
      if (dupId) {
        return Response.json({ error: "duplicate_id" }, { status: 409 });
      }
      if (dupEmail) {
        return Response.json({ error: "duplicate_email" }, { status: 409 });
      }
    }

    const ref = genRef();
    const [record] = await db
      .insert(applications)
      .values({
        ref,
        status: "new",
        firstName: String(body.firstName || ""),
        lastName: String(body.lastName || ""),
        dob: String(body.dob || ""),
        gender: String(body.gender || ""),
        nationality: String(body.nationality || ""),
        category: String(body.category || ""),
        idNo: String(body.idNo || "").toUpperCase(),
        phone: String(body.phone || ""),
        email: String(body.email || "").toLowerCase(),
        whatsapp: String(body.whatsapp || "") || null,
        district: String(body.district || ""),
        school: String(body.school || ""),
        year: String(body.year || ""),
        indexNo: String(body.indexNo || ""),
        combo: String(body.combo || ""),
        equivNo: String(body.equivNo || "") || null,
        equivDate: String(body.equivDate || "") || null,
        prog1: String(body.prog1 || "") || null,
        col1: String(body.col1 || "") || null,
        prog2: String(body.prog2 || "") || null,
        col2: String(body.col2 || "") || null,
        prog3: String(body.prog3 || "") || null,
        col3: String(body.col3 || "") || null,
        payMethod: String(body.payMethod || "") || null,
        referral: String(body.referral || "") || null,
        notes: String(body.notes || "") || null,
        doc1: Boolean(body.doc1),
        doc2: Boolean(body.doc2),
        doc3: Boolean(body.doc3),
        doc4: Boolean(body.doc4),
        doc5: Boolean(body.doc5),
        doc6: Boolean(body.doc6),
        agree1: Boolean(body.agree1),
        agree2: Boolean(body.agree2),
        agree3: Boolean(body.agree3),
        agree4: Boolean(body.agree4),
        agree5: Boolean(body.agree5),
      })
      .returning();

    return Response.json(record, { status: 201 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/applications",
};
