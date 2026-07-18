import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const REALM = "Codex Slide";

export function middleware(request: NextRequest) {
  const users = getBasicAuthUsers();

  if (users.length === 0) {
    if (process.env.NODE_ENV === "development") return NextResponse.next();

    return new NextResponse("Basic auth is not configured.", {
      status: 503,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }

  const authorization = request.headers.get("authorization");
  const credentials = parseBasicAuthorization(authorization);
  const matchedUser = credentials ? users.find((user) => user.username === credentials.username && user.password === credentials.password) : null;

  if (matchedUser) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-codex-user", matchedUser.username);
    const response = NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
    response.cookies.set("codex_slide_user", matchedUser.username, {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    return response;
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store"
    }
  });
}

function getBasicAuthUsers() {
  const users = parseUsers(process.env.BASIC_AUTH_USERS);
  if (users.length > 0) return users;

  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;
  return username && password ? [{ username, password }] : [];
}

function parseUsers(value?: string) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return Object.entries(parsed)
      .filter(([username, password]) => username && password)
      .map(([username, password]) => ({ username, password }));
  } catch {
    return value
      .split(",")
      .map((pair) => pair.trim())
      .map((pair) => {
        const separatorIndex = pair.indexOf(":");
        if (separatorIndex === -1) return null;
        return {
          username: pair.slice(0, separatorIndex),
          password: pair.slice(separatorIndex + 1)
        };
      })
      .filter((user): user is { username: string; password: string } => Boolean(user?.username && user.password));
  }
}

function parseBasicAuthorization(authorization: string | null) {
  if (!authorization?.startsWith("Basic ")) return null;

  try {
    const decoded = atob(authorization.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1)
    };
  } catch {
    return null;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
