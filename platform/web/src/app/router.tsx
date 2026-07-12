import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { RootLayout } from '@/app/layouts/RootLayout'
import { PatientLayout } from '@/app/layouts/PatientLayout'
import { ProfessionalLayout } from '@/app/layouts/ProfessionalLayout'
import { AdminLayout } from '@/app/layouts/AdminLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { QuotePage } from '@/features/patient/QuotePage'

// Patient pages
import { PatientDashboard } from '@/features/patient/PatientDashboard'
import { PatientProfile } from '@/features/patient/pages/PatientProfile'
import { TherapistDirectory } from '@/features/patient/pages/TherapistDirectory'
import { BookAppointment } from '@/features/patient/pages/BookAppointment'
import { PatientAppointments } from '@/features/patient/pages/PatientAppointments'
import { PatientPrograms } from '@/features/patient/pages/PatientPrograms'
import { PatientHistory } from '@/features/patient/pages/PatientHistory'
import { PatientPayments } from '@/features/patient/pages/PatientPayments'
import { PatientMessages } from '@/features/patient/pages/PatientMessages'
import { PatientResources } from '@/features/patient/pages/PatientResources'
import { PatientHelp } from '@/features/patient/pages/PatientHelp'

// Professional pages
import { ProfessionalDashboard } from '@/features/professional/ProfessionalDashboard'
import { ProfessionalProfile } from '@/features/professional/pages/ProfessionalProfile'
import { ProfessionalVerification } from '@/features/professional/pages/ProfessionalVerification'
import { ProfessionalAgenda } from '@/features/professional/pages/ProfessionalAgenda'
import { ProfessionalAvailability } from '@/features/professional/pages/ProfessionalAvailability'
import { ProfessionalPatients } from '@/features/professional/pages/ProfessionalPatients'
import { ProfessionalAppointments } from '@/features/professional/pages/ProfessionalAppointments'
import { ProfessionalVideoRoom } from '@/features/professional/pages/ProfessionalVideoRoom'
import { PatientVideoRoom } from '@/features/patient/pages/PatientVideoRoom'
import { ProfessionalNotes } from '@/features/professional/pages/ProfessionalNotes'
import { ProfessionalEarnings } from '@/features/professional/pages/ProfessionalEarnings'
import { ProfessionalMembership } from '@/features/professional/pages/ProfessionalMembership'
import { ProfessionalMessages } from '@/features/professional/pages/ProfessionalMessages'
import { ProfessionalResources } from '@/features/professional/pages/ProfessionalResources'
import { ProfessionalHelp } from '@/features/professional/pages/ProfessionalHelp'
import { ProfessionalSettings } from '@/features/professional/pages/ProfessionalSettings'

// Admin pages
import { AdminDashboard } from '@/features/admin/AdminDashboard'
import { AdminProfessionals } from '@/features/admin/pages/AdminProfessionals'
import { AdminPatients } from '@/features/admin/pages/AdminPatients'
import { AdminAppointments } from '@/features/admin/pages/AdminAppointments'
import { AdminQuotes } from '@/features/admin/pages/AdminQuotes'
import { AdminFinances } from '@/features/admin/pages/AdminFinances'
import { AdminPayments } from '@/features/admin/pages/AdminPayments'
import { AdminReports } from '@/features/admin/pages/AdminReports'
import { AdminConfig } from '@/features/admin/pages/AdminConfig'
import { AdminCMS } from '@/features/admin/pages/AdminCMS'
import { AdminAudit } from '@/features/admin/pages/AdminAudit'
import { AdminSupport } from '@/features/admin/pages/AdminSupport'

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

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="cotizacion" element={<QuotePage />} />
      </Route>

      <Route
        path="/paciente"
        element={
          <ProtectedRoute role="patient">
            <PatientLayout />
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
            <ProfessionalLayout />
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
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="profesionales" element={<AdminProfessionals />} />
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
