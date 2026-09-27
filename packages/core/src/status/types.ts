export type AgentStatus = "GREEN" | "RED";

export const BREACH_REASONS = [
  "max_drawdown",
  "max_spend_per_tx",
  "disallowed_venue",
  "heartbeat_missed",
  "daily_spend_exceeded",
  "denied_action",
  "disallowed_tool",
  "social_limit_exceeded",
  "flatten_observed",
  "registered",
  "operator_reset",
] as const;

export type BreachReason = (typeof BREACH_REASONS)[number];

export type CoreBreachReason = Extract<
  BreachReason,
  | "max_drawdown"
  | "max_spend_per_tx"
  | "disallowed_venue"
  | "heartbeat_missed"
  | "daily_spend_exceeded"
  | "denied_action"
  | "disallowed_tool"
  | "social_limit_exceeded"
>;
