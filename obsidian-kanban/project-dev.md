---
kanban-plugin: basic
---

# Sport Publications Tracker — разработка

## Backlog

### YouTube OAuth — бэкенд

- [ ] Google Cloud: OAuth-приложение + `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` в `.env`
- [ ] OAuth start: авторизация при browser redirect (сейчас `GET /oauth/start/:provider` требует JWT, но `window.location` не передаёт Bearer)
- [ ] Google strategy: после callback запросить YouTube Data API (`channels.list`) — сохранить `channelName`, `externalAccountId`, `subscriberCount`
- [ ] Хранение OAuth-сессии: проверить запись в `OAuthConnection` (`accessTokenEnc`, `refreshTokenEnc`, `expiresAt`, `status`) после первого подключения YouTube
- [ ] Сервис обновления токена Google (`refresh_token` → новый `access_token`, обновление `expiresAt` в БД)
- [ ] Cron: `@Cron()` — находить подключения с `expiresAt` < N часов и обновлять токен; при ошибке ставить `status: EXPIRED`

### YouTube OAuth — фронтенд

- [ ] Попап/экран подключения YouTube (`ConnectProviders`) — кнопка «Авторизоваться» открывает OAuth (popup или redirect с auth)
- [ ] Callback с бэкенда: страница или обработчик query-параметров (`?oauth=success&provider=GOOGLE`) после redirect из `oauth.service.buildCallbackRedirect`
- [ ] После успешной авторизации: `invalidateTags` / refetch `getOAuthConnections` и скрыть empty-state; fallback — `window.location.reload()`
- [ ] RTK Query: мутация `revokeOAuthConnection` + отображение статуса подключения (ACTIVE / EXPIRED)

### Прочее

- [ ] **Календарь** — расширить страницу: фильтры по темам/площадкам, drag-and-drop планирование, синхронизация с API
- [ ] Seed тем из Excel (Сон, Женский бег, Силовые…)
- [ ] CRUD публикаций через API
- [ ] Cron обновления MetricSnapshot (LIVE) — после OAuth
- [ ] Экспорт дашборда в Excel (exceljs)
- [ ] Перенос оставшихся компонентов из v0_prototype
- [ ] E2E-тесты auth + OAuth YouTube

## In Progress

- [ ] Настройка Supabase + `prisma migrate` на прод
- [ ] **YouTube OAuth — первая авторизация** (см. Backlog: бэкенд + фронтенд)

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
