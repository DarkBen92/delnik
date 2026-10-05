import { screen, within } from '@testing-library/react';

export const day = (name: RegExp) => screen.getByRole('region', { name });
export const monday = () => day(/понедельник, 5 октября 2026/);
export const newTaskIn = (el: HTMLElement) => within(el).getByRole('textbox', { name: 'Новая задача' });

export function freezeToday() {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 5, 12, 0)); // пн 5 октября 2026
}
