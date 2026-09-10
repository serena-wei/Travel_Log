import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { DashboardPage } from './pages/DashboardPage'
import { EventCreatePage } from './pages/EventCreatePage'
import { EventDetailPage } from './pages/EventDetailPage'
import { EventEditPage } from './pages/EventEditPage'
import { HomePage } from './pages/HomePage'
import { JourneyCreatePage } from './pages/JourneyCreatePage'
import { JourneyDetailPage } from './pages/JourneyDetailPage'
import { JourneyEditPage } from './pages/JourneyEditPage'
import { JourneysPage } from './pages/JourneysPage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { PublicJourneysPage } from './pages/PublicJourneysPage'
import { RegisterPage } from './pages/RegisterPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/explore"
        element={
          <RequireAuth>
            <PublicJourneysPage />
          </RequireAuth>
        }
      />
      <Route
        path="/explore/:journeyId/events/:eventId"
        element={
          <RequireAuth>
            <EventDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/explore/:id"
        element={
          <RequireAuth>
            <JourneyDetailPage />
          </RequireAuth>
        }
      />
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
        path="/journeys/:journeyId/events/new"
        element={
          <RequireAuth>
            <EventCreatePage />
          </RequireAuth>
        }
      />
      <Route
        path="/journeys/:journeyId/events/:eventId/edit"
        element={
          <RequireAuth>
            <EventEditPage />
          </RequireAuth>
        }
      />
      <Route
        path="/journeys/:journeyId/events/:eventId"
        element={
          <RequireAuth>
            <EventDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/journeys/:id/edit"
        element={
          <RequireAuth>
            <JourneyEditPage />
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
