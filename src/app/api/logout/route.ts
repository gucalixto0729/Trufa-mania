import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    { success: true },
    { status: 200 }
  )

  // Limpar cookies
  response.cookies.delete('user_email')
  response.cookies.delete('user_role')

  return response
}
