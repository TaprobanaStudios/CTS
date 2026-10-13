// Every date and time in the app is Sri Lankan local time, whatever the browser's own time zone is.
export const SRI_LANKA_TIME_ZONE = "Asia/Colombo";

// Today's calendar date in Sri Lanka as YYYY-MM-DD (the format date inputs and the API use)
export const todayInSriLanka = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: SRI_LANKA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

// The current month in Sri Lanka: "2026-10" to match dates against, and "October 2026" to show
export const currentMonthInSriLanka = () => ({
  prefix: todayInSriLanka().slice(0, 7),
  label: new Intl.DateTimeFormat("en-US", {
    timeZone: SRI_LANKA_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date()),
});

// The backend sends dates ("2026-10-13") and date-times ("2026-10-13T23:20:05.123") that are
// already Sri Lankan wall-clock values with no zone attached. Reading them as UTC and
// formatting them as UTC shows exactly what was stored, on any device.
const asUtc = (value: string) => new Date(value.length <= 10 ? `${value}T00:00:00Z` : `${value.slice(0, 19)}Z`);

const format = (value: string | null | undefined, options: Intl.DateTimeFormatOptions) =>
  value ? new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(asUtc(value)) : "-";

// "Oct 13, 2026"
export const formatDate = (value: string | null | undefined) =>
  format(value, { year: "numeric", month: "short", day: "numeric" });

// "Oct 13"
export const formatDayMonth = (value: string | null | undefined) =>
  format(value, { month: "short", day: "numeric" });

// "Oct 13, 2026, 11:20 PM"
export const formatDateTime = (value: string | null | undefined) =>
  format(value, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
