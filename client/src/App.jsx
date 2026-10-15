import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Overview from './pages/Overview.jsx';
import Tour from './pages/Tour.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Account from './pages/Account.jsx';
import MyTours from './pages/MyTours.jsx';
import MyReviews from './pages/MyReviews.jsx';
import Billing from './pages/Billing.jsx';
import { About, BecomeGuide, Careers } from './pages/InfoPages.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminTours from './pages/admin/AdminTours.jsx';
import AdminTourForm from './pages/admin/AdminTourForm.jsx';
import AdminBookings from './pages/admin/AdminBookings.jsx';
import AdminReviews from './pages/admin/AdminReviews.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="tour/:slug" element={<Tour />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />
        <Route
          path="me"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-tours"
          element={
            <ProtectedRoute>
              <MyTours />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-reviews"
          element={
            <ProtectedRoute>
              <MyReviews />
            </ProtectedRoute>
          }
        />
        <Route
          path="billing"
          element={
            <ProtectedRoute>
              <Billing />
            </ProtectedRoute>
          }
        />
        <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="admin/tours" element={<AdminRoute><AdminTours /></AdminRoute>} />
        <Route path="admin/tours/new" element={<AdminRoute><AdminTourForm /></AdminRoute>} />
        <Route path="admin/tours/:id/edit" element={<AdminRoute><AdminTourForm /></AdminRoute>} />
        <Route path="admin/bookings" element={<AdminRoute><AdminBookings /></AdminRoute>} />
        <Route path="admin/reviews" element={<AdminRoute><AdminReviews /></AdminRoute>} />
        <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="about" element={<About />} />
        <Route path="become-a-guide" element={<BecomeGuide />} />
        <Route path="careers" element={<Careers />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
