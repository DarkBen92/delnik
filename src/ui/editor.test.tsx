import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { STORAGE_KEY, seed, task } from './testSeed';
import { day, freezeToday, monday } from './testUtil';

beforeEach(freezeToday);
afterEach(() => vi.useRealTimers());

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!).tasks as { id: string; [k: string]: unknown }[];

async function openTask(title: string, where: HTMLElement = monday()) {
  const user = userEvent.setup();
  await user.click(within(where).getByRole('button', { name: `Открыть задачу «${title}»` }));
  return { user, dialog: screen.getByRole('dialog', { name: 'Задача' }) };
}

describe('редактор задачи', () => {
  it('меняет название и заметку, Esc закрывает', async () => {
    seed([task({ id: 'a', title: 'Черновик' })]);
    render(<App />);
    const { user, dialog } = await openTask('Черновик');
    const title = within(dialog).getByRole('textbox', { name: 'Название' });
    await user.clear(title);
    await user.type(title, 'Чистовик');
    await user.type(within(dialog).getByRole('textbox', { name: 'Заметка' }), 'подробности');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(monday()).getByRole('checkbox', { name: 'Чистовик' })).toBeInTheDocument();
    expect(stored()[0]).toMatchObject({ title: 'Чистовик', note: 'подробности' });
  });

  it('удаляет обычную задачу', async () => {
    seed([task({ title: 'Лишнее' })]);
    render(<App />);
    const { user, dialog } = await openTask('Лишнее');
    await user.click(within(dialog).getByRole('button', { name: 'Удалить' }));
    expect(within(monday()).queryByRole('checkbox', { name: 'Лишнее' })).not.toBeInTheDocument();
  });

  it('отмечает выполнение из редактора', async () => {
    seed([task({ title: 'Дело' })]);
    render(<App />);
    const { user, dialog } = await openTask('Дело');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Выполнено' }));
    expect(within(monday()).getByRole('checkbox', { name: 'Дело' })).toHaveAttribute('aria-checked', 'true');
  });

  it('красит задачу', async () => {
    seed([task({ id: 'c', title: 'Важное' })]);
    render(<App />);
    const { user, dialog } = await openTask('Важное');
    await user.click(within(dialog).getByRole('button', { name: 'Цвет' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Красный' }));
    expect(stored()[0].color).toBe('red');
  });

  it('ставит повтор «По будням» и выполняет одно вхождение', async () => {
    seed([task({ id: 'r', title: 'Стендап' })]);
    render(<App />);
    const { user, dialog } = await openTask('Стендап');
    await user.click(within(dialog).getByRole('button', { name: 'Повтор' }));
    await user.click(within(dialog).getByRole('radio', { name: 'По будням' }));
    expect(within(dialog).getByText('По будням', { selector: '.pop-hint' })).toBeInTheDocument();
    await user.keyboard('{Escape}{Escape}');
    const fri = day(/пятница, 9 октября 2026/);
    expect(within(fri).getByRole('checkbox', { name: 'Стендап' })).toBeInTheDocument();
    expect(within(day(/суббота, 10 октября 2026/)).queryByRole('checkbox', { name: 'Стендап' })).not.toBeInTheDocument();
    await user.click(within(fri).getByRole('checkbox', { name: 'Стендап' }));
    expect(within(fri).getByRole('checkbox', { name: 'Стендап' })).toHaveAttribute('aria-checked', 'true');
    expect(within(day(/четверг, 8 октября 2026/)).getByRole('checkbox', { name: 'Стендап' })).toHaveAttribute('aria-checked', 'false');
  });

  it('настраивает повтор по дням недели с интервалом', async () => {
    seed([task({ id: 'r', title: 'Бассейн' })]);
    render(<App />);
    const { user, dialog } = await openTask('Бассейн');
    await user.click(within(dialog).getByRole('button', { name: 'Повтор' }));
    await user.click(within(dialog).getByRole('radio', { name: /Каждую неделю/ }));
    await user.click(within(dialog).getByRole('button', { name: 'ср' }));
    expect(stored()[0].recurrence).toEqual({ freq: 'weekly', interval: 1, until: null, weekdays: [1, 3] });
    expect(within(dialog).getByText('Каждую неделю: пн, ср', { selector: '.pop-hint' })).toBeInTheDocument();
  });

  it('удаляет одно вхождение или всю серию', async () => {
    seed([task({ id: 'r', title: 'Зарядка', recurrence: { freq: 'daily', interval: 1 } })]);
    render(<App />);
    let { user, dialog } = await openTask('Зарядка', day(/вторник, 6 октября 2026/));
    await user.click(within(dialog).getByRole('button', { name: 'Удалить' }));
    await user.click(within(dialog).getByRole('button', { name: 'Только это' }));
    expect(within(day(/вторник, 6 октября 2026/)).queryByRole('checkbox', { name: 'Зарядка' })).not.toBeInTheDocument();
    expect(within(day(/среда, 7 октября 2026/)).getByRole('checkbox', { name: 'Зарядка' })).toBeInTheDocument();
    ({ user, dialog } = await openTask('Зарядка', day(/среда, 7 октября 2026/)));
    await user.click(within(dialog).getByRole('button', { name: 'Удалить' }));
    await user.click(within(dialog).getByRole('button', { name: 'Всю серию' }));
    expect(screen.queryByRole('checkbox', { name: 'Зарядка' })).not.toBeInTheDocument();
  });

  it('ставит время с напоминанием', async () => {
    seed([task({ id: 't', title: 'Созвон' })]);
    render(<App />);
    const { user, dialog } = await openTask('Созвон');
    await user.click(within(dialog).getByRole('button', { name: 'Напоминание' }));
    await user.click(within(dialog).getByRole('button', { name: 'Час больше' }));
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Напоминание' }), '15');
    await user.click(within(dialog).getByRole('button', { name: 'Готово' }));
    expect(stored()[0]).toMatchObject({ time: '10:00', reminder: 15 });
    expect(within(monday()).getByText('10:00')).toBeInTheDocument();
  });

  it('добавляет и отмечает подзадачи', async () => {
    seed([task({ id: 's', title: 'Переезд' })]);
    render(<App />);
    const { user, dialog } = await openTask('Переезд');
    await user.type(within(dialog).getByRole('textbox', { name: 'Новая подзадача' }), 'Коробки{Enter}');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Коробки' }));
    expect(stored()[0].subtasks).toMatchObject([{ title: 'Коробки', done: true }]);
  });

  it('переносит через меню «Ещё» и выбор даты', async () => {
    seed([task({ id: 'm', title: 'Отчёт' })]);
    render(<App />);
    let { user, dialog } = await openTask('Отчёт');
    await user.click(within(dialog).getByRole('button', { name: 'Ещё' }));
    await user.click(within(dialog).getByRole('button', { name: /На завтра/ }));
    expect(within(day(/вторник, 6 октября 2026/)).getByRole('checkbox', { name: 'Отчёт' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Дата' }));
    await user.click(within(dialog).getByRole('button', { name: 'пятница, 9 октября 2026' }));
    expect(within(day(/пятница, 9 октября 2026/)).getByRole('checkbox', { name: 'Отчёт' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Дата' }));
    await user.click(within(dialog).getByRole('button', { name: /В «Когда-нибудь»/ }));
    expect(within(screen.getByRole('region', { name: 'Когда-нибудь' })).getByRole('checkbox', { name: 'Отчёт' })).toBeInTheDocument();
    ({ dialog } = { dialog: screen.getByRole('dialog', { name: 'Задача' }) });
    expect(within(dialog).getByText(/Когда-нибудь/)).toBeInTheDocument();
  });

  it('дублирует задачу', async () => {
    seed([task({ id: 'd', title: 'Копия' })]);
    render(<App />);
    const { user, dialog } = await openTask('Копия');
    await user.click(within(dialog).getByRole('button', { name: 'Ещё' }));
    await user.click(within(dialog).getByRole('button', { name: /Дублировать/ }));
    expect(within(monday()).getAllByRole('checkbox', { name: 'Копия' })).toHaveLength(2);
  });

  it('прикрепляет файл', async () => {
    seed([task({ id: 'f', title: 'С файлом' })]);
    render(<App />);
    const { user, dialog } = await openTask('С файлом');
    await user.upload(within(dialog).getByLabelText('Добавить вложение'), new File(['привет'], 'план.txt', { type: 'text/plain' }));
    expect(await within(dialog).findByRole('button', { name: 'план.txt' })).toBeInTheDocument();
    expect(stored()[0].attachments).toMatchObject([{ name: 'план.txt', type: 'text/plain' }]);
  });
});
