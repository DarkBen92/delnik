import { render, screen, act } from '@testing-library/react';
import { App } from './App';
import { seed, task } from './testSeed';

describe('напоминания и таймер', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('AC-08 раз в 30 с показывает тост о наступившем напоминании', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 9, 5, 8, 59, 40));
    seed([task({ id: 'r', title: 'Лекарство', time: '09:00', reminder: 0 })]);
    render(<App />);
    await act(async () => { vi.setSystemTime(new Date(2026, 9, 5, 9, 0, 10)); vi.advanceTimersByTime(30_000); });
    expect(await screen.findByText(/Лекарство/, { selector: '[role="status"] *, [role="status"]' })).toBeInTheDocument();
  });

  it('AC-08 работает без глобального Notification', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 12, 0));
    vi.stubGlobal('Notification', undefined);
    expect(() => render(<App />)).not.toThrow();
  });
});

describe('фокус-таймер', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 9, 5, 12, 0)); });
  afterEach(() => vi.useRealTimers());

  it('AC-21 «Фокус» открывает виджет 25:00 с названием задачи', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    const { within } = await import('@testing-library/react');
    seed([task({ id: 'f', title: 'Глубокая работа' })]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Открыть задачу «Глубокая работа»' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Фокус' }));
    const widget = screen.getByRole('timer');
    expect(widget).toHaveTextContent('25:00');
    expect(widget).toHaveTextContent('Глубокая работа');
    await user.click(within(widget).getByRole('button', { name: 'Закрыть таймер' }));
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });
});
