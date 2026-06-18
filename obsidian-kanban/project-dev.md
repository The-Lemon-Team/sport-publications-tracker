---
kanban-plugin: basic
---

# Sport Publications Tracker — разработка

## Backlog

- [ ] Seed тем из Excel (Сон, Женский бег, Силовые…)
- [ ] CRUD публикаций через API
- [ ] Cron обновления MetricSnapshot (LIVE)
- [ ] Экспорт дашборда в Excel (exceljs)
- [ ] Перенос оставшихся компонентов из v0_prototype
- [ ] E2E-тесты auth + topics

## In Progress

- [ ] Настройка Supabase + `prisma migrate` на прод
- [ ] OAuth credentials (VK, Google, Facebook) в `.env`

## Review

- [x] Prisma schema (Topic → Stage → Publication)
- [x] Auth: register / login / JWT
- [x] OAuth архитектура (Passport strategies)
- [x] TanStack Table + дашборд из v0
- [x] Login / Register UI

## Done

- [x] Монорепо: apps/api, apps/web, packages/shared
- [x] Прототип v0 в `v0_prototype/`

%% kanban:settings
{"kanban-plugin":"basic","list-collapse":[false,false,false,false]}
%%
