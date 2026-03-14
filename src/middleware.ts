import { type NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const userEmail = request.cookies.get('user_email')?.value

  const isLoginPage = path === '/login'
  const isLoginApi = path === '/api/login'
  const isLogoutApi = path === '/api/logout'

  if (!userEmail && !isLoginPage && !isLoginApi && !isLogoutApi) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (userEmail && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
