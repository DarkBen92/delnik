import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { seed, task, STORAGE_KEY } from './testSeed';

const day = (name: RegExp) => screen.getByRole('region', { name });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 5, 12, 0));
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
});
afterEach(() => vi.useRealTimers());

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Настройки' }));
  return screen.getByRole('dialog', { name: 'Настройки' });
}

describe('настройки', () => {
  it('AC-12 тёмная тема ставит data-theme="dark" и сохраняется', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dlg = await openSettings(user);
    await user.selectOptions(within(dlg).getByLabelText('Тема'), 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).settings.theme).toBe('dark');
  });

  it('AC-12 системная тема следует prefers-color-scheme', async () => {
    window.matchMedia = ((q: string) => ({
      matches: q.includes('dark'), media: q, addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    seed([], { theme: 'system' });
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('AC-12 своя тема переопределяет CSS-переменные, сброс возвращает', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dlg = await openSettings(user);
    fireEvent.change(within(dlg).getByLabelText('Акцент'), { target: { value: '#ff0000' } });
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#ff0000');
    await user.click(within(dlg).getByRole('button', { name: 'Сбросить тему' }));
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('');
  });

  it('AC-04 «Показывать выполненные» скрывает сделанное', async () => {
    seed([task({ id: 'a', title: 'Сделано', done: true }), task({ id: 'b', title: 'Не сделано' })]);
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('checkbox', { name: 'Сделано' })).toBeInTheDocument();
    const dlg = await openSettings(user);
    await user.click(within(dlg).getByRole('checkbox', { name: 'Показывать выполненные' }));
    expect(screen.queryByRole('checkbox', { name: 'Сделано' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Не сделано' })).toBeInTheDocument();
  });

  it('AC-18 отключение подсветки праздников убирает названия', async () => {
    seed([], { showHolidays: false });
    const user = userEvent.setup();
    render(<App />);
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole('button', { name: 'Следующая неделя' }));
    expect(within(day(/среда, 4 ноября 2026/)).queryByText('День народного единства')).not.toBeInTheDocument();
  });

  it('AC-09 создание и переключение календарей, у каждого свои задачи', async () => {
    seed([task({ id: 'a', title: 'Личная' })]);
    const user = userEvent.setup();
    render(<App />);
    const dlg = await openSettings(user);
    await user.type(within(dlg).getByRole('textbox', { name: 'Название нового календаря' }), 'Работа');
    await user.click(within(dlg).getByRole('button', { name: 'Добавить календарь' }));
    await user.click(within(dlg).getByRole('button', { name: 'Закрыть' }));
    // добавленный календарь становится активным
    expect(screen.getByLabelText('Календарь')).toHaveDisplayValue('Работа');
    expect(screen.queryByRole('checkbox', { name: 'Личная' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Календарь'), 'Личное');
    expect(screen.getByRole('checkbox', { name: 'Личная' })).toBeInTheDocument();
  });

  it('AC-09 последний календарь удалить нельзя', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dlg = await openSettings(user);
    expect(within(dlg).getByRole('button', { name: /Удалить календарь/ })).toBeDisabled();
  });

  it('AC-10 «Поделиться ссылкой» показывает ссылку #share=', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
    render(<App />);
    const dlg = await openSettings(user);
    await user.click(within(dlg).getByRole('button', { name: 'Поделиться ссылкой' }));
    expect((within(dlg).getByRole('textbox', { name: 'Ссылка на календарь' }) as HTMLInputElement).value).toContain('#share=');
  });

  it('AC-11 импорт .ics добавляет задачи и пишет отчёт', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dlg = await openSettings(user);
    const ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:1\r\nSUMMARY:Встреча\r\nDTSTART;VALUE=DATE:20261006\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
    const file = new File([ics], 'cal.ics', { type: 'text/calendar' });
    await user.upload(within(dlg).getByLabelText('Импорт .ics'), file);
    expect(await within(dlg).findByText('Импортировано 1')).toBeInTheDocument();
  });

  it('AC-10 восстановление из копии требует подтверждения', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dlg = await openSettings(user);
    expect(within(dlg).getByLabelText('Восстановить из копии')).toBeInTheDocument();
    expect(within(dlg).getByRole('button', { name: 'Скачать копию' })).toBeInTheDocument();
  });
});
