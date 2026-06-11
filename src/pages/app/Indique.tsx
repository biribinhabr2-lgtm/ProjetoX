import { useState } from 'react'
import { Copy, Check, Gift, Users } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

const BASE_URL = 'https://festahub.com.br'

export default function Indique() {
  const organization = useAuthStore((s) => s.organization)
  const [copied, setCopied] = useState(false)

  const slug = organization?.slug ?? ''
  const referralLink = `${BASE_URL}/cadastro?ref=${slug}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('Link copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar. Selecione o link manualmente.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indicar amigos"
        description="Compartilhe o FestaHub com outros buffets e brinquedotecas"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card principal — link de indicação */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base" style={{ fontFamily: 'var(--font-display)' }}>
                Seu link de indicação
              </CardTitle>
            </div>
            <CardDescription>
              Envie este link para outros buffets. Quando eles se cadastrarem pelo seu link,
              ficamos sabendo que foi você quem indicou.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Link display */}
            <div
              className="flex items-center gap-3 rounded-xl border px-4 py-3"
              style={{ background: 'var(--color-primary-light)', borderColor: 'var(--color-primary)' }}
            >
              <span
                className="min-w-0 flex-1 truncate text-sm font-medium"
                style={{ color: 'var(--color-primary)' }}
              >
                {referralLink}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0 gap-1.5"
              >
                {copied
                  ? <><Check className="h-3.5 w-3.5" /> Copiado!</>
                  : <><Copy className="h-3.5 w-3.5" /> Copiar</>
                }
              </Button>
            </div>

            {/* Como funciona */}
            <p className="text-sm text-muted-foreground">
              <strong>Como funciona:</strong> quem acessar este link e criar uma conta terá o cadastro
              associado ao seu buffet. Em breve teremos benefícios para indicações — fique ligado! 🎈
            </p>
          </CardContent>
        </Card>

        {/* Card — como compartilhar */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base" style={{ fontFamily: 'var(--font-display)' }}>
                Como compartilhar
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                'Envie o link pelo WhatsApp para outros donos de buffet',
                'Compartilhe no grupo de associações de buffets da sua cidade',
                'Poste no seu Instagram com a experiência que você teve',
                'Indique para brinquedotecas, espaços de festas e salões',
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: 'var(--color-primary)' }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Card — WhatsApp rápido */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ fontFamily: 'var(--font-display)' }}>
              Compartilhar agora
            </CardTitle>
            <CardDescription>Abra direto no WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Oi! Estou usando o FestaHub para gerenciar meu buffet e recomendo muito. Você pode testar grátis por 14 dias, sem cartão: ${referralLink}`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#25D366' }}
            >
              {/* WhatsApp icon inline */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Enviar pelo WhatsApp
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
