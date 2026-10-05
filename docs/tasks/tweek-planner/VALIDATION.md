# Проверка: tweek-planner

## Журнал команд

| Этап | Абсолютный cwd | Команда | Exit code | Результат |
|---|---|---|---:|---|
| baseline | `/home/claude/delnik-wt` | — | — | Репозиторий пуст, тестов нет |
| red (домен) | `/home/claude/delnik-wt` | `npx vitest run src/domain` | 1 | 52 failed: `Error: not implemented` из заглушек; 1 passed — `decodeShare('%%%')` бросает (заглушка тоже бросает, не доказательство RED) |
| red (UI) | `/home/claude/delnik-wt` | `npx vitest run src/ui` | 1 | 9 failed: `App` — заглушка, бросает `not implemented` |
| typecheck | `/home/claude/delnik-wt` | `npx tsc --noEmit` | 0 | без ошибок |
| green (домен) | `/home/claude/delnik-domain` | `npx vitest run src/domain` | 0 | 53/53 (воркер Sonnet, коммит d7b09df + исправление ICS 24a3240) |
| red (доп. UI) | `/home/claude/delnik-ui` | `npx vitest run src/ui src/store` | 1 | 46 failed / 2 passed: App — заглушка; 2 теста `files.test.ts` написаны вместе с реализацией (не RED) |
| интеграция | `/home/claude/delnik-wt` | `npx vitest run` | 0 | 14 файлов, 101/101 |
| интеграция | `/home/claude/delnik-wt` | `npx tsc --noEmit` | 0 | без ошибок |
| интеграция | `/home/claude/delnik-wt` | `npx vite build` | 0 | JS 341 КБ (gzip 106 КБ) |
| e2e red | `/home/claude/delnik-wt` | Playwright: перетаскивание задачи мышью на другой день (`vite preview`) | — | Пустой экран, `Minified React error #185` (селектор overlay в DragOverlay возвращал новый объект → бесконечный ререндер) |
| e2e green | `/home/claude/delnik-wt` | тот же сценарий после исправления `src/ui/App.tsx` | — | задача перенесена, ошибок в консоли нет; service worker зарегистрирован; на 390px нет горизонтального скролла |

## Исправления при приёмке
- ICS: тест ожидал неэкранированную `;` из-за опечатки в JS-литерале; исправлены тест и `escapeText` (RFC 5545).
- DnD: падение приложения при перетаскивании (см. e2e).
- Поле «Новая задача»: длинный пример обрезался в узких колонках → placeholder «Новая задача…», пример в подсказке `title`.
- Кнопки выбора файла показывали системный английский текст → своя кнопка «Прикрепить файл».

## Ручная проверка (Playwright, Chromium, скриншоты)
Неделя, месяц (праздник 4 ноября подписан), редактор, вложения, итоги, настройки, тёмная тема, мобильная ширина, печать — без ошибок в консоли.
Не проверено: реальные системные уведомления, установка PWA на устройство, печать на принтер, перетаскивание пальцем.

## Финальная проверка
- [x] Все AC сопоставлены с тестами или ручным сценарием.
- [x] RED получен до продуктового кода (кроме отмеченного `files.test.ts`).
- [x] Тесты не ослаблены; изменения тестов: ICS (опечатка), placeholder (изменение требования).
- [x] Приёмка Opus: diff просмотрен выборочно (домен `tasks.ts`, `App.tsx`), e2e-сценарии пройдены.
