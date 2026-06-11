/**
 * send-email — dispara e-mails transacionais via Resend API.
 *
 * verify_jwt = false (ver config.toml): chamável pelo frontend público
 * (orcamento-aceito) e autenticado (boas-vindas).
 * O RESEND_API_KEY NUNCA sai deste servidor — é um Supabase Secret.
 *
 * Templates disponíveis:
 *   boas-vindas      — após onboarding; to + data.{ name, org_name }
 *   trial-acabando   — disparo via cron (documentado no README); to + data.{ name, org_name, days_left }
 *   orcamento-aceito — fluxo público; data.{ org_id, customer_name, org_name, total }
 *                      O e-mail do dono é buscado internamente via service role.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, corsPreflightResponse } from '../_shared/cors.ts'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Template = 'boas-vindas' | 'trial-acabando' | 'orcamento-aceito'

interface Payload {
  to?: string
  template: Template
  data: Record<string, string>
}

// ── Templates HTML ─────────────────────────────────────────────────────────────
// Layout: table-based (compatível com Outlook), inline CSS, sem imagens externas.

const BASE_URL = 'https://festahub.com.br'

function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#FAF9F7;font-family:'Nunito',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF9F7;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr>
          <td style="background:#16131F;border-radius:16px 16px 0 0;padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#E8462A;border-radius:50%;width:36px;height:36px;text-align:center;vertical-align:middle;">
                        <span style="color:white;font-size:18px;font-weight:bold;line-height:36px;">F</span>
                      </td>
                      <td style="padding-left:10px;">
                        <span style="color:white;font-size:18px;font-weight:700;font-family:Helvetica,Arial,sans-serif;">FestaHub</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#FFFFFF;padding:36px;border-left:1px solid #EDE9E3;border-right:1px solid #EDE9E3;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F5F4F2;border-radius:0 0 16px 16px;border:1px solid #EDE9E3;border-top:none;padding:20px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
              © 2026 FestaHub · Sistema de Gestão para Buffets Infantis<br>
              <a href="${BASE_URL}/termos" style="color:#9CA3AF;text-decoration:underline;">Termos de Uso</a>
              &nbsp;·&nbsp;
              <a href="${BASE_URL}/privacidade" style="color:#9CA3AF;text-decoration:underline;">Privacidade</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

function ctaButton(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:28px;">
  <tr>
    <td style="background:#E8462A;border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;color:white;text-decoration:none;font-weight:700;font-size:15px;font-family:Helvetica,Arial,sans-serif;">${label} →</a>
    </td>
  </tr>
</table>`
}

function renderBoasVindas(d: Record<string, string>): string {
  const name = d.name || 'parceiro'
  const orgName = d.org_name || 'seu buffet'

  const body = `
<h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#16131F;font-family:Helvetica,Arial,sans-serif;">
  Bem-vindo ao FestaHub! 🎉
</h1>
<p style="margin:0 0 24px;font-size:16px;color:#6B7280;line-height:1.6;">
  Olá, <strong style="color:#111827;">${name}</strong>! O buffet <strong style="color:#111827;">${orgName}</strong> está configurado e pronto para usar.
</p>

<div style="background:#FEF0EC;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#E8462A;text-transform:uppercase;letter-spacing:0.05em;">Seu trial</p>
  <p style="margin:0;font-size:22px;font-weight:800;color:#16131F;font-family:Helvetica,Arial,sans-serif;">14 dias grátis · Sem cartão de crédito</p>
</div>

<p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#111827;">O que você pode fazer agora:</p>
<table cellpadding="0" cellspacing="0" style="margin-bottom:8px;width:100%;">
  <tr><td style="padding:6px 0;font-size:14px;color:#374151;"><span style="color:#16A34A;margin-right:8px;">✓</span> Cadastrar e organizar festas na <strong>Agenda</strong></td></tr>
  <tr><td style="padding:6px 0;font-size:14px;color:#374151;"><span style="color:#16A34A;margin-right:8px;">✓</span> Criar <strong>Orçamentos com link de aceite</strong> para enviar ao cliente</td></tr>
  <tr><td style="padding:6px 0;font-size:14px;color:#374151;"><span style="color:#16A34A;margin-right:8px;">✓</span> Controlar <strong>Receitas e Despesas</strong> no Financeiro</td></tr>
  <tr><td style="padding:6px 0;font-size:14px;color:#374151;"><span style="color:#16A34A;margin-right:8px;">✓</span> Ver o <strong>Radar de Aniversários</strong> dos próximos 45 dias</td></tr>
</table>

${ctaButton(`${BASE_URL}/app/agenda`, 'Acessar minha conta')}

<p style="margin:28px 0 0;font-size:13px;color:#9CA3AF;line-height:1.5;">
  Qualquer dúvida, responda este e-mail ou fale pelo WhatsApp. Estamos aqui para ajudar! 🎈
</p>`

  return emailWrapper(`Bem-vindo ao FestaHub, ${name}!`, body)
}

function renderTrialAcabando(d: Record<string, string>): string {
  const name = d.name || 'parceiro'
  const orgName = d.org_name || 'seu buffet'
  const daysLeft = d.days_left || '3'
  const plural = daysLeft === '1' ? 'dia' : 'dias'

  const urgentColor = Number(daysLeft) <= 1 ? '#DC2626' : '#F59E0B'
  const urgentBg    = Number(daysLeft) <= 1 ? '#FEF2F2' : '#FFFBEB'

  const body = `
<div style="background:${urgentBg};border-radius:12px;padding:20px 24px;margin-bottom:24px;border-left:4px solid ${urgentColor};">
  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${urgentColor};text-transform:uppercase;letter-spacing:0.05em;">Atenção</p>
  <p style="margin:0;font-size:22px;font-weight:800;color:#16131F;font-family:Helvetica,Arial,sans-serif;">
    Seu trial termina em <span style="color:${urgentColor};">${daysLeft} ${plural}</span>
  </p>
</div>

<p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
  Olá, <strong>${name}</strong>! O trial do buffet <strong>${orgName}</strong> está chegando ao fim.
  Escolha um plano para continuar usando o FestaHub sem interrupção.
</p>

<table cellpadding="0" cellspacing="0" style="margin-bottom:8px;width:100%;">
  <tr>
    <td style="padding:10px 16px;background:#F9FAFB;border-radius:8px;margin-bottom:6px;">
      <p style="margin:0;font-size:14px;color:#111827;"><strong>Essencial</strong> — R$ 97/mês · 1 usuário</p>
    </td>
  </tr>
  <tr><td style="height:6px;"></td></tr>
  <tr>
    <td style="padding:10px 16px;background:#FEF0EC;border-radius:8px;border:2px solid #E8462A;">
      <p style="margin:0;font-size:14px;color:#E8462A;"><strong>Profissional ✦</strong> — R$ 197/mês · Até 5 usuários · Mais popular</p>
    </td>
  </tr>
  <tr><td style="height:6px;"></td></tr>
  <tr>
    <td style="padding:10px 16px;background:#F9FAFB;border-radius:8px;">
      <p style="margin:0;font-size:14px;color:#111827;"><strong>Rede</strong> — R$ 397/mês · Múltiplas unidades</p>
    </td>
  </tr>
</table>

${ctaButton(`${BASE_URL}/app/configuracoes`, 'Escolher meu plano')}

<p style="margin:24px 0 0;font-size:13px;color:#9CA3AF;">
  Não quer continuar? Seus dados ficam guardados por 90 dias após o trial. Nenhuma cobrança automática.
</p>`

  return emailWrapper(`Seu trial do FestaHub termina em ${daysLeft} ${plural}`, body)
}

function renderOrcamentoAceito(d: Record<string, string>): string {
  const customerName = d.customer_name || 'O cliente'
  const orgName = d.org_name || 'seu buffet'
  const total = d.total || '—'

  const body = `
<div style="background:#F0FDF4;border-radius:12px;padding:20px 24px;margin-bottom:24px;border-left:4px solid #16A34A;">
  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#16A34A;text-transform:uppercase;letter-spacing:0.05em;">Boa notícia!</p>
  <p style="margin:0;font-size:22px;font-weight:800;color:#16131F;font-family:Helvetica,Arial,sans-serif;">
    Orçamento aceito ✅
  </p>
</div>

<p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6;">
  <strong style="color:#111827;">${customerName}</strong> aceitou o orçamento de <strong style="color:#16A34A;">${total}</strong> para o buffet <strong style="color:#111827;">${orgName}</strong>.
</p>

<p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#111827;">Próximos passos:</p>
<table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:4px;">
  <tr><td style="padding:6px 0;font-size:14px;color:#374151;"><span style="color:#E8462A;margin-right:8px;">→</span> Confirme a festa na <strong>Agenda</strong></td></tr>
  <tr><td style="padding:6px 0;font-size:14px;color:#374151;"><span style="color:#E8462A;margin-right:8px;">→</span> Verifique o sinal no <strong>Financeiro</strong></td></tr>
  <tr><td style="padding:6px 0;font-size:14px;color:#374151;"><span style="color:#E8462A;margin-right:8px;">→</span> Entre em contato com o cliente para confirmar os detalhes</td></tr>
</table>

${ctaButton(`${BASE_URL}/app/orcamentos`, 'Abrir no FestaHub')}

<p style="margin:28px 0 0;font-size:13px;color:#9CA3AF;">
  Este e-mail foi gerado automaticamente quando o cliente clicou em "Aceitar" no link do orçamento.
</p>`

  return emailWrapper(`${customerName} aceitou o orçamento!`, body)
}

// ── Envio via Resend REST API ─────────────────────────────────────────────────

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  apiKey: string,
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FestaHub <noreply@festahub.com.br>',
      to: [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '(sem corpo)')
    throw new Error(`Resend ${res.status}: ${errBody}`)
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflightResponse()
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido' }, 405)

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.error('[send-email] RESEND_API_KEY não configurado')
      return jsonResponse({ error: 'Serviço de e-mail não configurado' }, 503)
    }

    const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
    const SERVICE_ROLE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const { to, template, data } = (await req.json()) as Payload

    const ALLOWED: Template[] = ['boas-vindas', 'trial-acabando', 'orcamento-aceito']
    if (!template || !ALLOWED.includes(template)) {
      return jsonResponse({ error: 'Template inválido' }, 400)
    }

    // ── Resolve destinatário ────────────────────────────────────────────────
    let toAddress = to ?? ''

    if (template === 'orcamento-aceito') {
      const orgId = data?.org_id
      if (!orgId) return jsonResponse({ error: 'org_id obrigatório para orcamento-aceito' }, 400)

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

      // Busca o owner da org
      const { data: membership, error: memErr } = await admin
        .from('memberships')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('role', 'owner')
        .maybeSingle()

      if (memErr || !membership) {
        console.warn('[send-email] owner não encontrado para org', orgId)
        return jsonResponse({ error: 'Organização não encontrada' }, 404)
      }

      // Busca e-mail do owner via Admin API
      const { data: authData, error: authErr } = await admin.auth.admin.getUserById(
        membership.user_id as string,
      )

      if (authErr || !authData.user?.email) {
        console.warn('[send-email] e-mail do owner não encontrado')
        return jsonResponse({ error: 'Usuário não encontrado' }, 404)
      }

      toAddress = authData.user.email
    }

    if (!toAddress) {
      return jsonResponse({ error: 'Destinatário (to) não informado' }, 400)
    }

    // ── Renderiza template ──────────────────────────────────────────────────
    let subject = ''
    let html = ''

    switch (template) {
      case 'boas-vindas':
        subject = `🎉 Bem-vindo ao FestaHub, ${data?.name ?? 'parceiro'}!`
        html = renderBoasVindas(data ?? {})
        break
      case 'trial-acabando':
        subject = `⚠️ Seu trial termina em ${data?.days_left ?? '3'} dias — FestaHub`
        html = renderTrialAcabando(data ?? {})
        break
      case 'orcamento-aceito':
        subject = `✅ ${data?.customer_name ?? 'Cliente'} aceitou o orçamento!`
        html = renderOrcamentoAceito(data ?? {})
        break
    }

    await sendViaResend(toAddress, subject, html, RESEND_API_KEY)

    console.log(`[send-email] template=${template} to=${toAddress}`)
    return jsonResponse({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[send-email] erro:', msg)
    return jsonResponse({ error: msg }, 500)
  }
})
