import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'E-mail é obrigatório' },
        { status: 400 }
      )
    }

    // Criar cliente Supabase no servidor
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Não fazer nada aqui, pois estamos usando cookies da resposta
            })
          },
        },
      }
    )

    // Verificar se o e-mail existe na tabela colaboradores
    const { data: colaborador, error: erroColaborador } = await supabase
      .from('colaboradores')
      .select('email, role')
      .eq('email', email.toLowerCase())
      .single()

    if (erroColaborador || !colaborador) {
      return NextResponse.json(
        { error: 'E-mail não cadastrado no sistema' },
        { status: 401 }
      )
    }

    // Criar response com cookies
    const response = NextResponse.json(
      { success: true, email: colaborador.email, role: colaborador.role },
      { status: 200 }
    )

    // Definir cookies que expiram em 24 horas
    response.cookies.set('user_email', colaborador.email, {
      maxAge: 60 * 60 * 24,
      httpOnly: false, // Permitir acesso via JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    response.cookies.set('user_role', colaborador.role, {
      maxAge: 60 * 60 * 24,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { error: 'Erro no servidor' },
      { status: 500 }
    )
  }
}
