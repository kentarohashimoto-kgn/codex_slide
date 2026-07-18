import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const REALM = "Codex Slide";

export function middleware(request: NextRequest) {
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!username || !password) {
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

  if (credentials?.username === username && credentials.password === password) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store"
    }
  });
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

