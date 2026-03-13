import { type NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isLoginPage = path === '/login'
  const isLoginApi = path === '/api/login'
  const isLogoutApi = path === '/api/logout'

  // Verificar se há cookie de sessão (email do colaborador)
  const userEmail = request.cookies.get('user_email')?.value

  // Proteção de rotas
  if (!userEmail && !isLoginPage && !isLoginApi && !isLogoutApi) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (userEmail && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Ignora arquivos estáticos e rotas de sistema para não sobrecarregar o middleware
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}