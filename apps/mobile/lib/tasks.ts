export type TaskCategory = string;

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  difficulty: "Easy" | "Medium" | "Hard";
  rewardXp: number;
  rewardCoins: number;
  eta: string;
  location: string;
  headline: string;
  description: string;
  urgent?: boolean;
  badgeLabel?: string;
}

export interface TaskCardSource {
  _id: string;
  title: string;
  category: string;
  subcategory?: string;
  coins?: number;
  deadline?: string;
  description: string;
  createdBy?:
    | {
        _id?: string;
        name?: string;
      }
    | string;
}

export function mapTaskToCard(task: TaskCardSource): Task {
  const coins = Number(task.coins || 0);

  return {
    id: task._id,
    title: task.title,
    category: task.category,
    difficulty: coins >= 200 ? "Hard" : coins >= 50 ? "Medium" : "Easy",
    rewardXp: Math.floor(10 + coins / 10),
    rewardCoins: coins,
    eta: task.deadline
      ? new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "No deadline",
    location:
      typeof task.createdBy === "string"
        ? "Remote"
        : task.createdBy?.name || "Remote",
    headline: task.subcategory || task.category,
    description: task.description,
    urgent: coins >= 100,
    badgeLabel: coins >= 100 ? "Hot" : undefined,
  };
}
