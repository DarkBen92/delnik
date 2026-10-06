import { parseQuickInput } from './nlp';

const TODAY = '2026-10-05'; // понедельник

describe('parseQuickInput', () => {
  it('keeps plain text as title', () => {
    expect(parseQuickInput('Купить хлеб', TODAY)).toEqual({
      title: 'Купить хлеб', date: null, time: null, recurrence: null, color: null,
    });
  });

  it('parses relative days', () => {
    expect(parseQuickInput('сегодня сдать отчёт', TODAY)).toMatchObject({ title: 'сдать отчёт', date: '2026-10-05' });
    expect(parseQuickInput('Позвонить маме завтра', TODAY)).toMatchObject({ title: 'Позвонить маме', date: '2026-10-06' });
    expect(parseQuickInput('послезавтра спортзал', TODAY)).toMatchObject({ title: 'спортзал', date: '2026-10-07' });
    expect(parseQuickInput('через 3 дня врач', TODAY)).toMatchObject({ title: 'врач', date: '2026-10-08' });
    expect(parseQuickInput('через неделю отпуск', TODAY)).toMatchObject({ title: 'отпуск', date: '2026-10-12' });
  });

  it('parses weekdays (on or after today)', () => {
    expect(parseQuickInput('в пятницу кино', TODAY)).toMatchObject({ title: 'кино', date: '2026-10-09' });
    expect(parseQuickInput('во вторник стрижка', TODAY)).toMatchObject({ title: 'стрижка', date: '2026-10-06' });
    expect(parseQuickInput('в пн планёрка', TODAY)).toMatchObject({ title: 'планёрка', date: '2026-10-05' });
    expect(parseQuickInput('в воскресенье дача', TODAY)).toMatchObject({ title: 'дача', date: '2026-10-11' });
  });

  it('parses absolute dates', () => {
    expect(parseQuickInput('15 октября день рождения', TODAY)).toMatchObject({ title: 'день рождения', date: '2026-10-15' });
    expect(parseQuickInput('3 янв билеты', TODAY)).toMatchObject({ title: 'билеты', date: '2027-01-03' });
    expect(parseQuickInput('20.10 оплатить ЖКХ', TODAY)).toMatchObject({ title: 'оплатить ЖКХ', date: '2026-10-20' });
    expect(parseQuickInput('налог 01.12.2026', TODAY)).toMatchObject({ title: 'налог', date: '2026-12-01' });
  });

  it('parses time', () => {
    expect(parseQuickInput('завтра в 18:00 позвонить маме', TODAY)).toMatchObject({
      title: 'позвонить маме', date: '2026-10-06', time: '18:00',
    });
    expect(parseQuickInput('созвон в 9:30', TODAY)).toMatchObject({ title: 'созвон', time: '09:30', date: '2026-10-05' });
    expect(parseQuickInput('ужин в 7 вечера', TODAY)).toMatchObject({ title: 'ужин', time: '19:00' });
    expect(parseQuickInput('пробежка в 7 утра', TODAY)).toMatchObject({ title: 'пробежка', time: '07:00' });
    expect(parseQuickInput('встреча в 15', TODAY)).toMatchObject({ title: 'встреча', time: '15:00' });
  });

  it('parses recurrence', () => {
    expect(parseQuickInput('каждый день зарядка', TODAY)).toMatchObject({
      title: 'зарядка', date: '2026-10-05', recurrence: { freq: 'daily', interval: 1 },
    });
    expect(parseQuickInput('ежедневно витамины', TODAY).recurrence).toEqual({ freq: 'daily', interval: 1 });
    expect(parseQuickInput('каждую среду бассейн', TODAY)).toMatchObject({
      title: 'бассейн', date: '2026-10-07', recurrence: { freq: 'weekly', interval: 1, weekdays: [3] },
    });
    expect(parseQuickInput('по будням стендап в 10:00', TODAY)).toMatchObject({
      title: 'стендап', time: '10:00', recurrence: { freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] },
    });
    expect(parseQuickInput('по выходным уборка', TODAY)).toMatchObject({
      title: 'уборка', date: '2026-10-10', recurrence: { freq: 'weekly', interval: 1, weekdays: [6, 7] },
    });
    expect(parseQuickInput('каждые 2 недели отчёт', TODAY).recurrence).toEqual({ freq: 'weekly', interval: 2 });
    expect(parseQuickInput('каждый месяц аренда', TODAY).recurrence).toEqual({ freq: 'monthly', interval: 1 });
    expect(parseQuickInput('ежегодно страховка', TODAY).recurrence).toEqual({ freq: 'yearly', interval: 1 });
  });

  it('parses colour tags', () => {
    expect(parseQuickInput('важное !красный', TODAY)).toMatchObject({ title: 'важное', color: 'red' });
    expect(parseQuickInput('!зелёный прогулка', TODAY)).toMatchObject({ title: 'прогулка', color: 'green' });
    expect(parseQuickInput('!желтый тест', TODAY).color).toBe('yellow');
  });

  it('does not eat words that only look like keywords', () => {
    expect(parseQuickInput('Завтрак с Олей', TODAY)).toMatchObject({ title: 'Завтрак с Олей', date: null });
    expect(parseQuickInput('в пятницу в 7 вечера', TODAY)).toMatchObject({ title: 'в пятницу в 7 вечера', date: '2026-10-09', time: '19:00' });
  });
});
