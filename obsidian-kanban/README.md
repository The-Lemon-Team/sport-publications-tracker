# Obsidian Kanban

Папка с досками для плагина [Obsidian Kanban](https://github.com/mgmeyers/obsidian-kanban).

## Как подключить

1. Установите плагин **Kanban** в Obsidian (Community plugins).
2. Вариант A — открыть эту папку как vault или добавить её в существующий vault.
3. Вариант B — symlink: `obsidian-kanban` → папка внутри вашего vault.
4. Откройте любой `.md` файл из списка ниже — Obsidian отобразит канбан.

## Доски

| Файл | Назначение |
|------|------------|
| `project-dev.md` | Разработка приложения (Backlog → Done) |
| `content-pipeline.md` | Контент-темы и этапы публикаций |

## Формат

Файлы используют frontmatter `kanban-plugin: basic` и колонки через заголовки `##`.

Редактируйте карточки в Obsidian — изменения остаются в git вместе с репозиторием.
