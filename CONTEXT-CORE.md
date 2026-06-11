# CONTEXT-CORE.md — ЭПОТОС-Core
Дата: 2026-06-11
Статус: Спринт 4 — активная разработка

=============================================================
1. О ПРОЕКТЕ
=============================================================
Название: ЭПОТОС-Core — общий бэкенд для всех модулей Витрины Данных ЭПОТОС
URL: https://epotos-core.vercel.app
GitHub: https://github.com/Roman-Epotos/EPOTOS-Core
Путь: E:\ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ (AI)\ЭПОТОС-ВИТРИНА ДАННЫХ\ЭПОТОС-CORE\epotos-core


=============================================================
2. ТЕХНОЛОГИЧЕСКИЙ СТЕК
=============================================================
Next.js (latest), TypeScript, Supabase (shared с ЮрИнтел)
AI эмбеддинги: OpenRouter → google/gemini-embedding-001
AI генерация: OpenRouter → google/gemini-2.5-flash
Хостинг: Vercel


=============================================================
3. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
=============================================================
NEXT_PUBLIC_SUPABASE_URL=https://qmzyybisajjmneydekoo.supabase.co
SUPABASE_SECRET_KEY, OPENROUTER_API_KEY — .env.local
ВАЖНО: Variables в Vercel — в левом меню!


=============================================================
4. БАЗА ДАННЫХ (общая с ЮрИнтел)
=============================================================
help_knowledge:
  id, title, source_file, file_type, module, content_text,
  uploaded_by_id, uploaded_by_name, created_at
  module: 'юринтел' | 'персонал' | 'рид' и т.д.

help_chunks:
  id, knowledge_id → help_knowledge(CASCADE),
  chunk_index, chunk_text, embedding vector(3072), created_at
  ВАЖНО: embedding = vector(3072) — gemini-embedding-001 возвращает 3072 измерения
  ВАЖНО: ivfflat и hnsw индексы удалены (лимит 2000 измерений)
  Функция search_help_chunks принимает vector без размерности — работает с любой

Функция: search_help_chunks(query_embedding, match_module, match_count)
  Возвращает: id, knowledge_id, chunk_index, chunk_text, similarity, knowledge_title, knowledge_source_file


=============================================================
5. API
=============================================================
POST /api/assistant/upload — загрузка DOCX/TXT, maxDuration=120
  ВАЖНО: эмбеддинги генерируются СИНХРОННО (не в фоне!)
  Причина: Vercel убивает фоновые процессы → эмбеддинги не создавались
GET  /api/assistant/knowledge?module=юринтел — список документов
DELETE /api/assistant/knowledge?id=... — удаление + CASCADE
POST /api/assistant/search — поиск по векторам
POST /api/assistant/chat — чат с ИИ (gemini-2.5-flash)

CORS: все эндпоинты имеют OPTIONS + Access-Control-Allow-Origin: *
ВАЖНО: модель google/gemini-2.5-flash (НЕ gemini-2.0-flash-001!)


=============================================================
6. АРХИТЕКТУРА
=============================================================
Эмбеддинги: google/gemini-embedding-001, vector(3072), чанки ~2000 символов
Генерация: СИНХРОННАЯ — await generateEmbedding() → insert с эмбеддингом сразу
Текст из DOCX: JSZip → word/document.xml → убираем теги
Текст из TXT: прямое чтение
ADMIN_IDS = [30, 1148]

Известная проблема:
  ⚠️ Кнопка загрузки зависает на ⏳ (но файл загружается корректно)
  Статус: отложено до конца разработки модуля


=============================================================
7. СОСТОЯНИЕ БАЗЫ ЗНАНИЙ (11.06.2026)
=============================================================
Загружен документ: Эпотос-ЮрИнтел_База_знаний_Ассистент.txt
  module: 'юринтел'
  chunks: 7, все с эмбеддингами (embedding IS NOT NULL)
  Содержание: полная инструкция по ЮрИнтел (роли, статусы, функционал, FAQ)
  Тестирование: ✅ ассистент корректно отвечает на вопросы по системе


=============================================================
8. REPOMIX
=============================================================
npx repomix --config repomix-api.config.json      → repomix-api-core.txt
npx repomix --config repomix-components.config.json → repomix-components-core.txt
npx repomix --config repomix-pages.config.json    → repomix-pages-core.txt


=============================================================
9. ГДЕ ОСТАНОВИЛИСЬ (11.06.2026)
=============================================================
Сделано:
  ✅ Инициализация + Vercel + GitHub
  ✅ API: upload, search, chat, knowledge
  ✅ CORS, синхронные эмбеддинги, favicon
  ✅ Модель исправлена на gemini-2.5-flash
  ✅ Исправлен размер эмбеддингов: vector(3072)
  ✅ Загружена инструкция пользователя ЮрИнтел
  ✅ Тестирование ассистента — работает корректно

Следующие задачи:
  1. ЭПОТОС-ПЕРСОНАЛ (новый модуль)
  2. Исправить баг зависания кнопки загрузки


=============================================================
10. ПРАВИЛА
=============================================================
1. Ctrl+H в VS Code для редактирования
2. New-Item для новых файлов
3. npm run build перед деплоем
4. git add -A / git commit / git push
5. При зависании — git commit --allow-empty + git push
