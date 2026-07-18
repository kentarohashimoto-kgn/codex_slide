export function getRequestUser(request: Request) {
  const forwardedUser = request.headers.get("x-codex-user");
  if (forwardedUser) return forwardedUser;

  const cookieUser = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("codex_slide_user="))
    ?.slice("codex_slide_user=".length);

  return cookieUser ? decodeURIComponent(cookieUser) : "default";
}
