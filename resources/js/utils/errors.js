export function extractErrorMessage(error, fallback = "Something went wrong.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;

  const message = error?.message ?? fallback;

  if (typeof message === "string") {
    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed === "object") {
        if (parsed.errors) {
          const first = Object.values(parsed.errors).flat().find(Boolean);
          if (first) return String(first);
        }
        if (parsed.message) {
          return String(parsed.message);
        }
      }
    } catch (_) {
      // message was not JSON — fall through
    }
    if (message.trim() !== "") {
      return message;
    }
  }

  return fallback;
}

