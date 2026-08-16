import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { RootLayout } from '@/app/layouts/RootLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { UpdatePasswordPage } from '@/features/auth/UpdatePasswordPage'
import { QuotePage } from '@/features/patient/QuotePage'
import { StaticPageRedirect } from '@/app/pages/StaticPageRedirect'

// Lazy-load portals to reduce initial bundle size
const PatientLayout = lazy(() =>
  import('@/app/layouts/PatientLayout').then((m) => ({ default: m.PatientLayout }))
)
const ProfessionalLayout = lazy(() =>
  import('@/app/layouts/ProfessionalLayout').then((m) => ({ default: m.ProfessionalLayout }))
)
const AdminLayout = lazy(() =>
  import('@/app/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout }))
)

// Patient pages
const PatientDashboard = lazy(() =>
  import('@/features/patient/PatientDashboard').then((m) => ({ default: m.PatientDashboard }))
)
const PatientProfile = lazy(() =>
  import('@/features/patient/pages/PatientProfile').then((m) => ({ default: m.PatientProfile }))
)
const TherapistDirectory = lazy(() =>
  import('@/features/patient/pages/TherapistDirectory').then((m) => ({ default: m.TherapistDirectory }))
)
const BookAppointment = lazy(() =>
  import('@/features/patient/pages/BookAppointment').then((m) => ({ default: m.BookAppointment }))
)
const PatientAppointments = lazy(() =>
  import('@/features/patient/pages/PatientAppointments').then((m) => ({ default: m.PatientAppointments }))
)
const PatientPrograms = lazy(() =>
  import('@/features/patient/pages/PatientPrograms').then((m) => ({ default: m.PatientPrograms }))
)
const PatientHistory = lazy(() =>
  import('@/features/patient/pages/PatientHistory').then((m) => ({ default: m.PatientHistory }))
)
const PatientPayments = lazy(() =>
  import('@/features/patient/pages/PatientPayments').then((m) => ({ default: m.PatientPayments }))
)
const PatientMessages = lazy(() =>
  import('@/features/patient/pages/PatientMessages').then((m) => ({ default: m.PatientMessages }))
)
const PatientResources = lazy(() =>
  import('@/features/patient/pages/PatientResources').then((m) => ({ default: m.PatientResources }))
)
const PatientHelp = lazy(() =>
  import('@/features/patient/pages/PatientHelp').then((m) => ({ default: m.PatientHelp }))
)
const PatientVideoRoom = lazy(() =>
  import('@/features/patient/pages/PatientVideoRoom').then((m) => ({ default: m.PatientVideoRoom }))
)

// Professional pages
const ProfessionalDashboard = lazy(() =>
  import('@/features/professional/ProfessionalDashboard').then((m) => ({ default: m.ProfessionalDashboard }))
)
const ProfessionalProfile = lazy(() =>
  import('@/features/professional/pages/ProfessionalProfile').then((m) => ({ default: m.ProfessionalProfile }))
)
const ProfessionalVerification = lazy(() =>
  import('@/features/professional/pages/ProfessionalVerification').then((m) => ({ default: m.ProfessionalVerification }))
)
const ProfessionalAgenda = lazy(() =>
  import('@/features/professional/pages/ProfessionalAgenda').then((m) => ({ default: m.ProfessionalAgenda }))
)
const ProfessionalAvailability = lazy(() =>
  import('@/features/professional/pages/ProfessionalAvailability').then((m) => ({ default: m.ProfessionalAvailability }))
)
const ProfessionalPatients = lazy(() =>
  import('@/features/professional/pages/ProfessionalPatients').then((m) => ({ default: m.ProfessionalPatients }))
)
const ProfessionalAppointments = lazy(() =>
  import('@/features/professional/pages/ProfessionalAppointments').then((m) => ({ default: m.ProfessionalAppointments }))
)
const ProfessionalVideoRoom = lazy(() =>
  import('@/features/professional/pages/ProfessionalVideoRoom').then((m) => ({ default: m.ProfessionalVideoRoom }))
)
const ProfessionalNotes = lazy(() =>
  import('@/features/professional/pages/ProfessionalNotes').then((m) => ({ default: m.ProfessionalNotes }))
)
const ProfessionalEarnings = lazy(() =>
  import('@/features/professional/pages/ProfessionalEarnings').then((m) => ({ default: m.ProfessionalEarnings }))
)
const ProfessionalMembership = lazy(() =>
  import('@/features/professional/pages/ProfessionalMembership').then((m) => ({ default: m.ProfessionalMembership }))
)
const ProfessionalMessages = lazy(() =>
  import('@/features/professional/pages/ProfessionalMessages').then((m) => ({ default: m.ProfessionalMessages }))
)
const ProfessionalResources = lazy(() =>
  import('@/features/professional/pages/ProfessionalResources').then((m) => ({ default: m.ProfessionalResources }))
)
const ProfessionalHelp = lazy(() =>
  import('@/features/professional/pages/ProfessionalHelp').then((m) => ({ default: m.ProfessionalHelp }))
)
const ProfessionalSettings = lazy(() =>
  import('@/features/professional/pages/ProfessionalSettings').then((m) => ({ default: m.ProfessionalSettings }))
)

// Admin pages
const AdminDashboard = lazy(() =>
  import('@/features/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
)
const AdminProfessionals = lazy(() =>
  import('@/features/admin/pages/AdminProfessionals').then((m) => ({ default: m.AdminProfessionals }))
)
const AdminVerification = lazy(() =>
  import('@/features/admin/pages/AdminVerification').then((m) => ({ default: m.AdminVerification }))
)
const AdminPatients = lazy(() =>
  import('@/features/admin/pages/AdminPatients').then((m) => ({ default: m.AdminPatients }))
)
const AdminAppointments = lazy(() =>
  import('@/features/admin/pages/AdminAppointments').then((m) => ({ default: m.AdminAppointments }))
)
const AdminQuotes = lazy(() =>
  import('@/features/admin/pages/AdminQuotes').then((m) => ({ default: m.AdminQuotes }))
)
const AdminFinances = lazy(() =>
  import('@/features/admin/pages/AdminFinances').then((m) => ({ default: m.AdminFinances }))
)
const AdminPayments = lazy(() =>
  import('@/features/admin/pages/AdminPayments').then((m) => ({ default: m.AdminPayments }))
)
const AdminReports = lazy(() =>
  import('@/features/admin/pages/AdminReports').then((m) => ({ default: m.AdminReports }))
)
const AdminConfig = lazy(() =>
  import('@/features/admin/pages/AdminConfig').then((m) => ({ default: m.AdminConfig }))
)
const AdminCMS = lazy(() =>
  import('@/features/admin/pages/AdminCMS').then((m) => ({ default: m.AdminCMS }))
)
const AdminAudit = lazy(() =>
  import('@/features/admin/pages/AdminAudit').then((m) => ({ default: m.AdminAudit }))
)
const AdminSupport = lazy(() =>
  import('@/features/admin/pages/AdminSupport').then((m) => ({ default: m.AdminSupport }))
)

import type { UserRole } from '@/features/auth/AuthProvider'

function ProtectedRoute({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={`/login?role=${role}`} replace />
  }

  if (user.role !== role) {
    return <Navigate to={`/${user.role}`} replace />
  }

  return <>{children}</>
}

function PortalSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="recuperar-contrasena" element={<ForgotPasswordPage />} />
        <Route path="actualizar-contrasena" element={<UpdatePasswordPage />} />
        <Route path="cotizacion" element={<QuotePage />} />
        {/* Legales: una sola fuente de verdad en el sitio estático */}
        <Route
          path="aviso-de-privacidad"
          element={<StaticPageRedirect to="/pages/aviso-privacidad.html" label="el Aviso de Privacidad" />}
        />
        <Route
          path="terminos"
          element={<StaticPageRedirect to="/pages/terminos.html" label="los Términos y Condiciones" />}
        />
        <Route
          path="cancelacion"
          element={<StaticPageRedirect to="/pages/cancelacion.html" label="la política de cancelación" />}
        />
        <Route
          path="crisis"
          element={<StaticPageRedirect to="/pages/crisis.html" label="las líneas de emergencia" />}
        />
      </Route>

      <Route
        path="/paciente"
        element={
          <ProtectedRoute role="patient">
            <PortalSuspense>
              <PatientLayout />
            </PortalSuspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<PatientDashboard />} />
        <Route path="perfil" element={<PatientProfile />} />
        <Route path="terapeutas" element={<TherapistDirectory />} />
        <Route path="agendar" element={<BookAppointment />} />
        <Route path="citas" element={<PatientAppointments />} />
        <Route path="programas" element={<PatientPrograms />} />
        <Route path="historial" element={<PatientHistory />} />
        <Route path="pagos" element={<PatientPayments />} />
        <Route path="mensajes" element={<PatientMessages />} />
        <Route path="recursos" element={<PatientResources />} />
        <Route path="cotizacion" element={<QuotePage />} />
        <Route path="ayuda" element={<PatientHelp />} />
        <Route path="sala/:appointmentId" element={<PatientVideoRoom />} />
      </Route>

      <Route
        path="/profesional"
        element={
          <ProtectedRoute role="professional">
            <PortalSuspense>
              <ProfessionalLayout />
            </PortalSuspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<ProfessionalDashboard />} />
        <Route path="perfil" element={<ProfessionalProfile />} />
        <Route path="verificacion" element={<ProfessionalVerification />} />
        <Route path="agenda" element={<ProfessionalAgenda />} />
        <Route path="disponibilidad" element={<ProfessionalAvailability />} />
        <Route path="pacientes" element={<ProfessionalPatients />} />
        <Route path="citas" element={<ProfessionalAppointments />} />
        <Route path="videollamada" element={<ProfessionalVideoRoom />} />
        <Route path="notas" element={<ProfessionalNotes />} />
        <Route path="ingresos" element={<ProfessionalEarnings />} />
        <Route path="membresia" element={<ProfessionalMembership />} />
        <Route path="mensajes" element={<ProfessionalMessages />} />
        <Route path="recursos" element={<ProfessionalResources />} />
        <Route path="configuracion" element={<ProfessionalSettings />} />
        <Route path="ayuda" element={<ProfessionalHelp />} />
        <Route path="sala/:appointmentId" element={<ProfessionalVideoRoom />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <PortalSuspense>
              <AdminLayout />
            </PortalSuspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="profesionales" element={<AdminProfessionals />} />
        <Route path="verificacion" element={<AdminVerification />} />
        <Route path="pacientes" element={<AdminPatients />} />
        <Route path="citas" element={<AdminAppointments />} />
        <Route path="cotizaciones" element={<AdminQuotes />} />
        <Route path="finanzas" element={<AdminFinances />} />
        <Route path="pagos" element={<AdminPayments />} />
        <Route path="reportes" element={<AdminReports />} />
        <Route path="configuracion" element={<AdminConfig />} />
        <Route path="cms" element={<AdminCMS />} />
        <Route path="auditoria" element={<AdminAudit />} />
        <Route path="soporte" element={<AdminSupport />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
