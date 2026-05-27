import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'Pede Aí'

interface CartItemLite {
  nome?: string
  quantidade?: number
  preco_unit?: number
}

interface CartRecoveryProps {
  attempt?: 1 | 2 | 3
  recoveryUrl?: string
  items?: CartItemLite[]
  subtotal?: number
}

const HEADLINES: Record<1 | 2 | 3, string> = {
  1: 'Você esqueceu algo no seu carrinho 🍔',
  2: 'Seu pedido ainda está te esperando ⏳',
  3: 'Última chance de finalizar seu pedido!',
}

const BODIES: Record<1 | 2 | 3, string> = {
  1: 'Notamos que você deixou alguns itens no carrinho. Que tal voltar e finalizar agora?',
  2: 'Seu pedido continua salvo, mas pode acabar a qualquer momento. É só clicar abaixo para retomar de onde parou.',
  3: 'Este é o último lembrete: seu carrinho está prestes a expirar. Clique abaixo para garantir seu pedido.',
}

function fmtBRL(v: number) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const CartRecoveryEmail = ({
  attempt = 1,
  recoveryUrl = '#',
  items = [],
  subtotal = 0,
}: CartRecoveryProps) => {
  const safeAttempt = (attempt === 2 || attempt === 3 ? attempt : 1) as 1 | 2 | 3
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{HEADLINES[safeAttempt]}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{HEADLINES[safeAttempt]}</Heading>
          <Text style={text}>{BODIES[safeAttempt]}</Text>

          {items.length > 0 && (
            <Section style={card}>
              {items.map((it, idx) => (
                <Text key={idx} style={itemRow}>
                  {(it.quantidade ?? 1)}× {it.nome ?? 'Item'}{' '}
                  <span style={priceText}>
                    {fmtBRL((it.preco_unit ?? 0) * (it.quantidade ?? 1))}
                  </span>
                </Text>
              ))}
              <Hr style={hr} />
              <Text style={totalRow}>
                Subtotal <span style={priceText}>{fmtBRL(subtotal)}</span>
              </Text>
            </Section>
          )}

          <Button style={button} href={recoveryUrl}>
            Retomar meu pedido
          </Button>

          <Text style={footer}>
            Se você já finalizou ou não tem mais interesse, basta ignorar este e-mail.
            — Equipe {SITE_NAME}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CartRecoveryEmail,
  subject: (data: Record<string, any>) => {
    const a = (data?.attempt === 2 || data?.attempt === 3 ? data.attempt : 1) as 1 | 2 | 3
    return HEADLINES[a]
  },
  displayName: 'Recuperação de carrinho',
  previewData: {
    attempt: 1,
    recoveryUrl: 'https://example.com/recuperar?token=demo',
    items: [{ nome: 'X-Burger', quantidade: 2, preco_unit: 25 }],
    subtotal: 50,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111111', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 20px' }
const card = { background: '#f7f7f8', borderRadius: '10px', padding: '16px 18px', margin: '0 0 24px' }
const itemRow = { fontSize: '14px', color: '#222', margin: '4px 0', display: 'flex', justifyContent: 'space-between' as const }
const totalRow = { fontSize: '15px', fontWeight: 'bold' as const, color: '#111', margin: '6px 0 0', display: 'flex', justifyContent: 'space-between' as const }
const priceText = { float: 'right' as const, color: '#111' }
const hr = { borderColor: '#e3e3e6', margin: '12px 0' }
const button = {
  backgroundColor: '#e85d3a',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '14px 22px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }