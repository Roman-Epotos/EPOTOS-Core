# CONTEXT-CORE.md — ЭПОТОС-Core
Дата: 2026-06-09
Статус: Спринт 4 — активная разработка

=============================================================
1. О ПРОЕКТЕ
=============================================================
Название: ЭПОТОС-Core — общий бэкенд для всех модулей Витрины Данных ЭПОТОС
Назначение: Общие сервисы (ЭПОТОС-Ассистент и др.) для всех модулей платформы

URL: https://epotos-core.vercel.app
GitHub: https://github.com/Roman-Epotos/EPOTOS-Core
Путь: E:\ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ (AI)\ЭПОТОС-ВИТРИНА ДАННЫХ\ЭПОТОС-CORE\epotos-core


=============================================================
2. ТЕХНОЛОГИЧЕСКИЙ СТЕК
=============================================================
Next.js (latest), TypeScript, Supabase (shared с ЮрИнтел)
AI эмбеддинги: OpenRouter → google/gemini-embedding-001 ($0.20/M токенов)
AI генерация: OpenRouter → google/gemini-2.0-flash-001
Хостинг: Vercel


=============================================================
3. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
=============================================================
NEXT_PUBLIC_SUPABASE_URL=https://qmzyybisajjmneydekoo.supabase.co
SUPABASE_SECRET_KEY — .env.local
OPENROUTER_API_KEY — .env.local

ВАЖНО: Variables в Vercel — в левом меню (не в Settings!)


=============================================================
4. СТРУКТУРА БАЗЫ ДАННЫХ (общая с ЮрИнтел)
=============================================================
help_knowledge:
  id, title, source_file, file_type, module, content_text,
  uploaded_by_id, uploaded_by_name, created_at
  module: 'юринтел' | 'персонал' | 'рид' и т.д.

help_chunks:
  id, knowledge_id → help_knowledge(CASCADE),
  chunk_index, chunk_text, embedding vector(768), created_at

Функция: search_help_chunks(query_embedding vector(768), match_module TEXT, match_count INT)
  Возвращает: id, knowledge_id, chunk_index, chunk_text,
              similarity FLOAT, knowledge_title, knowledge_source_file

RLS включён. GRANT SELECT,INSERT,UPDATE,DELETE TO anon,authenticated,service_role.


=============================================================
5. API ЭПОТОС-АССИСТЕНТ
=============================================================
POST /api/assistant/upload
  — FormData: file (DOCX/TXT), title, module, user_id, user_name
  — ADMIN_IDS = [30, 1148]
  — Сохраняет в help_knowledge → чанки без эмбеддингов → success
  — Эмбеддинги генерируются асинхронно в фоне
  — maxDuration = 60, runtime = 'nodejs'

GET /api/assistant/knowledge?module=юринтел
  — Список документов базы знаний

DELETE /api/assistant/knowledge?id=...
  — Удаление документа + CASCADE чанки

POST /api/assistant/search
  — { query, module, limit } → эмбеддинг запроса → pgvector поиск
  — Возвращает топ-5 чанков с similarity

POST /api/assistant/chat
  — { message, module, history[] }
  — Ищет контекст → промпт → gemini-2.0-flash-001
  — Возвращает { answer, sources[] }

CORS: все эндпоинты имеют OPTIONS + Access-Control-Allow-Origin: *


=============================================================
6. АРХИТЕКТУРНЫЕ РЕШЕНИЯ
=============================================================
Эмбеддинги:
  Модель: google/gemini-embedding-001 (OpenRouter)
  Размерность: vector(768)
  Чанки: ~2000 символов, overlap 200

Асинхронная генерация:
  Проблема: Vercel timeout не хватает для больших документов
  Решение: сохраняем чанки без эмбеддингов → success → фоновая генерация
  Фронтенд: после обновления страницы файл появляется в списке (это нормально)

Извлечение текста из DOCX: JSZip → word/document.xml → убираем XML теги


=============================================================
7. REPOMIX КОМАНДЫ
=============================================================
npx repomix --config repomix-api.config.json      → repomix-api-core.txt
npx repomix --config repomix-components.config.json → repomix-components-core.txt
npx repomix --config repomix-pages.config.json    → repomix-pages-core.txt


=============================================================
8. ГДЕ ОСТАНОВИЛИСЬ (09.06.2026)
=============================================================
Сделано:
  ✅ Инициализация Next.js + Vercel + GitHub
  ✅ Supabase: help_knowledge, help_chunks, search_help_chunks()
  ✅ API: upload, search, chat, knowledge (GET/DELETE)
  ✅ CORS на всех эндпоинтах
  ✅ Асинхронная генерация эмбеддингов
  ✅ Favicon обновлён
  ✅ Repomix конфиги с суффиксом -core

Следующие задачи:
  1. Интерфейс чата в ЮрИнтел /help (вкладка ЭПОТОС-Ассистент)
  2. Тестирование загрузки + поиска
  3. Загрузка инструкции пользователя как первого документа
  4. ЭПОТОС-ПЕРСОНАЛ


=============================================================
9. ПРАВИЛА РАБОТЫ
=============================================================
1. Редактирование — ТОЛЬКО Ctrl+H в VS Code
2. Новые файлы — New-Item в PowerShell
3. Перед деплоем — npm run build
4. Деплой:
   git add -A
   git commit -m "..."
   git push
5. При зависании — git commit --allow-empty + git push
6. Repomix файлы имеют суффикс -core (настроено в конфигах)
