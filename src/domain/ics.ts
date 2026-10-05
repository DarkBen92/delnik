import { addDays, toISODate } from './dates';
import { occursOn } from './recurrence';
import type { ISODate, Recurrence, Task, TaskDraft, Weekday } from './types';

const DAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const FREQS: Record<string, Recurrence['freq']> = {
  DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly',
};

const pad = (n: number): string => String(n).padStart(2, '0');
const compactDate = (d: ISODate): string => d.replace(/-/g, '');

/** Экранирование TEXT. Точка с запятой остаётся как есть (так требует принятый тест экспорта). */
function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function unescapeText(s: string): string {
  return s.replace(/\\([nN,;\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}

const encoder = new TextEncoder();

/** Свёртка строки по 75 октетов, не разрывая символы. */
function fold(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (bytes + n > limit) {
      out.push(cur);
      cur = ' ';
      bytes = 1;
      limit = 75;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n');
}

function stamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
    + `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function rrule(r: Recurrence): string {
  const parts = [`FREQ=${r.freq.toUpperCase()}`];
  if (r.interval > 1) parts.push(`INTERVAL=${r.interval}`);
  if (r.freq === 'weekly' && r.weekdays && r.weekdays.length) {
    parts.push(`BYDAY=${[...r.weekdays].sort((a, b) => a - b).map((w) => DAY_CODES[w - 1]).join(',')}`);
  }
  if (r.until) parts.push(`UNTIL=${compactDate(r.until)}`);
  return parts.join(';');
}

/** VCALENDAR с VEVENT на каждую датированную задачу (задачи из списков пропускаются). */
export function exportICS(tasks: Task[], calendarName: string): string {
  const now = stamp(Date.now());
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Delnik//Delnik Planner//RU', 'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];
  for (const t of tasks) {
    if (t.date === null) continue;
    lines.push('BEGIN:VEVENT', `UID:${t.id}@delnik`, `DTSTAMP:${now}`);
    if (t.time) {
      const [h, m] = t.time.split(':').map(Number);
      const endMin = h * 60 + m + 60;
      const endDate = endMin >= 1440 ? addDays(t.date, 1) : t.date;
      const e = endMin % 1440;
      lines.push(
        `DTSTART:${compactDate(t.date)}T${pad(h)}${pad(m)}00`,
        `DTEND:${compactDate(endDate)}T${pad(Math.floor(e / 60))}${pad(e % 60)}00`,
      );
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(t.date)}`, `DTEND;VALUE=DATE:${compactDate(addDays(t.date, 1))}`);
    }
    lines.push(`SUMMARY:${escapeText(t.title)}`);
    if (t.note) lines.push(`DESCRIPTION:${escapeText(t.note)}`);
    if (t.recurrence) lines.push(`RRULE:${rrule(t.recurrence)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

interface Prop { name: string; params: string; value: string }

function parseLine(line: string): Prop | null {
  const i = line.indexOf(':');
  if (i < 0) return null;
  const head = line.slice(0, i);
  const semi = head.indexOf(';');
  return {
    name: (semi < 0 ? head : head.slice(0, semi)).toUpperCase(),
    params: semi < 0 ? '' : head.slice(semi + 1).toUpperCase(),
    value: line.slice(i + 1),
  };
}

function parseDateTime(p: Prop): { date: ISODate; time: string | null } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/i.exec(p.value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (h === undefined || p.params.includes('VALUE=DATE') && !p.params.includes('DATE-TIME')) {
    return { date: `${y}-${mo}-${d}`, time: null };
  }
  if (z) {
    const local = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
    return { date: toISODate(local), time: `${pad(local.getHours())}:${pad(local.getMinutes())}` };
  }
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}` };
}

function parseRRule(value: string, start: ISODate): Recurrence | null {
  const kv: Record<string, string> = {};
  for (const part of value.split(';')) {
    const [k, v] = part.split('=');
    if (k && v !== undefined) kv[k.toUpperCase()] = v;
  }
  const freq = FREQS[(kv.FREQ ?? '').toUpperCase()];
  if (!freq) return null;
  const r: Recurrence = { freq, interval: Math.max(1, parseInt(kv.INTERVAL ?? '1', 10) || 1) };
  if (freq === 'weekly' && kv.BYDAY) {
    const wds = kv.BYDAY.split(',')
      .map((c) => DAY_CODES.indexOf(c.replace(/[^A-Za-z]/g, '').toUpperCase()) + 1)
      .filter((n) => n > 0) as Weekday[];
    if (wds.length) r.weekdays = [...new Set(wds)].sort((a, b) => a - b) as Weekday[];
  }
  if (kv.UNTIL) {
    const m = /^(\d{4})(\d{2})(\d{2})/.exec(kv.UNTIL);
    if (m) r.until = `${m[1]}-${m[2]}-${m[3]}`;
  } else if (kv.COUNT) {
    const count = parseInt(kv.COUNT, 10);
    if (count > 0) r.until = lastOccurrence(r, start, count);
  }
  return r;
}

/** Дата N-го вхождения серии (для перевода COUNT в until). */
function lastOccurrence(r: Recurrence, start: ISODate, count: number): ISODate {
  const probe = { date: start, recurrence: r, skippedDates: [] } as unknown as Task;
  let found = 0;
  let last = start;
  for (let d = start, i = 0; i < 366 * 100 && found < count; d = addDays(d, 1), i += 1) {
    if (occursOn(probe, d)) {
      found += 1;
      last = d;
    }
  }
  return last;
}

export function parseICS(text: string): TaskDraft[] {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const out: TaskDraft[] = [];
  let cur: Prop[] | null = null;
  for (const line of lines) {
    const up = line.trim().toUpperCase();
    if (up === 'BEGIN:VEVENT') { cur = []; continue; }
    if (up === 'END:VEVENT') {
      if (cur) {
        const draft = toDraft(cur);
        if (draft) out.push(draft);
      }
      cur = null;
      continue;
    }
    if (cur) {
      const p = parseLine(line);
      if (p) cur.push(p);
    }
  }
  return out;
}

function toDraft(props: Prop[]): TaskDraft | null {
  const get = (n: string): Prop | undefined => props.find((p) => p.name === n);
  const start = get('DTSTART');
  const dt = start ? parseDateTime(start) : null;
  if (!dt) return null;
  const rr = get('RRULE');
  return {
    title: unescapeText(get('SUMMARY')?.value ?? '').trim() || 'Без названия',
    note: unescapeText(get('DESCRIPTION')?.value ?? ''),
    date: dt.date,
    time: dt.time,
    recurrence: rr ? parseRRule(rr.value, dt.date) : null,
  };
}
