import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useCart, type CartItem } from '@/hooks/useCart'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/recuperar')({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === 'string' ? s.token : '',
  }),
  component: RecuperarPage,
})

function RecuperarPage() {
  const { token } = Route.useSearch()
  const { user, loading: authLoading } = useAuth()
  const { hydrateFromItems } = useCart()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading')
  const [msg, setMsg] = useState('Recuperando seu carrinho…')

  useEffect(() => {
    if (!token) {
      setStatus('error'); setMsg('Link inválido.'); return
    }
    if (authLoading) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await (supabase as any).rpc('guest_cart_get', { _token: token })
      if (cancelled) return
      if (error || !data || !data[0]) {
        setStatus('error'); setMsg('Não conseguimos encontrar seu carrinho. Talvez o link já tenha expirado.')
        return
      }
      const row = data[0] as { email: string; items: any; status: string }
      const items = (Array.isArray(row.items) ? row.items : []) as CartItem[]
      if (items.length === 0) {
        setStatus('error'); setMsg('Seu carrinho está vazio.'); return
      }
      await hydrateFromItems(items, row.email)
      setStatus('done')
      if (user) navigate({ to: '/checkout' })
      else navigate({ to: '/auth', search: { redirect: '/checkout' } as any })
    })()
    return () => { cancelled = true }
  }, [token, authLoading, user, hydrateFromItems, navigate])

  return (
    <div className="min-h-[60vh] grid place-items-center px-6 text-center">
      <div className="max-w-md space-y-3">
        {status === 'loading' && <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />}
        <h1 className="text-xl font-semibold">Recuperar pedido</h1>
        <p className="text-muted-foreground text-sm">{msg}</p>
      </div>
    </div>
  )
}