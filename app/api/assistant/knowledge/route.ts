import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  try {
    const module = request.nextUrl.searchParams.get('module') ?? 'юринтел'

    const { data, error } = await supabase
      .from('help_knowledge')
      .select('id, title, source_file, module, created_at, uploaded_by_name')
      .eq('module', module)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS_HEADERS })

    return NextResponse.json({ documents: data ?? [] }, { headers: CORS_HEADERS })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID не указан' }, { status: 400, headers: CORS_HEADERS })

    // Удаляем чанки (каскадно через FK) и сам документ
    const { error } = await supabase
      .from('help_knowledge')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: CORS_HEADERS })

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS })
  }
}