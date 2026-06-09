import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-embedding-001',
      input: text,
    }),
  })
  const data = await res.json()
  return data.data[0].embedding
}

export async function POST(request: NextRequest) {
  try {
    const { query, module = 'юринтел', limit = 5 } = await request.json()

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Запрос не может быть пустым' }, { status: 400 })
    }

    // Генерируем эмбеддинг запроса
    const queryEmbedding = await generateEmbedding(query)

    // Ищем похожие чанки через pgvector
    const { data: chunks, error } = await supabase.rpc('search_help_chunks', {
      query_embedding: queryEmbedding,
      match_module: module,
      match_count: limit,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ chunks: chunks ?? [] }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}