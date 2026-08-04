import { ThemeProvider } from '../contexts/ThemeContext';
import AdminDashboard from '../components/admin/AdminDashboard';

export default function AdminDashboardPage() {
  return (
    <ThemeProvider>
      <AdminDashboard />
    </ThemeProvider>
  );
}
