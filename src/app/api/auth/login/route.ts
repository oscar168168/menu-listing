import { NextRequest, NextResponse } from "next/server";
import { findUserByIdentifier } from "@/lib/firestore";
import {
  clearSessionCookies,
  setSessionCookie,
  verifyPasswordAsync,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid credentials" },
        { status: 400 }
      );
    }

    const found = await findUserByIdentifier(parsed.data.identifier);
    if (
      !found ||
      !(await verifyPasswordAsync(parsed.data.password, found.data.passwordHash))
    ) {
      return NextResponse.json(
        { error: "Invalid username, phone number, or password" },
        { status: 401 }
      );
    }

    const user = {
      id: found.id,
      email:
        found.data.username ||
        found.data.phone ||
        found.data.email ||
        parsed.data.identifier,
      username: found.data.username,
      phone: found.data.phone,
      name: found.data.name,
      role: found.data.role,
      tenantId: found.data.tenantId ?? null,
    };

    await clearSessionCookies();
    await setSessionCookie(user);

    const redirectTo =
      user.role === "SUPER_ADMIN" ? "/super-admin" : "/admin";

    return NextResponse.json({
      user,
      redirectTo,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Unable to sign in right now" },
      { status: 500 }
    );
  }
}
