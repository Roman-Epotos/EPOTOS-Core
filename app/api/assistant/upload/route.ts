import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!
const ADMIN_IDS = [30, 1148]

// Разбиваем текст на чанки по ~500 токенов (~2000 символов)
function splitIntoChunks(text: string, chunkSize = 2000, overlap = 200): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end).trim())
    start += chunkSize - overlap
  }
  return chunks.filter(c => c.length > 50)
}

// Генерируем эмбеддинг через OpenRouter
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

// Извлекаем текст из DOCX через JSZip-подход
async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(buffer)
  const xmlFile = zip.file('word/document.xml')
  if (!xmlFile) return ''
  const xml = await xmlFile.async('text')
  return xml
    .replace(/<w:p[ >]/g, '\n<w:p>')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string
    const module = formData.get('module') as string ?? 'юринтел'
    const userId = parseInt(formData.get('user_id') as string)
    const userName = formData.get('user_name') as string

    if (!ADMIN_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Нет прав' }, { status: 403 })
    }
    if (!file || !title) {
      return NextResponse.json({ error: 'Файл и название обязательны' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    let text = ''
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.docx')) {
      text = await extractTextFromDocx(buffer)
    } else if (fileName.endsWith('.txt')) {
      text = new TextDecoder().decode(buffer)
    } else {
      return NextResponse.json({ error: 'Поддерживаются только DOCX и TXT файлы' }, { status: 400 })
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'Не удалось извлечь текст из файла' }, { status: 400 })
    }

    // Сохраняем документ в help_knowledge
    const { data: knowledge, error: knowledgeError } = await supabase
      .from('help_knowledge')
      .insert({
        title,
        source_file: file.name,
        file_type: fileName.endsWith('.docx') ? 'docx' : 'txt',
        module,
        content_text: text.slice(0, 10000), // сохраняем первые 10к символов
        uploaded_by_id: userId,
        uploaded_by_name: userName,
      })
      .select()
      .single()

    if (knowledgeError) {
      return NextResponse.json({ error: knowledgeError.message }, { status: 400 })
    }

    // Разбиваем на чанки и генерируем эмбеддинги
    const chunks = splitIntoChunks(text)
    const errors: string[] = []

    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await generateEmbedding(chunks[i])
        await supabase.from('help_chunks').insert({
          knowledge_id: knowledge.id,
          chunk_index: i,
          chunk_text: chunks[i],
          embedding,
        })
      } catch (e) {
        errors.push(`Чанк ${i}: ${e}`)
      }
    }

    return NextResponse.json({
      success: true,
      knowledge_id: knowledge.id,
      chunks_created: chunks.length - errors.length,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}