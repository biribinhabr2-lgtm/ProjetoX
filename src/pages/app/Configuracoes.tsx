import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Configuracoes() {
  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Gerencie os dados da sua organização"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ fontFamily: 'var(--font-display)' }}>
              Dados do buffet
            </CardTitle>
            <CardDescription>Nome, cidade, telefone e logo</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Em breve…</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ fontFamily: 'var(--font-display)' }}>
              Plano e cobrança
            </CardTitle>
            <CardDescription>Gerencie sua assinatura</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Em breve…</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
