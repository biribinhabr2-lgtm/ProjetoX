/**
 * Política de Privacidade
 * TODO: revisar com assessoria jurídica antes de publicar em produção.
 * Em conformidade com a LGPD (Lei nº 13.709/2018).
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
    title: '1. Quem somos (Controlador dos dados)',
    body: `O FestaHub é o controlador dos dados pessoais tratados nesta Política. Nosso contato para assuntos relacionados à privacidade é: privacidade@festahub.com.br.

TODO: incluir CNPJ, razão social e endereço da empresa após constituição jurídica.`,
  },
  {
    title: '2. Quais dados coletamos',
    body: `Coletamos os seguintes dados pessoais:

• Dados de cadastro: nome completo, e-mail, telefone.
• Dados da organização: nome do buffet, cidade, telefone comercial.
• Dados operacionais inseridos pelo usuário: informações de clientes (nome, telefone, e-mail, dados de crianças como nome e data de nascimento), festas, orçamentos e transações financeiras.
• Dados de uso: logs de acesso, endereço IP, navegador, sistema operacional — coletados automaticamente para fins de segurança e melhoria do serviço.
• Dados de pagamento: gerenciados diretamente pelo Mercado Pago; o FestaHub não armazena dados de cartão de crédito.

Não coletamos dados sensíveis como origem racial, convicções religiosas, dados de saúde ou biometria.`,
  },
  {
    title: '3. Finalidade do tratamento',
    body: `Usamos seus dados para:

• Prestar o Serviço contratado (agenda, orçamentos, financeiro, radar de aniversários).
• Autenticação e segurança da conta.
• Comunicações transacionais (confirmações, notificações do sistema).
• Suporte ao cliente.
• Cumprimento de obrigações legais e regulatórias.
• Melhoria do produto (análise agregada e anônima de uso).

Não usamos seus dados para publicidade de terceiros, perfis comportamentais ou venda a anunciantes.`,
  },
  {
    title: '4. Base legal (LGPD)',
    body: `O tratamento dos seus dados se baseia nas seguintes hipóteses previstas na LGPD (Art. 7º):

• Execução de contrato: para cumprir o acordo de prestação de serviço.
• Legítimo interesse: para segurança, prevenção de fraudes e melhoria do produto.
• Cumprimento de obrigação legal: quando exigido por lei.
• Consentimento: para comunicações de marketing (você pode revogar a qualquer momento).`,
  },
  {
    title: '5. Com quem compartilhamos',
    body: `Compartilhamos dados apenas com:

• Supabase (infraestrutura de banco de dados e autenticação) — servidores na AWS us-east-1.
• Mercado Pago (processamento de pagamentos).
• Vercel (hospedagem do frontend).

Todos os subprocessadores operam sob contratos de proteção de dados adequados. Não vendemos dados a terceiros.

TODO: adicionar DPA (Data Processing Agreement) com cada subprocessador e listar versões/regiões.`,
  },
  {
    title: '6. Retenção de dados',
    body: `Mantemos seus dados enquanto sua conta estiver ativa. Após o cancelamento:

• Dados operacionais são retidos por 90 dias para possibilidade de reativação.
• Após 90 dias, todos os dados pessoais são deletados permanentemente, exceto aqueles necessários para cumprimento de obrigação legal (ex.: registros fiscais por 5 anos).

Você pode solicitar a exclusão imediata dos seus dados a qualquer momento pelo e-mail de privacidade.`,
  },
  {
    title: '7. Seus direitos (LGPD, Art. 18)',
    body: `Como titular dos dados, você tem direito a:

• Confirmação da existência de tratamento.
• Acesso aos seus dados.
• Correção de dados incompletos, inexatos ou desatualizados.
• Anonimização, bloqueio ou eliminação de dados desnecessários.
• Portabilidade dos dados a outro fornecedor.
• Eliminação dos dados tratados com base no seu consentimento.
• Informação sobre com quem seus dados são compartilhados.
• Revogação do consentimento.

Para exercer qualquer direito, entre em contato: privacidade@festahub.com.br. Respondemos em até 15 dias úteis.`,
  },
  {
    title: '8. Segurança',
    body: `Adotamos medidas técnicas e organizacionais para proteger seus dados:

• Criptografia em trânsito (TLS 1.3) e em repouso (AES-256).
• Row Level Security (RLS) no banco de dados — cada organização acessa apenas seus próprios dados.
• Autenticação segura via Supabase Auth com suporte a MFA.
• Logs de auditoria para operações sensíveis.
• Acesso interno restrito por princípio do menor privilégio.

TODO: adicionar política de resposta a incidentes e prazos de notificação à ANPD.`,
  },
  {
    title: '9. Cookies',
    body: `O FestaHub usa cookies essenciais para autenticação e funcionamento do sistema. Não usamos cookies de rastreamento ou publicidade de terceiros.

TODO: implementar banner de cookie e mecanismo de opt-out se adicionados cookies analíticos no futuro.`,
  },
  {
    title: '10. Alterações nesta Política',
    body: `Podemos atualizar esta Política periodicamente. Notificações de alterações relevantes serão enviadas por e-mail. A data da última atualização consta no início deste documento.

O uso continuado do Serviço após alterações indica sua concordância com a nova versão.`,
  },
]

export default function Privacidade() {
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
            Política de Privacidade
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Última atualização: junho de 2026 · Em conformidade com a LGPD (Lei nº 13.709/2018)
            {/* TODO: atualizar data a cada revisão */}
          </p>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>TODO:</strong> Este documento é um rascunho e deve ser revisado por assessoria jurídica especializada em LGPD antes de entrar em produção.
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
                  <p key={i} className="text-base leading-relaxed text-gray-600 whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border p-6 text-center" style={{ borderColor: '#EDE9E3' }}>
          <p className="text-sm font-semibold text-gray-700">
            Encarregado de Proteção de Dados (DPO)
          </p>
          <p className="mt-1 text-sm text-gray-500">
            TODO: nomear DPO conforme exigido pela LGPD para empresas que tratam dados em larga escala.
          </p>
          <a
            href="mailto:privacidade@festahub.com.br"
            className="mt-3 block text-sm font-semibold"
            style={{ color: 'var(--color-primary)' }}
          >
            privacidade@festahub.com.br
          </a>
          <div className="mt-5 flex justify-center gap-4 text-sm">
            <Link to="/termos" style={{ color: 'var(--color-primary)' }}>
              Termos de Uso →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
