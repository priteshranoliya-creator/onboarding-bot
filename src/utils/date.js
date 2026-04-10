const IST_OFFSET = 5.5 * 60 * 60 * 1000;

function nowIST() {
  return new Date(Date.now() + IST_OFFSET);
}

function toIST(date) {
  return new Date(date.getTime() + IST_OFFSET);
}

/** Parse "DD/MM/YYYY" → Date (midnight UTC) */
function parseDDMMYYYY(str) {
  const [d, m, y] = str.split('/').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Format Date → "Tuesday, 22 April 2026" */
function formatLong(date) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/** Format Date → "22/04/2026" */
function formatShort(date) {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

/** Check if a date string (DD/MM/YYYY) is tomorrow in IST */
function isTomorrowIST(dateStr) {
  const target = parseDDMMYYYY(dateStr);
  const now = nowIST();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return target.getTime() === tomorrow.getTime();
}

/** Check if a date string (DD/MM/YYYY) is today in IST */
function isTodayIST(dateStr) {
  const target = parseDDMMYYYY(dateStr);
  const now = nowIST();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return target.getTime() === today.getTime();
}

/** Check if a date is within the next N days from today (IST) */
function isWithinDaysIST(dateStr, days) {
  const target = parseDDMMYYYY(dateStr);
  const now = nowIST();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const future = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
  return target >= today && target <= future;
}

/** Days between today (IST) and a date */
function daysFromTodayIST(dateStr) {
  const target = parseDDMMYYYY(dateStr);
  const now = nowIST();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

module.exports = {
  nowIST,
  toIST,
  parseDDMMYYYY,
  formatLong,
  formatShort,
  isTomorrowIST,
  isTodayIST,
  isWithinDaysIST,
  daysFromTodayIST,
};
