import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { STORAGE_KEY, seed, task } from './testSeed';
import { freezeToday, monday } from './testUtil';
import type { Tag, Task } from '../domain/types';

beforeEach(freezeToday);
afterEach(() => vi.useRealTimers());

const SPORT: Tag = { id: 'sport', name: 'Спорт', color: 'yellow' };
const YELLOW = 'rgb(255, 236, 92)';
const RED = 'rgb(240, 67, 106)';

function seedTags(tasks: Task[], tags: Tag[] = [SPORT]) {
  const d = seed(tasks);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...d, tags }));
}
const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!) as { tasks: Task[]; tags: Tag[] };
const pill = (title: string) => within(monday()).getByText(title, { selector: '.pill' });

async function openTask(title: string) {
  const user = userEvent.setup();
  await user.click(within(monday()).getByRole('button', { name: `Открыть задачу «${title}»` }));
  return { user, dialog: screen.getByRole('dialog', { name: 'Задача' }) };
}

async function openMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Меню' }));
  return { user, menu: screen.getByRole('dialog', { name: 'Меню' }) };
}

describe('тэги в строке задачи', () => {
  it('показывает тэг и красит задачу его цветом', () => {
    seedTags([task({ title: 'Бег', tagId: 'sport' })]);
    render(<App />);
    expect(within(monday()).getByText('Спорт')).toBeInTheDocument();
    expect(pill('Бег').style.background).toBe(YELLOW);
  });

  it('свой цвет задачи важнее цвета тэга', () => {
    seedTags([task({ title: 'Бег', tagId: 'sport', color: 'red' })]);
    render(<App />);
    expect(within(monday()).getByText('Спорт')).toBeInTheDocument();
    expect(pill('Бег').style.background).toBe(RED);
  });

  it('тэг без цвета виден, но задачу не красит', () => {
    seedTags([task({ title: 'Уборка', tagId: 'home' })], [{ id: 'home', name: 'Дом', color: 'none' }]);
    render(<App />);
    expect(within(monday()).getByText('Дом')).toBeInTheDocument();
    expect(pill('Уборка').style.background).toBe('');
  });
});

