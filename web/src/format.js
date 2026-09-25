// Display formatting that follows the design system's content rules (e.g. "Oct 5–7").

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(day) {
  const [y, m, d] = day.split('-').map(Number);
  return { y, m, d };
}

export function formatRange(start, end, withYear = false) {
  if (!start && !end) return null;
  if (start && !end) return `From ${formatRange(start, start, withYear)}`;
  if (!start && end) return `Until ${formatRange(end, end, withYear)}`;
  const a = parts(start);
  const b = parts(end);
  const year = withYear ? `, ${b.y}` : '';
  if (start === end) return `${MONTHS[a.m - 1]} ${a.d}${year}`;
  if (a.m === b.m && a.y === b.y) return `${MONTHS[a.m - 1]} ${a.d}–${b.d}${year}`;
  return `${MONTHS[a.m - 1]} ${a.d} – ${MONTHS[b.m - 1]} ${b.d}${year}`;
}

export function daysBetween(start, end) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
}

export function formatCreated(iso) {
  if (!iso || iso === 'seed') return 'seed';
  const date = new Date(iso);
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${time}`;
}
