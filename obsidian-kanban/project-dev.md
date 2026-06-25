---
kanban-plugin: basic
---

# Sport Publications Tracker — разработка

## Backlog

### Instagram — Meta App и OAuth

- [ ] Meta Developer: создать приложение, добавить продукты «Facebook Login» + «Instagram»
- [ ] Настроить `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_CALLBACK_URL` в `.env`
- [ ] Redirect URI: `http://localhost:3000/api/oauth/facebook/callback` (+ прод URL)
- [ ] Тестовые пользователи / App Review: `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`
- [ ] Требование к аккаунту: Instagram Business или Creator (личные аккаунты не поддерживаются API)

### Instagram — бэкенд (осталось)

- [ ] `SubscribersService`: синхронизация подписчиков Instagram через `oauthConnectionId`
- [ ] Обновление long-lived token Meta (обмен short-lived → 60 дней)
- [ ] Cron: обновление `MetricSnapshot` (LIVE) для Instagram-постов

### Instagram — фронтенд (осталось)

- [ ] `AddPublicationDialog`: автозагрузка метрик при `providerId === 'instagram'` (как YouTube)
- [ ] `LiveSubscribers`: реальные данные Instagram после OAuth вместо placeholder
- [ ] RTK Query: `getInstagramMetrics` endpoint

### YouTube OAuth — бэкенд (осталось)

- [ ] Google Cloud: OAuth-приложение + `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` в `.env`
- [ ] Google strategy: после callback запросить YouTube Data API (`channels.list`) — сохранить `channelName`, `externalAccountId`, `subscriberCount`
- [ ] Хранение OAuth-сессии: проверить запись в `OAuthConnection` после первого подключения YouTube
- [ ] Сервис обновления токена Google (`refresh_token` → новый `access_token`, обновление `expiresAt` в БД)
- [ ] Cron: `@Cron()` — находить подключения с `expiresAt` < N часов и обновлять токен; при ошибке ставить `status: EXPIRED`

### YouTube OAuth — фронтенд (осталось)

- [ ] Попап/экран подключения YouTube (`ConnectProviders`) — кнопка «Авторизоваться» (сейчас YouTube через API key + ссылку на канал)
- [ ] После успешной авторизации Google: `invalidateTags` / refetch `getOAuthConnections`

### Telegram — Bot API (см. `telegram-integration.md`)

> **Решение:** только Bot API (токен бота + админ в канале). MTProto отложен — нет `api_id`/`api_hash`.

- [x] Prisma: `TelegramBotConnection` (`botTokenEnc`, `botId`, `botUsername`, `status`)
- [x] API: сохранение токена, `getMe`, верификация бота в канале (`getChatMember`)
- [x] `SubscribersService`: Live-подписчики через `getChatMembersCount`
- [x] `shared`: правило `bot_token` для `PROVIDER_SUBSCRIBER_AUTH[TELEGRAM]`
- [x] UI: подключение бота + проверка канала в `AddSubscriberSourceDialog`
- [ ] Публикации TG: парсер `t.me/channel/messageId`, метрики — **ручной режим** (до MTProto)

### Прочее

- [ ] **Календарь** — drag-and-drop планирование, фильтры по площадкам, синхронизация с API
- [ ] Seed тем из Excel (Сон, Женский бег, Силовые…)
- [ ] Cron обновления MetricSnapshot (LIVE) — после OAuth
- [ ] Перенос оставшихся компонентов из v0_prototype
- [ ] E2E-тесты auth + OAuth YouTube

## In Progress

- [ ] Настройка Supabase + `prisma migrate` на прод
- [ ] **Instagram — Meta App + подписчики + метрики постов в UI** (см. Backlog)
- [ ] **YouTube OAuth — первая авторизация через Google** (см. Backlog)

## Review

- [x] Prisma schema (Topic → Stage → Publication)
- [x] Auth: register / login / JWT
- [x] Auth: access token 1h (`JWT_ACCESS_EXPIRES_IN`) + автоматический refresh на web (RTK Query reauth, `POST /auth/refresh`)
- [x] OAuth архитектура (Passport strategies)
- [x] TanStack Table + дашборд из v0
- [x] Login / Register UI

## Done

- [x] Монорепо: apps/api, apps/web, packages/shared
- [x] Прототип v0 в `v0_prototype/` (локально, не в git)
- [x] **Темы** — страница `/topics`, карточка-секция на контент-сетке, `POST /topics`, список публикаций
- [x] **Календарь (фильтр)** — компактный date range, блокировка будущих месяцев и дат
- [x] Dashboard routing по URL (`/`, `/topics`, `/calendar`, `/settings`)
- [x] Подписчики YouTube/VK — трекинг, история, синхронизация API
- [x] **Главная (`/`)** — сводная статистика, «Следующие шаги», подписчики, i18n
- [x] **Контент-сетка (`/content`)** — темы, карточки / таблица метрик
- [x] Сайдбар: «Главная» + «Контент-сетка» на `/content`
- [x] **CRUD публикаций и этапов** — API (`PublicationsModule`, stages reorder) + UI (диалоги, drag-and-drop)
- [x] **Метрики публикаций** — ручной / автоматический режим, история, LIVE toggle
- [x] **OAuth popup flow** — `GET /oauth/authorize/:provider`, `/oauth/callback`, postMessage
- [x] **revokeOAuthConnection** — RTK Query + UI в LiveSubscribers
- [x] **Instagram Graph API** — `InstagramService`, `GET /instagram/metrics?url=`
- [x] Instagram OAuth: кнопка в «Следующие шаги», сохранение `igUserId` / followers в `OAuthConnection`
- [x] **VK service token** — метрики групп и постов без passport OAuth
- [x] **Экспорт статистики тем** в Excel (xlsx) на `/topics`
- [x] **Пресеты диапазонов дат** на странице тем
- [x] **i18n** — react-i18next для навигации и «Следующие шаги»
- [x] Удалён demo-data — дашборд работает с API

%% kanban:settings
{"kanban-plugin":"basic","list-collapse":[false,false,false,false]}
%%
