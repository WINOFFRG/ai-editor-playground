import { cookies } from "next/headers";

export const AUTH_TOKEN = process.env.AUTH_TOKEN || "default-dev-token";

export async function setAuthCookie() {
  const cookieStore = await cookies();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  cookieStore.set("auth-token", AUTH_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: oneWeek,
    path: "/",
  });
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("auth-token");
  return authCookie?.value === AUTH_TOKEN;
}
