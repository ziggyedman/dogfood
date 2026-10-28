export function parseDueDate(text: string, base = new Date()): Date | null {
  const t = text.toLowerCase();
  const at = (d: Date, h: number, m = 0) => {
    d.setHours(h, m, 0, 0);
    return d;
  };

  // "in 2 hours", "in 30 minutes", "in 3 days", "in 2 weeks"
  const rel = /\bin\s+(\d+)\s+(min(?:ute)?s?|hours?|hrs?|days?|weeks?)\b/.exec(t);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2];
    const d = new Date(base);
    if (unit.startsWith("min")) d.setMinutes(d.getMinutes() + n);
    else if (unit.startsWith("h")) d.setHours(d.getHours() + n);
    else if (unit.startsWith("d")) d.setDate(d.getDate() + n);
    else d.setDate(d.getDate() + n * 7);
    return d;
  }

  // explicit ISO date, optionally with time
  const iso = /\b(\d{4})-(\d{2})-(\d{2})(?:[\sT]+(\d{2}):(\d{2}))?\b/.exec(t);
  if (iso) {
    const [, y, mo, da, hh, mi] = iso;
    return new Date(+y, +mo - 1, +da, hh ? +hh : 9, mi ? +mi : 0, 0, 0);
  }

  if (/\b(today|this afternoon|this evening|tonight)\b/.test(t)) return at(new Date(base), 17);

  if (/\btomorrow\b|\btmrw\b/.test(t)) {
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return at(d, 9);
  }

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < days.length; i++) {
    if (new RegExp(`\\b${days[i]}\\b`).test(t)) {
      const d = new Date(base);
      const delta = (i - d.getDay() + 7) % 7 || 7; // next occurrence, not today
      d.setDate(d.getDate() + delta);
      return at(d, 9);
    }
  }

  return null;
}

/** Given a due date and a repeat rule, compute the next due date. */
export function nextOccurrence(dueAt: number, repeat: string): number | null {
  const d = new Date(dueAt);
  const nowReal = Date.now();
  const stepDays = repeat === "daily" ? 1 : repeat === "weekly" ? 7 : repeat === "monthly" ? 30 : 0;
  if (stepDays === 0) return null;
  // keep stepping forward until in the future (handles backlogs)
  do {
    if (repeat === "monthly") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + stepDays);
  } while (d.getTime() <= nowReal);
  return d.getTime();
}

export function fmtDate(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
