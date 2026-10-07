import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { STORAGE_KEY, seed, task } from './testSeed';
import { day, freezeToday, monday } from './testUtil';

beforeEach(freezeToday);
afterEach(() => vi.useRealTimers());

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!).tasks as { id: string; [k: string]: unknown }[];
const quick = () => screen.getByRole('textbox', { name: 'Быстрый ввод задачи' });

describe('быстрый ввод', () => {
  it('показывает, как понял запись, и добавляет задачу на нужный день', async () => {
    seed();
    const user = userEvent.setup();
    render(<App />);
    await user.type(quick(), 'завтра в 18:00 позвонить маме');
    const chips = screen.getByLabelText('Как поняли запись');
    expect(chips).toHaveTextContent('Завтра');
    expect(chips).toHaveTextContent('18:00');
    await user.keyboard('{Enter}');
    expect(quick()).toHaveValue('');
    expect(within(day(/вторник, 6 октября 2026/)).getByRole('checkbox', { name: 'позвонить маме' })).toBeInTheDocument();
    expect(stored()[0]).toMatchObject({ title: 'позвонить маме', date: '2026-10-06', time: '18:00' });
  });

  it('без даты в тексте кладёт на сегодня, кнопка «+» тоже добавляет', async () => {
    seed();
    const user = userEvent.setup();
    render(<App />);
    await user.type(quick(), 'Купить хлеб');
    await user.click(screen.getByRole('button', { name: 'Добавить задачу' }));
    expect(within(monday()).getByRole('checkbox', { name: 'Купить хлеб' })).toBeInTheDocument();
  });

  it('переключатель «Куда добавить» отправляет в «Когда-нибудь»', async () => {
    seed();
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Куда добавить' })).getByRole('radio', { name: 'Когда-нибудь' }));
    await user.type(quick(), 'Прочитать книгу{Enter}');
    expect(within(screen.getByRole('region', { name: 'Когда-нибудь' })).getByRole('checkbox', { name: 'Прочитать книгу' })).toBeInTheDocument();
    expect(screen.getByText('Добавлено в «Когда-нибудь»', { selector: '.toast span' })).toBeInTheDocument();
  });

  it('сообщает, когда задача ушла за пределы показанной недели', async () => {
    seed();
    const user = userEvent.setup();
    render(<App />);
    await user.type(quick(), 'через неделю отчёт{Enter}');
    expect(screen.getByText(/Добавлено: Пн, 12 окт\./, { selector: '.toast span' })).toBeInTheDocument();
  });
});

describe('хвосты, счётчики и прогресс', () => {
  it('плашка хвостов переносит невыполненное на сегодня', async () => {
    seed([
      task({ id: 'old', title: 'Корм коту', date: '2026-10-01' }),
      task({ id: 'ok', title: 'Сделано', date: '2026-10-02', done: true }),
    ]);
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/1 хвост с прошлых дней/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Перенести на сегодня' }));
    expect(within(monday()).getByRole('checkbox', { name: 'Корм коту' })).toBeInTheDocument();
    expect(screen.queryByText(/хвост/)).not.toBeInTheDocument();
  });

  it('в прошедшем дне отмечает невыполненную задачу как хвост', async () => {
    seed([task({ id: 'old', title: 'Корм коту', date: '2026-10-01' })]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Предыдущая неделя' }));
    const row = within(day(/четверг, 1 октября 2026/)).getByRole('checkbox', { name: 'Корм коту' }).closest('li');
    expect(row).toHaveClass('is-tail');
  });

  it('показывает счётчик дня и прогресс недели', () => {
    seed([
      task({ id: 'a', title: 'Первая', done: true }),
      task({ id: 'b', title: 'Вторая' }),
      task({ id: 'c', title: 'Третья', date: '2026-10-07' }),
    ]);
    render(<App />);
    expect(within(monday()).getByTitle('Сделано 1 из 2')).toHaveTextContent('1/2');
    expect(screen.getByText('Неделя: сделано 1 из 3')).toBeInTheDocument();
  });

  it('лента дней: семь дней, сегодня отмечено', () => {
    seed();
    render(<App />);
    const strip = screen.getByRole('navigation', { name: 'Дни недели' });
    const days = within(strip).getAllByRole('button');
    expect(days).toHaveLength(7);
    expect(days[0]).toHaveAttribute('aria-current', 'date');
    expect(days[0]).toHaveAccessibleName('К дню: понедельник, 5 октября 2026');
  });
});
