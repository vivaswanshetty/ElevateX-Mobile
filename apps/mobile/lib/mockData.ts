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

export interface ActivityItem {
  id: string;
  type: "reward" | "comment" | "match" | "system";
  title: string;
  detail: string;
  time: string;
  unread?: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  progress: number;
}

export const taskCategories: Array<TaskCategory | "All"> = [
  "All",
  "Design",
  "Engineering",
  "Marketing",
  "Operations",
  "Community",
];

export const featuredTasks: Task[] = [
  {
    id: "task-1",
    title: "Redesign onboarding checklist",
    category: "Design",
    difficulty: "Medium",
    rewardXp: 180,
    rewardCoins: 45,
    eta: "3h",
    location: "Remote",
    headline: "Tighten the first-run experience for new members.",
    description:
      "Audit the first three onboarding touchpoints and propose a lighter, clearer checklist flow.",
    urgent: true,
  },
  {
    id: "task-2",
    title: "Ship referral analytics endpoint",
    category: "Engineering",
    difficulty: "Hard",
    rewardXp: 320,
    rewardCoins: 90,
    eta: "1 day",
    location: "Hybrid",
    headline: "Expose cohort conversion metrics for growth experiments.",
    description:
      "Implement a backend endpoint that returns weekly referral conversion by source and campaign.",
  },
  {
    id: "task-3",
    title: "Write launch copy for mentor week",
    category: "Marketing",
    difficulty: "Easy",
    rewardXp: 120,
    rewardCoins: 30,
    eta: "90m",
    location: "Remote",
    headline: "Turn the event plan into concise product-facing copy.",
    description:
      "Draft push, email, and in-app copy for the mentor week campaign and align tone across channels.",
  },
  {
    id: "task-4",
    title: "Map creator support SLAs",
    category: "Operations",
    difficulty: "Medium",
    rewardXp: 160,
    rewardCoins: 40,
    eta: "4h",
    location: "On-site",
    headline: "Define response targets and escalation paths.",
    description:
      "Document support response times, escalation ownership, and exception handling for creator issues.",
  },
  {
    id: "task-5",
    title: "Host the weekly challenge room",
    category: "Community",
    difficulty: "Easy",
    rewardXp: 90,
    rewardCoins: 25,
    eta: "45m",
    location: "Remote",
    headline: "Run a lightweight live session that keeps streaks active.",
    description:
      "Facilitate a 30-minute challenge room, answer questions, and capture the top blockers afterward.",
  },
];

export const activityFeed: ActivityItem[] = [
  {
    id: "activity-1",
    type: "reward",
    title: "XP awarded",
    detail: "You earned 120 XP for closing the mentor week copy task.",
    time: "9 min ago",
    unread: true,
  },
  {
    id: "activity-2",
    type: "comment",
    title: "New feedback",
    detail: "Priya left review notes on your onboarding checklist draft.",
    time: "48 min ago",
    unread: true,
  },
  {
    id: "activity-3",
    type: "match",
    title: "Task match",
    detail: "A new operations task matches your reliability streak and availability.",
    time: "2 hours ago",
  },
  {
    id: "activity-4",
    type: "system",
    title: "Streak protected",
    detail: "Your 12-day streak is safe after completing two tasks this week.",
    time: "Yesterday",
  },
];

export const achievements: Achievement[] = [
  {
    id: "achievement-1",
    name: "Momentum Builder",
    description: "Complete 5 tasks in a single week.",
    progress: 80,
  },
  {
    id: "achievement-2",
    name: "Sharp Reviewer",
    description: "Receive 10 positive peer reviews.",
    progress: 60,
  },
  {
    id: "achievement-3",
    name: "Community Anchor",
    description: "Host 3 challenge rooms.",
    progress: 33,
  },
];
