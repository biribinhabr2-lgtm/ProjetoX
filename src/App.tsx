import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Cadastro from '@/pages/Cadastro'
import AppLayout from '@/pages/app/AppLayout'
import Agenda from '@/pages/app/Agenda'
import Clientes from '@/pages/app/Clientes'
import Orcamentos from '@/pages/app/Orcamentos'
import Financeiro from '@/pages/app/Financeiro'
import Configuracoes from '@/pages/app/Configuracoes'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/app" element={<AppLayout />}>
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