describe('тэги в редакторе', () => {
  it('создаёт тэг с цветом и сразу назначает его задаче', async () => {
    seedTags([task({ id: 'a', title: 'Бег' })], []);
    render(<App />);
    const { user, dialog } = await openTask('Бег');
    await user.click(within(dialog).getByRole('button', { name: 'Новый тэг' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Название тэга' }), 'Спорт');
    await user.click(within(within(dialog).getByRole('radiogroup', { name: 'Цвет тэга' })).getByRole('radio', { name: 'Жёлтый' }));
    await user.click(within(dialog).getByRole('button', { name: 'Создать тэг' }));
    const s = stored();
    expect(s.tags).toMatchObject([{ name: 'Спорт', color: 'yellow' }]);
    expect(s.tasks[0].tagId).toBe(s.tags[0].id);
    expect(within(within(dialog).getByRole('radiogroup', { name: 'Тэг' })).getByRole('radio', { name: 'Спорт' }))
      .toHaveAttribute('aria-checked', 'true');
    expect(pill('Бег').style.background).toBe(YELLOW);
  });

  it('выбирает существующий тэг и снимает его', async () => {
    seedTags([task({ id: 'a', title: 'Бег' })]);
    render(<App />);
    const { user, dialog } = await openTask('Бег');
    const group = within(dialog).getByRole('radiogroup', { name: 'Тэг' });
    expect(within(group).getByRole('radio', { name: 'Без тэга' })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(group).getByRole('radio', { name: 'Спорт' }));
    expect(stored().tasks[0].tagId).toBe('sport');
    expect(within(monday()).getByText('Спорт')).toBeInTheDocument();
    await user.click(within(group).getByRole('radio', { name: 'Без тэга' }));
    expect(stored().tasks[0].tagId).toBeNull();
    expect(within(monday()).queryByText('Спорт')).not.toBeInTheDocument();
    expect(pill('Бег').style.background).toBe('');
  });
});

describe('окно «Тэги»', () => {
  async function openTags() {
    const { user, menu } = await openMenu();
    expect(within(menu).getByText('Спорт')).toBeInTheDocument();
    await user.click(within(menu).getByRole('button', { name: 'Настроить тэги' }));
    return { user, dlg: screen.getByRole('dialog', { name: 'Тэги' }) };
  }

  it('открывается из меню и показывает тэги со счётчиком задач', async () => {
    seedTags([task({ title: 'Бег', tagId: 'sport' }), task({ title: 'Йога', tagId: 'sport' })]);
    render(<App />);
    const { dlg } = await openTags();
    expect(screen.queryByRole('dialog', { name: 'Меню' })).not.toBeInTheDocument();
    expect(within(dlg).getByRole('textbox', { name: 'Название тэга «Спорт»' })).toHaveValue('Спорт');
    expect(within(dlg).getByText('2 задачи')).toBeInTheDocument();
  });

  it('создаёт, переименовывает, перекрашивает и удаляет тэг', async () => {
    seedTags([task({ id: 'a', title: 'Бег', tagId: 'sport' })]);
    render(<App />);
    const { user, dlg } = await openTags();
    await user.type(within(dlg).getByRole('textbox', { name: 'Название нового тэга' }), 'Работа');
    await user.click(within(within(dlg).getByRole('radiogroup', { name: 'Цвет нового тэга' })).getByRole('radio', { name: 'Синий' }));
    await user.click(within(dlg).getByRole('button', { name: 'Создать тэг' }));
    expect(stored().tags).toMatchObject([SPORT, { name: 'Работа', color: 'blue' }]);
    expect(within(dlg).getByRole('textbox', { name: 'Название нового тэга' })).toHaveValue('');

    const name = within(dlg).getByRole('textbox', { name: 'Название тэга «Спорт»' });
    await user.clear(name);
    await user.type(name, 'Фитнес{Enter}');
    expect(stored().tags[0].name).toBe('Фитнес');
    expect(within(monday()).getByText('Фитнес')).toBeInTheDocument();

    await user.click(within(dlg).getByRole('button', { name: 'Цвет тэга «Фитнес»' }));
    await user.click(within(within(dlg).getByRole('radiogroup', { name: 'Цвет тэга «Фитнес»' })).getByRole('radio', { name: 'Красный' }));
    expect(stored().tags[0].color).toBe('red');
    expect(pill('Бег').style.background).toBe(RED);

    await user.click(within(dlg).getByRole('button', { name: 'Удалить тэг «Фитнес»' }));
    expect(stored().tags.map((t) => t.name)).toEqual(['Работа']);
    expect(stored().tasks[0].tagId).toBeNull();
    expect(within(monday()).queryByText('Фитнес')).not.toBeInTheDocument();
  });

  it('не даёт переименовать тэг в занятое название', async () => {
    seedTags([], [SPORT, { id: 'work', name: 'Работа', color: 'blue' }]);
    render(<App />);
    const { user, dlg } = await openTags();
    const name = within(dlg).getByRole('textbox', { name: 'Название тэга «Работа»' });
    await user.clear(name);
    await user.type(name, 'спорт{Enter}');
    expect(stored().tags.map((t) => t.name)).toEqual(['Спорт', 'Работа']);
    expect(name).toHaveValue('Работа');
  });
});

describe('тэги в быстром вводе', () => {
  const quick = () => screen.getByRole('textbox', { name: 'Быстрый ввод задачи' });

  it('#тэг назначает существующий тэг без учёта регистра', async () => {
    seedTags([]);
    const user = userEvent.setup();
    render(<App />);
    await user.type(quick(), 'бег #спорт');
    expect(screen.getByLabelText('Как поняли запись')).toHaveTextContent('#Спорт');
    await user.keyboard('{Enter}');
    expect(stored().tags).toHaveLength(1);
    expect(stored().tasks[0]).toMatchObject({ title: 'бег', tagId: 'sport' });
    expect(pill('бег').style.background).toBe(YELLOW);
  });

  it('#новый создаёт тэг без цвета', async () => {
    seedTags([], []);
    const user = userEvent.setup();
    render(<App />);
    await user.type(quick(), 'растяжка #Йога{Enter}');
    const s = stored();
    expect(s.tags).toMatchObject([{ name: 'Йога', color: 'none' }]);
    expect(s.tasks[0]).toMatchObject({ title: 'растяжка', tagId: s.tags[0].id });
  });
});
