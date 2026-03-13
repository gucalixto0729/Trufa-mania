import { type NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const userEmail = request.cookies.get('user_email')?.value

  // Se não tem email e tenta acessar rota protegida
  if (!userEmail) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se tem email e tenta acessar login, vai para home
  if (userEmail && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
}