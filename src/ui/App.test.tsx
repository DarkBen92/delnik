import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

const day = (name: RegExp) => screen.getByRole('region', { name });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 5, 12, 0)); // пн 5 октября 2026
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Дельник: недельный вид', () => {
  it('AC-01 shows Monday-first week in Russian with today marked', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '5 – 11 октября 2026' })).toBeInTheDocument();
    const mon = day(/понедельник, 5 октября 2026/);
    expect(mon).toHaveAttribute('aria-current', 'date');
    expect(day(/воскресенье, 11 октября 2026/)).not.toHaveAttribute('aria-current');
    const regions = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'));
    expect(regions.indexOf('понедельник, 5 октября 2026')).toBeLessThan(regions.indexOf('воскресенье, 11 октября 2026'));
  });

  it('AC-01 navigates weeks', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Следующая неделя' }));
    expect(screen.getByRole('heading', { name: '12 – 18 октября 2026' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Предыдущая неделя' }));
    await user.click(screen.getByRole('button', { name: 'Предыдущая неделя' }));
    expect(screen.getByRole('heading', { name: '28 сентября – 4 октября 2026' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Сегодня' }));
    expect(screen.getByRole('heading', { name: '5 – 11 октября 2026' })).toBeInTheDocument();
  });

  it('AC-03/04/16 adds a task, completes it and keeps it after reload', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    const mon = day(/понедельник, 5 октября 2026/);
    await user.type(within(mon).getByRole('textbox', { name: 'Новая задача' }), 'Купить хлеб{Enter}');
    const box = within(mon).getByRole('checkbox', { name: 'Купить хлеб' });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(within(mon).getByRole('checkbox', { name: 'Купить хлеб' })).toBeChecked();
    unmount();
    render(<App />);
    expect(within(day(/понедельник, 5 октября 2026/)).getByRole('checkbox', { name: 'Купить хлеб' })).toBeChecked();
  });

  it('AC-17 quick input understands Russian dates and times', async () => {
    const user = userEvent.setup();
    render(<App />);
    const mon = day(/понедельник, 5 октября 2026/);
    await user.type(within(mon).getByRole('textbox', { name: 'Новая задача' }), 'завтра в 18:00 позвонить маме{Enter}');
    const tue = day(/вторник, 6 октября 2026/);
    expect(within(tue).getByRole('checkbox', { name: 'позвонить маме' })).toBeInTheDocument();
    expect(within(tue).getByText('18:00')).toBeInTheDocument();
    expect(within(mon).queryByRole('checkbox', { name: 'позвонить маме' })).not.toBeInTheDocument();
  });

  it('AC-03 adds tasks to the someday list', async () => {
    const user = userEvent.setup();
    render(<App />);
    const list = screen.getByRole('region', { name: 'Когда-нибудь' });
    await user.type(within(list).getByRole('textbox', { name: 'Новая задача' }), 'Прочитать книгу{Enter}');
    expect(within(list).getByRole('checkbox', { name: 'Прочитать книгу' })).toBeInTheDocument();
  });

  it('AC-03/06 opens the editor, edits and deletes a task', async () => {
    const user = userEvent.setup();
    render(<App />);
    const mon = day(/понедельник, 5 октября 2026/);
    await user.type(within(mon).getByRole('textbox', { name: 'Новая задача' }), 'Черновик{Enter}');
    await user.click(within(mon).getByRole('button', { name: 'Открыть задачу «Черновик»' }));
    const dialog = screen.getByRole('dialog');
    const title = within(dialog).getByRole('textbox', { name: 'Название' });
    await user.clear(title);
    await user.type(title, 'Чистовик');
    await user.type(within(dialog).getByRole('textbox', { name: 'Заметка' }), 'подробности');
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    expect(within(mon).getByRole('checkbox', { name: 'Чистовик' })).toBeInTheDocument();
    await user.click(within(mon).getByRole('button', { name: 'Открыть задачу «Чистовик»' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }));
    expect(within(mon).queryByRole('checkbox', { name: 'Чистовик' })).not.toBeInTheDocument();
  });

  it('AC-18 highlights Russian public holidays', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole('button', { name: 'Следующая неделя' }));
    expect(within(day(/среда, 4 ноября 2026/)).getByText('День народного единства')).toBeInTheDocument();
  });

  it('AC-02 switches to month and day views', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Месяц' }));
    expect(screen.getByRole('heading', { name: 'Октябрь 2026' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'День' }));
    expect(screen.getByRole('heading', { name: 'понедельник, 5 октября 2026' })).toBeInTheDocument();
  });

  it('AC-14 finds tasks via search', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(within(day(/среда, 7 октября 2026/)).getByRole('textbox', { name: 'Новая задача' }), 'Записаться к врачу{Enter}');
    await user.click(screen.getByRole('button', { name: 'Поиск' }));
    await user.type(screen.getByRole('searchbox'), 'врач');
    expect(screen.getByRole('list', { name: 'Результаты поиска' })).toHaveTextContent('Записаться к врачу');
    await act(async () => {});
  });
});
