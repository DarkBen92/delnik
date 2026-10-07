import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { seed, task } from './testSeed';
import { day, freezeToday, monday, newTaskIn } from './testUtil';

beforeEach(freezeToday);
afterEach(() => vi.useRealTimers());

describe('неделя', () => {
  it('показывает месяц с номером недели и дни Пн–Вс, сегодня отмечено', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /Октябрь 2026, неделя 41/ })).toBeInTheDocument();
    expect(monday()).toHaveAttribute('aria-current', 'date');
    expect(within(monday()).getByText('5 окт.')).toBeInTheDocument();
    const names = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'));
    expect(names.slice(0, 7)).toEqual([
      'понедельник, 5 октября 2026', 'вторник, 6 октября 2026', 'среда, 7 октября 2026', 'четверг, 8 октября 2026',
      'пятница, 9 октября 2026', 'суббота, 10 октября 2026', 'воскресенье, 11 октября 2026',
    ]);
  });

  it('листает недели стрелками и возвращается ссылкой «сегодня»', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByRole('button', { name: 'сегодня' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Следующая неделя' }));
    expect(day(/понедельник, 12 октября 2026/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /неделя 42/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Предыдущая неделя' }));
    await user.click(screen.getByRole('button', { name: 'Предыдущая неделя' }));
    expect(day(/понедельник, 28 сентября 2026/)).toBeInTheDocument();
    // неделя 28.09–4.10: четверг 1 октября — значит «Октябрь»
    expect(screen.getByRole('heading', { level: 1, name: /Октябрь 2026, неделя 40/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'сегодня' }));
    expect(monday()).toHaveAttribute('aria-current', 'date');
  });

  it('добавляет задачу вводом на линейке, отмечает и помнит после перезагрузки', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    const input = newTaskIn(monday());
    await user.type(input, 'Купить хлеб{Enter}');
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    const box = within(monday()).getByRole('checkbox', { name: 'Купить хлеб' });
    expect(box).toHaveAttribute('aria-checked', 'false');
    await user.click(box);
    expect(within(monday()).getByRole('checkbox', { name: 'Купить хлеб' })).toHaveAttribute('aria-checked', 'true');
    unmount();
    render(<App />);
    expect(within(monday()).getByRole('checkbox', { name: 'Купить хлеб' })).toHaveAttribute('aria-checked', 'true');
  });

  it('клик по пустым линиям дня ставит курсор в строку ввода', async () => {
    const user = userEvent.setup();
    render(<App />);
    const body = monday().querySelector('.lined') as HTMLElement;
    await user.click(body);
    expect(newTaskIn(monday())).toHaveFocus();
  });

  it('быстрый ввод понимает дату, время и цвет по-русски', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(newTaskIn(monday()), 'завтра в 18:00 позвонить маме !синий{Enter}');
    const tue = day(/вторник, 6 октября 2026/);
    expect(within(tue).getByRole('checkbox', { name: 'позвонить маме' })).toBeInTheDocument();
    expect(within(tue).getByText('18:00')).toBeInTheDocument();
    expect(within(monday()).queryByRole('checkbox', { name: 'позвонить маме' })).not.toBeInTheDocument();
  });

  it('подписывает праздники РФ, но выходные выглядят как будни', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole('button', { name: 'Следующая неделя' }));
    const wed = day(/среда, 4 ноября 2026/);
    expect(within(wed).getByText('День народного единства')).toBeInTheDocument();
    expect(wed).toHaveClass('is-holiday');
    expect(day(/суббота, 7 ноября 2026/)).not.toHaveClass('is-holiday');
    expect(within(day(/вторник, 3 ноября 2026/)).getByText('Сокращённый день')).toBeInTheDocument();
  });

  it('выполненная задача остаётся в дне зачёркнутой, даже если в старых данных её скрывали', async () => {
    seed([task({ title: 'Сделать' })], { showCompleted: false } as never);
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(monday()).getByRole('checkbox', { name: 'Сделать' }));
    const box = within(monday()).getByRole('checkbox', { name: 'Сделать' });
    expect(box).toHaveAttribute('aria-checked', 'true');
    expect(box.closest('li')).toHaveClass('is-done');
  });

  it('скрывает выполненные, если так настроено', () => {
    seed([task({ title: 'Сделано', done: true }), task({ title: 'Не сделано' })], { hideCompleted: true });
    render(<App />);
    expect(within(monday()).queryByRole('checkbox', { name: 'Сделано' })).not.toBeInTheDocument();
    expect(within(monday()).getByRole('checkbox', { name: 'Не сделано' })).toBeInTheDocument();
  });
});

describe('списки «Когда-нибудь»', () => {
  it('добавляет задачу в список и создаёт новый список из заготовки', async () => {
    const user = userEvent.setup();
    render(<App />);
    const list = screen.getByRole('region', { name: 'Когда-нибудь' });
    await user.type(newTaskIn(list), 'Прочитать книгу{Enter}');
    expect(within(list).getByRole('checkbox', { name: 'Прочитать книгу' })).toBeInTheDocument();
    const ghost = screen.getAllByRole('region', { name: 'Новый список' })[0];
    await user.type(within(ghost).getByRole('textbox', { name: 'Название нового списка' }), 'Фильмы{Enter}');
    const films = screen.getByRole('region', { name: 'Фильмы' });
    await user.type(newTaskIn(films), 'Сталкер{Enter}');
    expect(within(films).getByRole('checkbox', { name: 'Сталкер' })).toBeInTheDocument();
  });

  it('переименовывает список прямо в заголовке', async () => {
    const user = userEvent.setup();
    render(<App />);
    const title = within(screen.getByRole('region', { name: 'Когда-нибудь' })).getByRole('textbox', { name: 'Название списка' });
    await user.clear(title);
    await user.type(title, 'Потом{Enter}');
    expect(screen.getByRole('region', { name: 'Потом' })).toBeInTheDocument();
  });
});

describe('месяц и поиск', () => {
  it('клик по заголовку открывает месяц, клик по неделе переходит на неё', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Октябрь 2026/ }));
    const panel = screen.getByRole('dialog', { name: 'Календарь' });
    await user.click(within(panel).getByRole('button', { name: 'Неделя 19 – 25 октября 2026' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(day(/понедельник, 19 октября 2026/)).toBeInTheDocument();
  });

  it('находит задачу и открывает её', async () => {
    seed([task({ title: 'Записаться к врачу', date: '2026-10-21' })]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Поиск' }));
    await user.type(screen.getByRole('searchbox'), 'врач');
    const results = screen.getByRole('list', { name: 'Результаты поиска' });
    expect(results).toHaveTextContent('Записаться к врачу');
    expect(results).toHaveTextContent('21 октября');
    await user.click(within(results).getByRole('button'));
    expect(screen.getByRole('dialog', { name: 'Задача' })).toBeInTheDocument();
    expect(day(/среда, 21 октября 2026/)).toBeInTheDocument();
  });

  it('пустой поиск подсказывает по-русски', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Поиск' }));
    await user.type(screen.getByRole('searchbox'), 'ничегонет');
    expect(screen.getByText(/Ничего не нашлось/)).toBeInTheDocument();
  });
});
