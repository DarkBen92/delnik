import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { STORAGE_KEY, seed, task } from './testSeed';
import { encodeShare, snapshotCalendar } from '../domain/backup';
import { data as fixtureData } from '../domain/fixtures';
import { day, freezeToday, monday, newTaskIn } from './testUtil';

beforeEach(() => { freezeToday(); location.hash = ''; });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); location.hash = ''; });

describe('стикеры', () => {
  it('ставит и убирает стикер на дне', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(monday()).getByRole('button', { name: 'Стикер на 5 октября' }));
    await user.click(screen.getByRole('button', { name: '🎉' }));
    expect(within(monday()).getByText('🎉')).toBeInTheDocument();
    await user.click(within(monday()).getByRole('button', { name: 'Стикер на 5 октября' }));
    await user.click(screen.getByRole('button', { name: 'Убрать' }));
    expect(within(monday()).queryByText('🎉')).not.toBeInTheDocument();
  });
});

describe('хвосты', () => {
  it('кнопка в итогах переносит просроченное на сегодня', async () => {
    seed([task({ id: 'a', title: 'Просрочено', date: '2026-10-02' })]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Меню' }));
    await user.click(screen.getByRole('button', { name: /Итоги/ }));
    await user.click(screen.getByRole('button', { name: 'Перенести хвосты на сегодня (1)' }));
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(within(monday()).getByRole('checkbox', { name: 'Просрочено' })).toBeInTheDocument();
    expect(screen.getByText('Перенесено задач: 1')).toBeInTheDocument();
  });

  it('автоперенос при загрузке — один раз в день', () => {
    seed([task({ id: 'a', title: 'Хвост', date: '2026-10-01' })], { autoRollover: true, lastRolloverDate: null });
    const { unmount } = render(<App />);
    expect(within(monday()).getByRole('checkbox', { name: 'Хвост' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).settings.lastRolloverDate).toBe('2026-10-05');
    unmount();
    seed([task({ id: 'b', title: 'Новый хвост', date: '2026-10-01' })], { autoRollover: true, lastRolloverDate: '2026-10-05' });
    render(<App />);
    expect(screen.queryByRole('checkbox', { name: 'Новый хвост' })).not.toBeInTheDocument();
  });
});

describe('календарь по ссылке', () => {
  function shareHash(name: string) {
    const base = fixtureData([task({ id: 's1', title: 'Из ссылки' })]);
    return `#share=${encodeShare(snapshotCalendar({ ...base, calendars: [{ ...base.calendars[0], name }] }, 'cal'))}`;
  }

  it('спрашивает, добавляет и переключается на него', async () => {
    location.hash = shareHash('Семья');
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('Добавить календарь «Семья» (1 задача)?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByText('Семья', { selector: '.cal-name' })).toBeInTheDocument();
    expect(within(monday()).getByRole('checkbox', { name: 'Из ссылки' })).toBeInTheDocument();
    expect(location.hash).toBe('');
  });

  it('отмена ничего не добавляет, битая ссылка — сообщение', async () => {
    location.hash = shareHash('Семья');
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.queryByRole('checkbox', { name: 'Из ссылки' })).not.toBeInTheDocument();
    unmount();
    location.hash = '#share=!!!не-ссылка';
    render(<App />);
    expect(await screen.findByText(/Не удалось открыть ссылку/)).toBeInTheDocument();
  });
});

describe('горячие клавиши', () => {
  it('← → листают, T возвращает, M открывает месяц', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard('{ArrowRight}');
    expect(day(/понедельник, 12 октября 2026/)).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(day(/понедельник, 28 сентября 2026/)).toBeInTheDocument();
    await user.keyboard('t');
    expect(monday()).toHaveAttribute('aria-current', 'date');
    await user.keyboard('m');
    expect(screen.getByRole('dialog', { name: 'Календарь' })).toBeInTheDocument();
  });

  it('/ — поиск, ? — справка, Esc закрывает, N — ввод на сегодня', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard('/');
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    await user.keyboard('?');
    expect(screen.getByRole('dialog', { name: 'Горячие клавиши' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.keyboard('n');
    expect(newTaskIn(monday())).toHaveFocus();
  });

  it('не срабатывают, пока печатаешь задачу', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(newTaskIn(monday()), 't/?');
    expect(monday()).toHaveAttribute('aria-current', 'date');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('напоминания и фокус', () => {
  it('раз в 30 с показывает наступившее напоминание', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 9, 5, 8, 59, 40));
    seed([task({ id: 'r', title: 'Лекарство', time: '09:00', reminder: 0 })]);
    render(<App />);
    await act(async () => { vi.setSystemTime(new Date(2026, 9, 5, 9, 0, 10)); vi.advanceTimersByTime(30_000); });
    expect(screen.getByText(/Напоминание: Лекарство/, { selector: '.toast span' })).toBeInTheDocument();
  });

  it('работает без Notification в браузере', () => {
    vi.stubGlobal('Notification', undefined);
    expect(() => render(<App />)).not.toThrow();
  });

  it('фокус-таймер запускается из «Ещё»', async () => {
    seed([task({ id: 'f', title: 'Глубокая работа' })]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(monday()).getByRole('button', { name: 'Открыть задачу «Глубокая работа»' }));
    const dialog = screen.getByRole('dialog', { name: 'Задача' });
    await user.click(within(dialog).getByRole('button', { name: 'Ещё' }));
    await user.click(within(dialog).getByRole('button', { name: /Фокус/ }));
    const widget = screen.getByRole('timer');
    expect(widget).toHaveTextContent('25:00');
    expect(widget).toHaveTextContent('Глубокая работа');
    await user.click(within(widget).getByRole('button', { name: 'Закрыть таймер' }));
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });
});
