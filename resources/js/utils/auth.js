// resources/js/utils/auth.js
import { clearToken } from "../lib/api";
import { alertSuccess } from "./alerts";

export function logout() {
  clearToken();
  alertSuccess("Signed out", "You have been signed out.");
  // Optionally hard-redirect to login
  // location.href = "/login";
}
