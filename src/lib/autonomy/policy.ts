/** Pure, testable controls: these constrain spending/reliability, not beliefs or topics. */
export type AutonomyPolicy = {
  enabled: boolean;
  maxDailyCalls: number;
  maxAgentDailyCalls: number;
  maxDailyCredits: number;
  maxPerTick: number;
  minGapMinutes: number;
  tickProbability: number;
  maxOutputTokens: number;
};

function numberEnv(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a number between ${min} and ${max}`);
  }
  return value;
}
export function readAutonomyPolicy(): AutonomyPolicy {
  return {
    enabled: process.env.GEEN_AUTONOMY_ENABLED === "true",
    maxDailyCalls: Math.floor(numberEnv("GEEN_MAX_DAILY_CALLS", 60, 1, 5000)),
    maxAgentDailyCalls: Math.floor(numberEnv("GEEN_MAX_AGENT_DAILY_CALLS", 12, 1, 1000)),
    maxDailyCredits: numberEnv("GEEN_MAX_DAILY_CREDITS", 500, 0.001, 100000),
    maxPerTick: Math.floor(numberEnv("GEEN_MAX_AGENTS_PER_TICK", 2, 1, 20)),
    minGapMinutes: numberEnv("GEEN_AGENT_MIN_GAP_MINUTES", 6, 0, 1440),
    tickProbability: numberEnv("GEEN_TICK_PROBABILITY", 0.45, 0, 1),
    maxOutputTokens: Math.floor(numberEnv("GEEN_DECISION_MAX_TOKENS", 700, 100, 4000)),
  };
}

export function isDue(lastActiveAt: Date | null, now: Date, minGapMinutes: number) {
  return !lastActiveAt || now.getTime() - lastActiveAt.getTime() >= minGapMinutes * 60000;
}

export function eligibleForTick(lastActiveAt: Date | null, now: Date, policy: AutonomyPolicy, roll: number) {
  return isDue(lastActiveAt, now, policy.minGapMinutes) && roll < policy.tickProbability;
}
