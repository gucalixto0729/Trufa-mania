import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function useAuth() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Verificar se há sessão no sessionStorage (preenchida no login)
    const userEmail = sessionStorage.getItem('user_email')
    const userRole = sessionStorage.getItem('user_role')

    if (!userEmail) {
      router.push('/login')
      return
    }

    setEmail(userEmail)
    const adminStatus = userRole === 'admin'
    setIsAdmin(adminStatus)

    // Se não for admin e tentar acessar algo que não seja vendas, bloqueia
    if (!adminStatus && pathname !== '/vendas') {
      router.push('/vendas')
    }

    setLoading(false)
  }, [pathname, router])

  return { loading, isAdmin, email }
}