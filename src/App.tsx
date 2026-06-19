import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { useAuthStore } from '@/stores/authStore'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Cadastro from '@/pages/Cadastro'
import Onboarding from '@/pages/Onboarding'
import AppLayout from '@/pages/app/AppLayout'
import Agenda from '@/pages/app/Agenda'
import Clientes from '@/pages/app/Clientes'
import Orcamentos from '@/pages/app/Orcamentos'
import Financeiro from '@/pages/app/Financeiro'
import Configuracoes from '@/pages/app/Configuracoes'
import Indique from '@/pages/app/Indique'
import Catalogo from '@/pages/app/Catalogo'
import Equipe from '@/pages/app/Equipe'
import Escala from '@/pages/app/Escala'
import Admin from '@/pages/app/Admin'
import Eventos from '@/pages/app/Eventos'
import OrcamentoPublico from '@/pages/OrcamentoPublico'
import Convite from '@/pages/Convite'
import SemAcesso from '@/pages/SemAcesso'
import Termos from '@/pages/Termos'
import Privacidade from '@/pages/Privacidade'

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/onboarding" element={<Onboarding />} />
        {/* Rotas públicas — sem ProtectedRoute, sem authStore */}
        <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
        <Route path="/convite/:token" element={<Convite />} />
        <Route path="/sem-acesso" element={<SemAcesso />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/agenda" replace />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="orcamentos" element={<Orcamentos />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="catalogo" element={<Catalogo />} />
          <Route path="equipe" element={<Equipe />} />
          <Route path="escala" element={<Escala />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="indique" element={<Indique />} />
          <Route path="admin" element={<Admin />} />
          <Route path="eventos" element={<Eventos />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-right" />
      <Analytics />
    </BrowserRouter>
    </ErrorBoundary>
  )
}
