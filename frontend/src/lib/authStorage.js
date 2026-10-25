// Helpers for the login session kept in this browser (phone / PWA).
// The access token stays in localStorage as before. We also keep a copy of the
// signed-in person's basic profile so the app can open instantly and stay
// signed in even when the network or server is briefly unavailable.
const USER_KEY = "authUser";

export function getCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    const user = raw ? JSON.parse(raw) : null;
    return user && typeof user === "object" ? user : null;
  } catch {
    return null;
  }
}

export function cacheUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage blocked - ignore */
  }
}

// Real logout / session really ended: forget everything about the login.
export function clearStoredAuth() {
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authRole");
    localStorage.removeItem(USER_KEY);
  } catch {
    /* storage blocked - ignore */
  }
}

// True ONLY when the server clearly said "this login is not valid" (HTTP 401).
// No internet, timeouts, 5xx and 429 are NOT a rejection - they must never log anyone out.
export function isAuthRejection(error) {
  return error?.response?.status === 401;
}