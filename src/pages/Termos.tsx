/**
 * Termos de Uso
 * TODO: revisar com assessoria jurídica antes de publicar em produção.
 */

import { Link } from 'react-router-dom'

function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="14" fill="#E8462A" />
      <ellipse cx="14" cy="11" rx="5.5" ry="6.5" fill="white" opacity="0.95" />
      <path d="M14 17.5 Q13 20 12 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <circle cx="14" cy="17.5" r="1" fill="white" opacity="0.8" />
    </svg>
  )
}

const SECTIONS = [
  {
    title: '1. Aceitação dos Termos',
    body: `Ao acessar ou usar o FestaHub ("Serviço"), você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte dos termos, não poderá acessar o Serviço. Estes termos se aplicam a todos os visitantes, usuários e outros que acessam ou usam o Serviço.

TODO: adaptar linguagem jurídica com assessoria especializada.`,
  },
  {
    title: '2. Descrição do Serviço',
    body: `O FestaHub é um sistema de gestão SaaS (Software como Serviço) voltado para buffets infantis e brinquedotecas no Brasil. O Serviço oferece módulos de agenda de eventos, cadastro de clientes, geração de orçamentos, controle financeiro e radar de aniversários.

O acesso ao Serviço é mediante cadastro e assinatura de um dos planos disponíveis, após período de trial gratuito de 14 (quatorze) dias.`,
  },
  {
    title: '3. Conta de Usuário',
    body: `Para usar o Serviço, você deve criar uma conta fornecendo informações precisas e completas. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas com sua conta.

Você deve notificar imediatamente o FestaHub sobre qualquer uso não autorizado de sua conta. O FestaHub não será responsável por perdas decorrentes do uso não autorizado de sua conta.`,
  },
  {
    title: '4. Planos e Pagamento',
    body: `O Serviço oferece três planos pagos (Essencial, Profissional e Rede) cobrados mensalmente via Mercado Pago. O período de trial de 14 dias é gratuito e não requer cartão de crédito.

Após o trial, o acesso fica condicionado à assinatura de um plano. O cancelamento pode ser feito a qualquer momento pelo painel do usuário, sem multa. O acesso permanece ativo até o fim do período já pago.

TODO: detalhar política de reembolso e chargeback com assessoria jurídica.`,
  },
  {
    title: '5. Propriedade dos Dados',
    body: `Todos os dados inseridos no sistema (clientes, festas, transações, orçamentos) são de propriedade exclusiva do usuário/organização. O FestaHub não vende, compartilha ou usa esses dados para fins comerciais próprios.

O usuário pode solicitar a exportação ou exclusão total de seus dados a qualquer momento, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).`,
  },
  {
    title: '6. Limitação de Responsabilidade',
    body: `O FestaHub não se responsabiliza por perdas ou danos indiretos decorrentes do uso do Serviço, incluindo mas não limitado a lucros cessantes, perda de dados ou interrupção de negócios.

O Serviço é fornecido "como está" e "conforme disponível", sem garantias expressas ou implícitas de disponibilidade contínua, exceto conforme descrito no acordo de nível de serviço (SLA).

TODO: definir SLA com suporte técnico e adicionar aqui.`,
  },
  {
    title: '7. Alterações nos Termos',
    body: `O FestaHub reserva-se o direito de modificar estes termos a qualquer momento. Notificações de alterações significativas serão enviadas por e-mail com antecedência mínima de 15 (quinze) dias. O uso continuado do Serviço após as alterações constitui aceitação dos novos termos.`,
  },
  {
    title: '8. Lei Aplicável e Foro',
    body: `Estes Termos serão regidos e interpretados de acordo com as leis da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer litígios decorrentes deste instrumento, com renúncia expressa a qualquer outro foro, por mais privilegiado que seja.

TODO: confirmar foro com assessoria jurídica conforme domicílio da empresa.`,
  },
]

export default function Termos() {
  return (
    <div style={{ background: 'var(--color-background)', minHeight: '100vh' }}>
      {/* Header */}
      <header
        className="border-b"
        style={{ background: '#16131F', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-base font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              FestaHub
            </span>
          </Link>
          <Link to="/" className="text-sm text-white/50 transition-colors hover:text-white">
            ← Voltar
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-5 py-14">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>
            Legal
          </p>
          <h1
            className="mt-2 text-4xl font-extrabold text-gray-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Termos de Uso
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Última atualização: junho de 2026 ·
            {/* TODO: atualizar data a cada revisão */}
          </p>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>TODO:</strong> Este documento é um rascunho e deve ser revisado por assessoria jurídica antes de entrar em produção.
          </div>
        </div>

        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2
                className="mb-3 text-xl font-bold text-gray-900"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {s.title}
              </h2>
              <div className="space-y-3">
                {s.body.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-base leading-relaxed text-gray-600">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border p-6 text-center" style={{ borderColor: '#EDE9E3' }}>
          <p className="text-sm text-gray-500">
            Dúvidas sobre os termos?{' '}
            <a href="mailto:contato@festahub.com.br" className="font-semibold" style={{ color: 'var(--color-primary)' }}>
              contato@festahub.com.br
            </a>
          </p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <Link to="/privacidade" style={{ color: 'var(--color-primary)' }}>
              Política de Privacidade →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
