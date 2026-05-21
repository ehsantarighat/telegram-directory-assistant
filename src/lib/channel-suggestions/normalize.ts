/**
 * Normalize whatever the user pasted into the channel URL field.
 *
 * Accepts (case-insensitive):
 *   https://t.me/foo
 *   http://t.me/foo
 *   t.me/foo
 *   @foo
 *   foo                  (assumes Telegram username)
 *   telegram.me/foo
 *
 * Returns:
 *   { username: "foo", url: "https://t.me/foo" }
 *
 * Returns null if it can't parse anything that looks like a Telegram
 * channel handle. Trims trailing slash, query string, fragment, and the
 * "/{messageId}" suffix sometimes pasted from a post URL.
 *
 * Telegram usernames are 5–32 chars, alphanumeric + underscore, must
 * start with a letter and not end with underscore. We loosely enforce
 * this; the admin verifies for real when approving.
 */

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{3,30}[a-zA-Z0-9]$/;

export function normalizeTelegramChannel(
  input: string,
): { username: string; url: string } | null {
  let s = input.trim();
  if (!s) return null;

  // Strip protocol
  s = s.replace(/^https?:\/\//i, "");
  // Strip www.
  s = s.replace(/^www\./i, "");
  // Match t.me or telegram.me
  s = s.replace(/^(t|telegram)\.me\//i, "");
  // Strip leading @
  s = s.replace(/^@/, "");
  // Strip query / fragment / trailing slash
  s = s.replace(/[?#].*$/, "").replace(/\/+$/, "");
  // Strip "/messageId" if user pasted a post URL like t.me/foo/12345
  s = s.split("/")[0];

  if (!USERNAME_RE.test(s)) return null;
  return {
    username: s,
    url: `https://t.me/${s}`,
  };
}
