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
 * Funnel phases. Colour encodes WHERE IN THE FUNNEL a metric sits — not an
 * arbitrary identity per metric.
 *
 * This is deliberate. These eight metrics render as a 4-column grid on desktop,
 * a 2-column grid on mobile, and a single row of chips in the trend selector,
 * so any given swatch can neighbour a different one in each layout. A search
 * over every ordering of seven distinct hues found ZERO assignments that clear
 * the separation gates in all three layouts at once — eight identities was
 * simply more colour than the layout can carry. Four phase colours, validated
 * ALL-PAIRS so layout can't break them, carry more meaning and always pass.
 *
 * Validated on a dark surface (dataviz palette validator, --pairs all):
 * normal-vision ΔE 19.3 (floor 15), CVD ΔE 6.9, all ≥3:1 on surface. The 6.9
 * sits in the 6–8 band, which is legal here because every swatch is rendered
 * beside its own text label — never colour alone. Keep that label if you reuse
 * these colours anywhere new.
 */
export const PHASE = {
  prospecting: "#3987e5", // dials → connects → conversations
  meetings:    "#d55181", // booked → held
  proposals:   "#c98500", // submitted
  won:         "#008300", // closes → revenue
} as const;

/** The numeric fields of a week log, in funnel order. */
export const WEEK_METRICS = [
  { key: "dials",               label: "Dials",     sub: "Calls made",         color: PHASE.prospecting, money: false },
  { key: "connects",            label: "Connects",  sub: "Picked up",          color: PHASE.prospecting, money: false },
  { key: "conversations",       label: "Convos",    sub: "Real conversations", color: PHASE.prospecting, money: false },
  { key: "meetings_booked",     label: "Booked",    sub: "Meetings set",       color: PHASE.meetings,    money: false },
  { key: "meetings_held",       label: "Held",      sub: "Meetings that ran",  color: PHASE.meetings,    money: false },
  { key: "proposals_submitted", label: "Submitted", sub: "Proposals out",      color: PHASE.proposals,   money: false },
  { key: "closes",              label: "Closes",    sub: "Deals won",          color: PHASE.won,         money: false },
  { key: "revenue",             label: "Revenue",   sub: "Cash closed",        color: PHASE.won,         money: true  },
] as const;

export type WeekMetricKey = (typeof WEEK_METRICS)[number]["key"];
