import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { ProtectedRoute } from '@/components/ProtectedRoute'
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
import OrcamentoPublico from '@/pages/OrcamentoPublico'
import Termos from '@/pages/Termos'
import Privacidade from '@/pages/Privacidade'

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/onboarding" element={<Onboarding />} />
        {/* Rotas públicas — sem ProtectedRoute, sem authStore */}
        <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
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
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}
