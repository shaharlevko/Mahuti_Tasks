import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import SharedView from './components/SharedView.jsx'
import UserManager from './components/UserManager.jsx'
import InviteAccept from './components/InviteAccept.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin/users" element={<UserManager />} />
          <Route path="/invite/:token" element={<InviteAccept />} />
          <Route path="/shared/:scheduleId" element={<SharedView />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
