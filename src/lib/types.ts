export type AccountStatus = "prospect" | "active" | "customer" | "dead";
export type ContactStatus =
  | "new" | "contacted" | "interested" | "meeting" | "customer" | "not_interested";
export type StageKind = "open" | "won" | "lost";
export type DealStatus = "open" | "won" | "lost";
export type TaskType = "call" | "email" | "meeting" | "follow_up" | "other";
export type TaskPriority = "low" | "normal" | "high";
export type TaskStatus = "open" | "done";

export interface Profile {
  id: string;
  full_name: string | null;
  company: string | null;
  currency: string;
  goal_dials: number;
  goal_connects: number;
  goal_meetings: number;
  goal_closes: number;
  goal_revenue: number;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  website: string | null;
  industry: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  employees: string | null;
  status: AccountStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  account_id: string | null;
  first_name: string;
  last_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  linkedin: string | null;
  status: ContactStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  color: string;
  probability: number;
  kind: StageKind;
  created_at: string;
}

export interface Deal {
  id: string;
  user_id: string;
  name: string;
  account_id: string | null;
  contact_id: string | null;
  stage_id: string | null;
  value: number;
  expected_close: string | null;
  closed_at: string | null;
  status: DealStatus;
  source: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  due_date: string;
  due_time: string | null;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string | null;
  account_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeekLog {
  id: string;
  user_id: string;
  week_start: string;
  dials: number;
  connects: number;
  conversations: number;
  meetings_booked: number;
  meetings_held: number;
  proposals_submitted: number;
  closes: number;
  revenue: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * The numeric fields of a week log, in display order, with their accent colour.
 *
 * This exact ORDER was checked with the dataviz palette validator against a dark
 * surface: worst adjacent-pair CVD ΔE 13.0, normal-vision ΔE 19.3, every slot
 * ≥3:1 on surface. Re-run the validator before reordering — yellow must never
 * sit next to orange, and orange only tolerates blue/aqua/violet as neighbours.
 *
 * Colour is a *mark* colour only. Big numbers always wear text tokens.
 */
export const WEEK_METRICS = [
  { key: "dials",               label: "Dials",     sub: "Calls made",         color: "#d95926", money: false },
  { key: "connects",            label: "Connects",  sub: "Picked up",          color: "#3987e5", money: false },
  { key: "conversations",       label: "Convos",    sub: "Real conversations", color: "#199e70", money: false },
  { key: "meetings_booked",     label: "Booked",    sub: "Meetings set",       color: "#9085e9", money: false },
  { key: "meetings_held",       label: "Held",      sub: "Meetings that ran",  color: "#c98500", money: false },
  { key: "proposals_submitted", label: "Submitted", sub: "Proposals out",      color: "#d55181", money: false },
  { key: "closes",              label: "Closes",    sub: "Deals won",          color: "#008300", money: false },
  { key: "revenue",             label: "Revenue",   sub: "Cash closed",        color: "#008300", money: true  },
] as const;

export type WeekMetricKey = (typeof WEEK_METRICS)[number]["key"];
