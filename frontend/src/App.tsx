import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { HomePage } from './pages/HomePage'
import { JourneyCreatePage } from './pages/JourneyCreatePage'
import { JourneyDetailPage } from './pages/JourneyDetailPage'
import { JourneysPage } from './pages/JourneysPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/journeys"
        element={
          <RequireAuth>
            <JourneysPage />
          </RequireAuth>
        }
      />
      <Route
        path="/journeys/new"
        element={
          <RequireAuth>
            <JourneyCreatePage />
          </RequireAuth>
        }
      />
      <Route
        path="/journeys/:id"
        element={
          <RequireAuth>
            <JourneyDetailPage />
          </RequireAuth>
        }
      />
    </Routes>
  )
}
