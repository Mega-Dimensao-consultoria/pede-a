import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import * as React from 'react'
import { render } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'

// Cron-triggered route: sends up to 3 cart-recovery emails per abandoned guest cart.
// Schedule windows (since last activity / last email): 1h → 1st, 6h → 2nd, 24h → 3rd.

const SITE_NAME = 'Pede Aí'
const SENDER_DOMAIN = 'notificacoes.pedeai.megadimensao.com.br'
const FROM_DOMAIN = 'pedeai.megadimensao.com.br'

const WINDOWS: Record<0 | 1 | 2, number> = {
  0: 60,        // 1h after last update
  1: 60 * 6,    // 6h after first email
  2: 60 * 24,   // 24h after second email
}

function genToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const Route = createFileRoute('/api/public/hooks/cart-recovery')({
  server: {
    handlers: {
      POST: async () => {
      POST: async ({ request }) => {
        const serviceKeyAuth = process.env.SUPABASE_SERVICE_ROLE_KEY
        const apiKeyAuth = process.env.LOVABLE_API_KEY
        const authHeader = request.headers.get('Authorization') || ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
        const ok = !!token && ((serviceKeyAuth && token === serviceKeyAuth) || (apiKeyAuth && token === apiKeyAuth))
        if (!ok) {
          return Response.json({ error: 'unauthorized' }, { status: 401 })
        }
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: 'Server misconfigured' }, { status: 500 })
        }
        const supabase = createClient(supabaseUrl, serviceKey)

        // Pick eligible carts (max 50 per run)
        const { data: carts, error } = await supabase
          .from('guest_carts')
          .select('id, token, email, items, subtotal, status, recovery_sent_count, updated_at, last_email_sent_at')
          .eq('status', 'active')
          .lt('recovery_sent_count', 3)
          .limit(50)

        if (error) {
          console.error('cart-recovery: query failed', error)
          return Response.json({ error: 'query_failed' }, { status: 500 })
        }

        // Recovery links always point to the published storefront
        const siteBase = 'https://pedeai.megadimensao.com.br'

        const template = TEMPLATES['cart-recovery']
        if (!template) return Response.json({ error: 'template_missing' }, { status: 500 })

        const now = Date.now()
        let processed = 0
        const results: any[] = []

        for (const c of carts ?? []) {
          const attemptIdx = (c.recovery_sent_count ?? 0) as 0 | 1 | 2
          const ref = c.last_email_sent_at ? new Date(c.last_email_sent_at).getTime() : new Date(c.updated_at).getTime()
          const minutesSince = (now - ref) / 60000
          if (minutesSince < WINDOWS[attemptIdx]) continue

          const items = Array.isArray(c.items) ? c.items : []
          if (items.length === 0) continue

          // Suppression check
          const { data: sup } = await supabase
            .from('suppressed_emails')
            .select('id').eq('email', String(c.email).toLowerCase()).maybeSingle()
          if (sup) {
            await supabase.from('guest_carts').update({ status: 'abandoned' }).eq('id', c.id)
            continue
          }

          const recoveryUrl = `${siteBase}/recuperar?token=${c.token}`
          const attempt = (attemptIdx + 1) as 1 | 2 | 3
          const data = { attempt, recoveryUrl, items, subtotal: Number(c.subtotal || 0) }

          const element = React.createElement(template.component, data)
          const html = await render(element)
          const text = await render(element, { plainText: true })
          const subject = typeof template.subject === 'function' ? template.subject(data) : template.subject

          // Unsubscribe token (one per email)
          const normalized = String(c.email).toLowerCase()
          let unsubscribeToken = genToken()
          const { data: existing } = await supabase
            .from('email_unsubscribe_tokens')
            .select('token, used_at').eq('email', normalized).maybeSingle()
          if (existing?.used_at) {
            await supabase.from('guest_carts').update({ status: 'abandoned' }).eq('id', c.id)
            continue
          }
          if (existing?.token) {
            unsubscribeToken = existing.token
          } else {
            await supabase.from('email_unsubscribe_tokens').upsert(
              { token: unsubscribeToken, email: normalized },
              { onConflict: 'email', ignoreDuplicates: true },
            )
            const { data: stored } = await supabase
              .from('email_unsubscribe_tokens').select('token').eq('email', normalized).maybeSingle()
            if (stored?.token) unsubscribeToken = stored.token
          }

          const messageId = crypto.randomUUID()
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'cart-recovery',
            recipient_email: c.email,
            status: 'pending',
            metadata: { attempt, cart_token: c.token },
          })

          const { error: enqErr } = await supabase.rpc('enqueue_email', {
            queue_name: 'transactional_emails',
            payload: {
              message_id: messageId,
              to: c.email,
              from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject,
              html,
              text,
              purpose: 'transactional',
              label: 'cart-recovery',
              idempotency_key: `cart-recovery-${c.token}-${attempt}`,
              unsubscribe_token: unsubscribeToken,
              queued_at: new Date().toISOString(),
            },
          })

          if (enqErr) {
            console.error('cart-recovery enqueue failed', enqErr)
            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: 'cart-recovery',
              recipient_email: c.email,
              status: 'failed',
              error_message: 'enqueue failed',
            })
            continue
          }

          const nextCount = (c.recovery_sent_count ?? 0) + 1
          await supabase.from('guest_carts').update({
            recovery_sent_count: nextCount,
            last_email_sent_at: new Date().toISOString(),
            status: nextCount >= 3 ? 'abandoned' : 'active',
          }).eq('id', c.id)

          processed++
          results.push({ cart: c.token, attempt })
        }

        return Response.json({ ok: true, processed, results })
      },
    },
  },
})