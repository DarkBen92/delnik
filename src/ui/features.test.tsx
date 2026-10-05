import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { seed, task, STORAGE_KEY } from './testSeed';
import { encodeShare, snapshotCalendar } from '../domain/backup';
import { data as fixtureData } from '../domain/fixtures';

const day = (name: RegExp) => screen.getByRole('region', { name });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 5, 12, 0));
  location.hash = '';
});
afterEach(() => {
  vi.useRealTimers();
  location.hash = '';
});

describe('стикеры', () => {
  it('AC-12 стикер ставится и убирается', async () => {
    const user = userEvent.setup();
    render(<App />);
    const mon = day(/понедельник, 5 октября 2026/);
    await user.click(within(mon).getByRole('button', { name: 'Стикер на 5 октября' }));
    await user.click(screen.getByRole('button', { name: '🎉' }));
    expect(within(day(/понедельник, 5 октября 2026/)).getByText('🎉')).toBeInTheDocument();
    await user.click(within(day(/понедельник, 5 октября 2026/)).getByRole('button', { name: 'Стикер на 5 октября' }));
    await user.click(screen.getByRole('button', { name: 'Убрать' }));
    expect(within(day(/понедельник, 5 октября 2026/)).queryByText('🎉')).not.toBeInTheDocument();
  });
});

describe('итоги недели и хвосты', () => {
  it('AC-20 итоги показывают прогресс', async () => {
    seed([task({ id: 'a', title: 'А', done: true }), task({ id: 'b', title: 'Б' })]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Итоги' }));
    const dlg = screen.getByRole('dialog', { name: 'Итоги недели' });
    expect(within(dlg).getByRole('progressbar', { name: 'Выполнено за неделю' })).toHaveAttribute('aria-valuenow', '50');
    expect(within(dlg).getByText(/1 из 2/)).toBeInTheDocument();
    expect(within(dlg).getAllByTestId('stats-day')).toHaveLength(7);
  });

  it('AC-19 кнопка переносит хвосты на сегодня', async () => {
    seed([task({ id: 'a', title: 'Просрочено', date: '2026-10-02' })], { autoRollover: false });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Итоги' }));
    await user.click(screen.getByRole('button', { name: /Перенести хвосты на сегодня/ }));
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(within(day(/понедельник, 5 октября 2026/)).getByRole('checkbox', { name: 'Просрочено' })).toBeInTheDocument();
    expect(screen.getByText('Перенесено задач: 1')).toBeInTheDocument();
  });

  it('AC-19 автоперенос при загрузке пишет lastRolloverDate', async () => {
    seed([task({ id: 'a', title: 'Хвост', date: '2026-10-01' })], { autoRollover: true, lastRolloverDate: null });
    render(<App />);
    expect(within(day(/понедельник, 5 октября 2026/)).getByRole('checkbox', { name: 'Хвост' })).toBeInTheDocument();
    expect(screen.getByText('Перенесено задач: 1')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).settings.lastRolloverDate).toBe('2026-10-05');
  });

  it('AC-19 автоперенос не повторяется в тот же день', async () => {
    seed([task({ id: 'a', title: 'Хвост', date: '2026-10-01' })], { autoRollover: true, lastRolloverDate: '2026-10-05' });
    render(<App />);
    expect(screen.queryByRole('checkbox', { name: 'Хвост' })).not.toBeInTheDocument();
  });
});

describe('импорт по ссылке', () => {
  function shareHash(name: string) {
    const base = fixtureData([task({ id: 's1', title: 'Из ссылки' })]);
    const snap = snapshotCalendar({ ...base, calendars: [{ ...base.calendars[0], name }] }, 'cal');
    return `#share=${encodeShare(snap)}`;
  }

  it('AC-10 подтверждение, импорт, переключение и очистка hash', async () => {
    location.hash = shareHash('Семья');
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('Добавить календарь «Семья» (1 задач)?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByLabelText('Календарь')).toHaveDisplayValue('Семья');
    expect(screen.getByRole('checkbox', { name: 'Из ссылки' })).toBeInTheDocument();
    expect(location.hash).toBe('');
  });

  it('AC-10 отказ не добавляет календарь', async () => {
    location.hash = shareHash('Семья');
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.getByLabelText('Календарь')).not.toHaveDisplayValue('Семья');
    expect(location.hash).toBe('');
  });

  it('AC-10 битая ссылка показывает ошибку тостом', async () => {
    location.hash = '#share=!!!не-ссылка';
    render(<App />);
    expect(await screen.findByText(/Не удалось открыть ссылку/)).toBeInTheDocument();
  });
});

describe('горячие клавиши', () => {
  it('AC-22 ← → переключают неделю, T возвращает на сегодня', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('heading', { name: '12 – 18 октября 2026' })).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('heading', { name: '28 сентября – 4 октября 2026' })).toBeInTheDocument();
    await user.keyboard('t');
    expect(screen.getByRole('heading', { name: '5 – 11 октября 2026' })).toBeInTheDocument();
  });

  it('AC-22 «/» открывает поиск, «?» — справку, Esc закрывает', async () => {
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
  });

  it('AC-22 N фокусирует поле новой задачи сегодняшнего дня', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard('n');
    expect(within(day(/понедельник, 5 октября 2026/)).getByRole('textbox', { name: 'Новая задача' })).toHaveFocus();
  });

  it('AC-22 клавиши игнорируются при вводе в поле', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(within(day(/понедельник, 5 октября 2026/)).getByRole('textbox', { name: 'Новая задача' }), 't/?');
    expect(screen.getByRole('heading', { name: '5 – 11 октября 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('подсказки и пустые состояния', () => {
  it('AC-17 в поле новой задачи виден пример быстрого ввода', () => {
    render(<App />);
    const box = within(day(/понедельник, 5 октября 2026/)).getByRole('textbox', { name: 'Новая задача' });
    expect(box).toHaveAttribute('placeholder', 'Новая задача…');
    expect(box).toHaveAttribute('title', 'Например: завтра в 18:00 позвонить маме');
  });
  it('AC-14 поиск без результатов подсказывает по-русски', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Поиск' }));
    await user.type(screen.getByRole('searchbox'), 'ничегонет');
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });
});
