import { type NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Permitir login e API sem proteção
  if (pathname === '/login' || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  // Verificar autenticação
  const userEmail = request.cookies.get('user_email')?.value
  
  // Se não autenticado, redirecionar para login
  if (!userEmail) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Protege todas as rotas exceto login, api e arquivos estáticos
     */
    '/((?!_next/static|_next/image|favicon.ico|login|api).*)',
  ],
}
