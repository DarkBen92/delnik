import type { ISODate, Recurrence, Task } from './types';

const NI = (): never => {
  throw new Error('not implemented');
};

/** Происходит ли задача в этот день (учитывает дату начала, until, skippedDates; для неповторяющейся — date === day). */
export function occursOn(_task: Task, _day: ISODate): boolean { return NI(); }
/** Все даты вхождений в [from, to] включительно, по возрастанию. */
export function occurrencesBetween(_task: Task, _from: ISODate, _to: ISODate): ISODate[] { return NI(); }
/** Человекочитаемое описание по-русски. */
export function describeRecurrence(_r: Recurrence, _start: ISODate): string { return NI(); }
