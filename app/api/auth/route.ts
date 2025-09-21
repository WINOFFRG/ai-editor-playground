import { NextRequest, NextResponse } from "next/server";
import { setAuthCookie, AUTH_TOKEN } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token === AUTH_TOKEN) {
    await setAuthCookie();

    return NextResponse.json(
      { message: "Authentication successful" },
      { status: 200 }
    );
  }

  return NextResponse.json({ error: "Invalid token" }, { status: 401 });
}
