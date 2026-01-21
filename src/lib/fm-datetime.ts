import type { FiscalDateTime } from "./fm-types";

export const buildRawFromIso = (iso: string): FiscalDateTime["raw"] | null => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
    hour: parsed.getUTCHours(),
    minutes: parsed.getUTCMinutes(),
    seconds: parsed.getUTCSeconds(),
    mseconds: Math.floor(parsed.getUTCMilliseconds() / 10),
  };
};
