export interface AppUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  level: number;
  xp: number;
  tokenBalance: number;
  email?: string | null;
  isPrivate?: boolean;
  socials?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  subscription?: {
    plan?: "free" | "pro" | "elite";
    isActive?: boolean;
  };
  chatSettings?: {
    readReceipts?: boolean;
    chatWallpaper?: string;
    messageNotifications?: boolean;
  };
  seasonXP?: number;
  seasonCoins?: number;
  seasonTasksCompleted?: number;
}

interface WebUserPayload {
  _id?: string;
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  avatar?: string;
  avatarUrl?: string;
  bio?: string | null;
  xp?: number;
  coins?: number;
  isPrivate?: boolean;
  socials?: AppUser["socials"];
  subscription?: AppUser["subscription"];
  chatSettings?: AppUser["chatSettings"];
  seasonXP?: number;
  seasonCoins?: number;
  seasonTasksCompleted?: number;
}

export function normalizeUserPayload(user: WebUserPayload): AppUser {
  const xp = user.xp ?? 0;
  const email = user.email ?? null;
  const username =
    user.username ||
    (email?.split("@")[0] ?? user.name?.toLowerCase().replace(/\s+/g, "_")) ||
    "member";

  return {
    id: user._id || user.id || "",
    username,
    displayName: user.name || null,
    avatarUrl: user.avatar || user.avatarUrl || null,
    bio: user.bio ?? null,
    level: Math.floor(xp / 500) + 1,
    xp,
    tokenBalance: user.coins ?? 0,
    email,
    isPrivate: user.isPrivate ?? false,
    socials: user.socials ?? {},
    subscription: user.subscription ?? { plan: "free", isActive: true },
    chatSettings: user.chatSettings ?? {},
    seasonXP: user.seasonXP ?? 0,
    seasonCoins: user.seasonCoins ?? 0,
    seasonTasksCompleted: user.seasonTasksCompleted ?? 0,
  };
}
