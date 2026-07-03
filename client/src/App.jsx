import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import ProtectedRoute from './layouts/ProtectedRoute.jsx';
import Login from './pages/auth/Login.jsx';
import Signup from './pages/auth/Signup.jsx';
import ChairmanAnalytics from './pages/chairman/Analytics.jsx';
import ChairmanDashboard from './pages/chairman/Dashboard.jsx';
import ChairmanReports from './pages/chairman/Reports.jsx';
import MemberDashboard from './pages/member/Dashboard.jsx';
import MemberLoans from './pages/member/Loans.jsx';
import Profile from './pages/member/Profile.jsx';
import MemberStatements from './pages/member/Statements.jsx';
import WithdrawRequest from './pages/member/WithdrawRequest.jsx';
import TreasurerDashboard from './pages/treasurer/Dashboard.jsx';
import TreasurerLoans from './pages/treasurer/Loans.jsx';
import Members from './pages/treasurer/Members.jsx';
import RecordSavings from './pages/treasurer/RecordSavings.jsx';
import ConfirmDeposits from './pages/treasurer/ConfirmDeposits.jsx';
import ConfirmLoans from './pages/treasurer/ConfirmLoans.jsx';
import TreasurerReports from './pages/treasurer/Reports.jsx';
import Withdrawals from './pages/treasurer/Withdrawals.jsx';
import { useAuth } from './context/AuthContext.jsx';

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role_code === 'MEMBER') return <MemberDashboard />;
  if (user?.role_code === 'TREASURER') return <TreasurerDashboard />;
  if (user?.role_code === 'CHAIRMAN') return <ChairmanDashboard />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="member/loans" element={<ProtectedRoute roles={['MEMBER']}><MemberLoans /></ProtectedRoute>} />
        <Route path="member/statements" element={<ProtectedRoute roles={['MEMBER']}><MemberStatements /></ProtectedRoute>} />
        <Route path="member/profile" element={<ProtectedRoute roles={['MEMBER']}><Profile /></ProtectedRoute>} />
        <Route path="member/withdraw" element={<ProtectedRoute roles={['MEMBER']}><WithdrawRequest /></ProtectedRoute>} />
        <Route path="treasurer/members" element={<ProtectedRoute roles={['TREASURER']}><Members /></ProtectedRoute>} />
        <Route path="treasurer/savings" element={<ProtectedRoute roles={['TREASURER']}><RecordSavings /></ProtectedRoute>} />
        <Route path="treasurer/confirm-deposits" element={<ProtectedRoute roles={['TREASURER']}><ConfirmDeposits /></ProtectedRoute>} />
        <Route path="treasurer/confirm-loans" element={<ProtectedRoute roles={['TREASURER']}><ConfirmLoans /></ProtectedRoute>} />
        <Route path="treasurer/loans" element={<ProtectedRoute roles={['TREASURER']}><TreasurerLoans /></ProtectedRoute>} />
        <Route path="treasurer/withdrawals" element={<ProtectedRoute roles={['TREASURER']}><Withdrawals /></ProtectedRoute>} />
        <Route path="treasurer/reports" element={<ProtectedRoute roles={['TREASURER']}><TreasurerReports /></ProtectedRoute>} />
        <Route path="chairman/analytics" element={<ProtectedRoute roles={['CHAIRMAN']}><ChairmanAnalytics /></ProtectedRoute>} />
        <Route path="chairman/reports" element={<ProtectedRoute roles={['CHAIRMAN']}><ChairmanReports /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}
