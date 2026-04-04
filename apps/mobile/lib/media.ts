import { API_URL } from "./api";

const API_ORIGIN = API_URL.replace(/\/api$/, "");

export function getImageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }

  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatTimeAgo(date?: string | Date | null) {
  if (!date) return "Just now";

  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return "Just now";

  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatConversationDate(date?: string | Date | null) {
  if (!date) return "";

  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return "";

  const now = new Date();
  const sameDay =
    target.getDate() === now.getDate() &&
    target.getMonth() === now.getMonth() &&
    target.getFullYear() === now.getFullYear();

  if (sameDay) {
    return target.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return formatTimeAgo(target);
}

export function getInitials(name?: string | null) {
  if (!name) return "EX";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();

  return `${parts[0]![0] || ""}${parts[1]![0] || ""}`.toUpperCase();
}
