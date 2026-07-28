import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import LandingPage from '../pages/LandingPage';
import { LoginPage, RegisterPage } from '../pages/AuthPages';
import ForgotPasswordPage from '../pages/Auth/ForgotPassword';
import DashboardPage from '../pages/DashboardPage';
import VisitorsPage from '../pages/VisitorsPage';
import ComplaintsPage from '../pages/ComplaintsPage';
import PaymentsPage from '../pages/PaymentsPage';
import BookingsPage from '../pages/BookingsPage';
import FacilitiesPage from '../pages/Facilities';
import NoticesPage from '../pages/NoticesPage';
import { ForumPage, NotificationsPage, VehiclesPage } from '../pages/CommunityPages';
import ProfilePage from '../pages/ProfilePage';
import MarketplacePage from '../pages/MarketplacePage';
import SettingsPage from '../pages/Settings';
import UnitsPage from '../pages/Units';
import { EmergencyPage, ReportsPage, ResidentsPage } from '../pages/AdminPages';

const For = ({ roles, children }) => <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;
const allRoles = ['Resident', 'Admin', 'SuperAdmin', 'Guard', 'Staff'];
const adminRoles = ['Admin', 'SuperAdmin'];
const residentAdminRoles = ['Resident', 'Admin', 'SuperAdmin'];
const securityRoles = ['Guard', 'Admin', 'SuperAdmin'];
const complaintRoles = ['Resident', 'Admin', 'SuperAdmin', 'Staff'];

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="visitors" element={<For roles={['Resident', ...securityRoles]}><VisitorsPage /></For>} />
        <Route path="complaints" element={<For roles={complaintRoles}><ComplaintsPage /></For>} />
        <Route path="payments" element={<For roles={residentAdminRoles}><PaymentsPage /></For>} />
        <Route path="bookings" element={<For roles={residentAdminRoles}><BookingsPage /></For>} />
        <Route path="facilities" element={<For roles={allRoles}><FacilitiesPage /></For>} />
        <Route path="marketplace" element={<For roles={allRoles}><MarketplacePage /></For>} />
        <Route path="notices" element={<For roles={allRoles}><NoticesPage /></For>} />
        <Route path="vehicles" element={<For roles={['Resident', ...securityRoles]}><VehiclesPage /></For>} />
        <Route path="forum" element={<For roles={residentAdminRoles}><ForumPage /></For>} />
        <Route path="notifications" element={<For roles={allRoles}><NotificationsPage /></For>} />
        <Route path="profile" element={<For roles={allRoles}><ProfilePage /></For>} />
        <Route path="settings" element={<For roles={allRoles}><SettingsPage /></For>} />
        <Route path="residents" element={<For roles={adminRoles}><ResidentsPage /></For>} />
        <Route path="units" element={<For roles={adminRoles}><UnitsPage /></For>} />
        <Route path="reports" element={<For roles={adminRoles}><ReportsPage /></For>} />
        <Route path="emergency" element={<For roles={['Guard', ...adminRoles]}><EmergencyPage /></For>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
