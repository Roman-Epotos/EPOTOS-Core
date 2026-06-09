import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!
const CORE_URL = 'https://epotos-core.vercel.app'

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { message, module = 'юринтел', history = [] } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 })
    }

    // 1. Ищем релевантные чанки
    const searchRes = await fetch(`${CORE_URL}/api/assistant/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message, module, limit: 5 }),
    })
    const searchData = await searchRes.json()
    const chunks = searchData.chunks ?? []

    // 2. Формируем контекст из найденных чанков
    const context = chunks.length > 0
      ? chunks.map((c: { chunk_text: string; knowledge_title: string; similarity: number }, i: number) =>
          `[${i + 1}] ${c.knowledge_title}\n${c.chunk_text}`
        ).join('\n\n---\n\n')
      : ''

    // 3. Формируем системный промпт
    const systemPrompt = context
      ? `Ты — ЭПОТОС Ассистент, помощник по работе с системой Эпотос-ЮрИнтел. Отвечай только на русском языке, кратко и по делу.

Используй следующие материалы из базы знаний для ответа:

${context}

Если ответ не содержится в материалах — честно скажи об этом и предложи обратиться в поддержку.`
      : `Ты — ЭПОТОС Ассистент, помощник по работе с системой Эпотос-ЮрИнтел. Отвечай только на русском языке. По данному вопросу у меня нет информации в базе знаний. Предложи пользователю обратиться в раздел Помощь → Поддержка.`

    // 4. Формируем историю сообщений
    const messages = [
      ...history.slice(-6), // последние 3 пары вопрос-ответ
      { role: 'user', content: message },
    ]

    // 5. Отправляем в Gemini через OpenRouter
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    })

    const aiData = await aiRes.json()
    const answer = aiData.choices?.[0]?.message?.content ?? 'Не удалось получить ответ'

    return NextResponse.json({
      answer,
      sources: chunks.map((c: { knowledge_title: string; knowledge_source_file: string; similarity: number }) => ({
        title: c.knowledge_title,
        file: c.knowledge_source_file,
        similarity: Math.round(c.similarity * 100),
      })),
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}