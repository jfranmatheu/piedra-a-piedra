export function taskKey(stoneId, taskId) {
  return `${stoneId}::${taskId}`;
}

export function parseTaskKey(key) {
  if (!key || !key.includes("::")) return null;
  const i = key.indexOf("::");
  return { stoneId: key.slice(0, i), taskId: key.slice(i + 2) };
}

export function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function levelFromXp(xp) {
  const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 7000];
  let lvl = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) lvl = i + 1;
  }
  const cur = LEVEL_THRESHOLDS[lvl - 1] ?? 0;
  const next = LEVEL_THRESHOLDS[lvl] ?? cur + 1000;
  const pct = Math.min(100, ((xp - cur) / Math.max(1, next - cur)) * 100);
  return { level: lvl, cur, next, pct, xp };
}

export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}
