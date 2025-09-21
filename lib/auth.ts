import { cookies } from "next/headers";

export const AUTH_TOKEN = process.env.AUTH_TOKEN || "default-dev-token";
export const COOKIE_NAME = "auth-token";

export async function setAuthCookie() {
  const cookieStore = await cookies();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  cookieStore.set(COOKIE_NAME, AUTH_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: oneWeek,
    path: "/",
  });
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(COOKIE_NAME);
  return authCookie?.value === AUTH_TOKEN;
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
