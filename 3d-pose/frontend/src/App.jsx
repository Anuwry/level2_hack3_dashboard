import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import LabelEditorPage from './pages/LabelEditorPage.jsx'
import SessionPage from './pages/SessionPage.jsx'
import CameraPage from './pages/CameraPage.jsx'
import TestPage from './pages/TestPage.jsx'
import WatchPage from './pages/WatchPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pose" element={<HomePage />} />
        <Route path="/labels" element={<LabelEditorPage />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
        <Route path="/camera" element={<CameraPage />} />
        <Route path="/watch/:sessionId" element={<WatchPage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
