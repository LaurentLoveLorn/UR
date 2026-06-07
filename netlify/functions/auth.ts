import crypto from "crypto";
import type { Config } from "@netlify/functions";

// Admin credentials stored server-side only
const ADMIN_CREDS: Record<string, string> = {
  "0781841929": "Myriam",
  "0782774986": "Myliam",
};

const ADMIN_SECRET =
  process.env.ADMIN_SECRET || "1mscholars-default-secret-change-in-prod";

export function createToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({ user: username, exp: Date.now() + 8 * 60 * 60 * 1000 })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): boolean {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expectedSig = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(payload)
    .digest("base64url");
  if (expectedSig !== sig) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { username, password } = (await req.json()) as {
    username: string;
    password: string;
  };

  if (ADMIN_CREDS[username] && ADMIN_CREDS[username] === password) {
    return Response.json({ token: createToken(username) });
  }

  return Response.json({ error: "Invalid credentials" }, { status: 401 });
};

export const config: Config = {
  path: "/api/auth",
};
