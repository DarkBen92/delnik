import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

const day = (name: RegExp) => screen.getByRole('region', { name });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 5, 12, 0));
});
afterEach(() => vi.useRealTimers());

async function addAndOpen(user: ReturnType<typeof userEvent.setup>, title: string) {
  const mon = day(/понедельник, 5 октября 2026/);
  await user.type(within(mon).getByRole('textbox', { name: 'Новая задача' }), `${title}{Enter}`);
  await user.click(within(mon).getByRole('button', { name: `Открыть задачу «${title}»` }));
  return screen.getByRole('dialog');
}

describe('редактор задачи', () => {
  it('AC-07 повтор «дни» показывает превью и размножает задачу по дням', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await addAndOpen(user, 'Планёрка');
    await user.selectOptions(within(dialog).getByLabelText('Повтор'), 'daily');
    expect(within(dialog).getByTestId('recurrence-preview').textContent!.length).toBeGreaterThan(0);
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    expect(within(day(/вторник, 6 октября 2026/)).getByRole('checkbox', { name: 'Планёрка' })).toBeInTheDocument();
    expect(within(day(/суббота, 10 октября 2026/)).getByRole('checkbox', { name: 'Планёрка' })).toBeInTheDocument();
  });

  it('AC-07 для недель появляются чекбоксы дней недели', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await addAndOpen(user, 'Спорт');
    expect(within(dialog).queryByRole('checkbox', { name: 'ср' })).not.toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText('Повтор'), 'weekly');
    await user.click(within(dialog).getByRole('checkbox', { name: 'ср' }));
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    expect(within(day(/среда, 7 октября 2026/)).getByRole('checkbox', { name: 'Спорт' })).toBeInTheDocument();
    expect(within(day(/четверг, 8 октября 2026/)).queryByRole('checkbox', { name: 'Спорт' })).not.toBeInTheDocument();
  });

  it('AC-07 удаление вхождения: «Только это» оставляет серию', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await addAndOpen(user, 'Зарядка');
    await user.selectOptions(within(dialog).getByLabelText('Повтор'), 'daily');
    await user.click(within(dialog).getByRole('button', { name: 'Удалить' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Только это' }));
    expect(within(day(/понедельник, 5 октября 2026/)).queryByRole('checkbox', { name: 'Зарядка' })).not.toBeInTheDocument();
    expect(within(day(/вторник, 6 октября 2026/)).getByRole('checkbox', { name: 'Зарядка' })).toBeInTheDocument();
  });

  it('AC-07 удаление «Всю серию» убирает все вхождения', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await addAndOpen(user, 'Йога');
    await user.selectOptions(within(dialog).getByLabelText('Повтор'), 'daily');
    await user.click(within(dialog).getByRole('button', { name: 'Удалить' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Всю серию' }));
    expect(screen.queryByRole('checkbox', { name: 'Йога' })).not.toBeInTheDocument();
  });

  it('AC-07 выполнение одного вхождения не отмечает остальные', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await addAndOpen(user, 'Вода');
    await user.selectOptions(within(dialog).getByLabelText('Повтор'), 'daily');
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    await user.click(within(day(/понедельник, 5 октября 2026/)).getByRole('checkbox', { name: 'Вода' }));
    expect(within(day(/понедельник, 5 октября 2026/)).getByRole('checkbox', { name: 'Вода' })).toBeChecked();
    expect(within(day(/вторник, 6 октября 2026/)).getByRole('checkbox', { name: 'Вода' })).not.toBeChecked();
  });

  it('AC-08 напоминание доступно только со временем', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await addAndOpen(user, 'Звонок');
    const rem = within(dialog).getByLabelText('Напоминание');
    expect(rem).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Время'), { target: { value: '09:30' } });
    expect(rem).toBeEnabled();
    await user.selectOptions(rem, '15');
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    expect(within(day(/понедельник, 5 октября 2026/)).getByText('09:30')).toBeInTheDocument();
    expect(within(day(/понедельник, 5 октября 2026/)).getByLabelText('Есть напоминание')).toBeInTheDocument();
  });

  it('AC-06 подзадачи: добавить, отметить, счётчик на карточке, удалить', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await addAndOpen(user, 'Поездка');
    await user.type(within(dialog).getByRole('textbox', { name: 'Новая подзадача' }), 'Билеты{Enter}');
    await user.type(within(dialog).getByRole('textbox', { name: 'Новая подзадача' }), 'Отель{Enter}');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Билеты' }));
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    expect(within(day(/понедельник, 5 октября 2026/)).getByText('1/2')).toBeInTheDocument();
    await user.click(within(day(/понедельник, 5 октября 2026/)).getByRole('button', { name: 'Открыть задачу «Поездка»' }));
    await user.click(screen.getByRole('button', { name: 'Удалить подзадачу «Отель»' }));
    expect(screen.queryByRole('checkbox', { name: 'Отель' })).not.toBeInTheDocument();
  });

  it('AC-05 перенос через выбор даты и в список', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await addAndOpen(user, 'Перенос');
    fireEvent.change(within(dialog).getByLabelText('Дата'), { target: { value: '2026-10-08' } });
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    expect(within(day(/четверг, 8 октября 2026/)).getByRole('checkbox', { name: 'Перенос' })).toBeInTheDocument();
    await user.click(within(day(/четверг, 8 октября 2026/)).getByRole('button', { name: 'Открыть задачу «Перенос»' }));
    await user.selectOptions(within(screen.getByRole('dialog')).getByLabelText('Список'), 'Когда-нибудь');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Закрыть' }));
    expect(within(screen.getByRole('region', { name: 'Когда-нибудь' })).getByRole('checkbox', { name: 'Перенос' })).toBeInTheDocument();
  });

  it('AC-06 цвет задачи выбирается в редакторе', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await addAndOpen(user, 'Цветная');
    await user.click(within(dialog).getByRole('radio', { name: 'Красный' }));
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть' }));
    expect(within(day(/понедельник, 5 октября 2026/)).getByRole('listitem', { name: undefined })).toHaveAttribute('data-color', 'red');
  });

  it('Esc закрывает редактор', async () => {
    const user = userEvent.setup();
    render(<App />);
    await addAndOpen(user, 'Эскейп');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
