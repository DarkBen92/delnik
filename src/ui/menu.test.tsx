import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { STORAGE_KEY, seed, task } from './testSeed';
import { freezeToday, monday } from './testUtil';

beforeEach(freezeToday);
afterEach(() => vi.useRealTimers());

async function openMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Меню' }));
  return { user, menu: screen.getByRole('dialog', { name: 'Меню' }) };
}

describe('меню', () => {
  it('переключает тему и сохраняет свою палитру', async () => {
    render(<App />);
    const { user, menu } = await openMenu();
    await user.click(within(menu).getByRole('radio', { name: 'Тёмная' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    await user.click(within(menu).getByRole('radio', { name: 'Светлая' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('свой цвет в тёмной теме не трогает светлую и не перекрашивает фон', async () => {
    render(<App />);
    const { user, menu } = await openMenu();
    await user.click(within(menu).getByRole('radio', { name: 'Тёмная' }));
    const accent = within(menu).getByLabelText('Цвет: Акцент');
    expect(within(menu).getByLabelText('Цвет: Фон')).toHaveValue('#111111');
    fireEvent.input(accent, { target: { value: '#8b5e3c' } });
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY)!).settings;
    expect(s.customThemeDark).toEqual({ accent: '#8b5e3c' });
    expect(s.customTheme).toBeNull();
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--accent')).toBe('#8b5e3c');
    expect(root.style.getPropertyValue('--bg')).toBe('');
    await user.click(within(menu).getByRole('radio', { name: 'Светлая' }));
    expect(root.style.getPropertyValue('--accent')).toBe('');
    expect(within(menu).getByLabelText('Цвет: Фон')).toHaveValue('#ffffff');
  });

  it('светлая палитра из старых данных не ломает тёмную тему', () => {
    seed([], { theme: 'dark', customTheme: { accent: '#8b5e3c', background: '#ffffff', paper: '#e3e6fd', text: '#000000' } });
    render(<App />);
    const root = document.documentElement;
    expect(root.dataset.theme).toBe('dark');
    expect(root.style.getPropertyValue('--bg')).toBe('');
    expect(root.style.getPropertyValue('--text')).toBe('');
  });

  it('создаёт календарь, переключается и не даёт удалить последний', async () => {
    seed([task({ title: 'Личное дело' })]);
    render(<App />);
    let { user, menu } = await openMenu();
    expect(within(menu).queryByRole('button', { name: /Удалить календарь/ })).not.toBeInTheDocument();
    await user.type(within(menu).getByRole('textbox', { name: 'Название нового календаря' }), 'Работа');
    await user.click(within(menu).getByRole('button', { name: 'Добавить' }));
    expect(within(monday()).queryByRole('checkbox', { name: 'Личное дело' })).not.toBeInTheDocument();
    expect(screen.getByText('Работа', { selector: '.cal-name' })).toBeInTheDocument();
    await user.click(within(menu).getByRole('radio', { name: 'Открыть календарь «Личное»' }));
    expect(within(monday()).getByRole('checkbox', { name: 'Личное дело' })).toBeInTheDocument();
    ({ menu } = { menu: screen.getByRole('dialog', { name: 'Меню' }) });
    expect(within(menu).getAllByRole('button', { name: /Удалить календарь/ })).toHaveLength(2);
  });

  it('переключатели поведения сохраняются', async () => {
    render(<App />);
    const { user, menu } = await openMenu();
    await user.click(within(menu).getByRole('checkbox', { name: 'Переносить невыполненные на сегодня' }));
    await user.click(within(menu).getByRole('checkbox', { name: 'Праздники и сокращённые дни РФ' }));
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY)!).settings;
    expect(s).toMatchObject({ autoRollover: true, showHolidays: false });
  });

  it('импортирует .ics в активный календарь', async () => {
    render(<App />);
    const { user, menu } = await openMenu();
    const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261007\r\nSUMMARY:Из Google\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
    await user.upload(within(menu).getByLabelText('Импорт .ics'), new File([ics], 'cal.ics', { type: 'text/calendar' }));
    expect(await screen.findByText('Импортировано 1 событие')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Из Google' })).toBeInTheDocument();
  });

  it('делает ссылку на копию календаря', async () => {
    seed([task({ title: 'Для семьи' })]);
    render(<App />);
    const { user, menu } = await openMenu();
    await user.click(within(menu).getByRole('button', { name: 'Поделиться ссылкой' }));
    expect((within(menu).getByRole('textbox', { name: 'Ссылка на копию календаря' }) as HTMLInputElement).value).toMatch(/#share=[A-Za-z0-9_-]+$/);
  });

  it('открывает итоги, клавиши и месяц с плиток', async () => {
    seed([task({ title: 'А', done: true }), task({ title: 'Б' })]);
    render(<App />);
    let { user, menu } = await openMenu();
    await user.click(within(menu).getByRole('button', { name: /Итоги/ }));
    const stats = screen.getByRole('dialog', { name: 'Итоги недели' });
    expect(within(stats).getByRole('progressbar', { name: 'Выполнено за неделю' })).toHaveAttribute('aria-valuenow', '50');
    expect(within(stats).getByText('Выполнено 1 из 2')).toBeInTheDocument();
    expect(within(stats).getAllByTestId('stats-day')).toHaveLength(7);
    await user.click(within(stats).getByRole('button', { name: 'Закрыть' }));
    ({ user, menu } = await openMenu());
    await user.click(within(menu).getByRole('button', { name: /Клавиши/ }));
    expect(screen.getByRole('dialog', { name: 'Горячие клавиши' })).toBeInTheDocument();
  });
});
