import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Hide schools link for these roles
  const shouldShowSchoolsLink = () => {
    if (!user) return true; // Show for guests
    const restrictedRoles = ['teacher', 'manager'];
    
    // Also hide for enrolled students (users with student role who have enrollments)
    if (user.role === 'student') {
      // You can add additional logic here to check if student is enrolled
      // For now, we'll hide it for all students with approved enrollments
      return false;
    }
    
    return !restrictedRoles.includes(user.role);
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-xl font-bold">
            🚗 Driving Schools Algeria
          </Link>
          
          <div className="flex items-center space-x-4">
            {shouldShowSchoolsLink() && (
              <Link to="/schools" className="hover:text-blue-200">
                Schools
              </Link>
            )}
            
            {user ? (
              <>
                <Link to="/dashboard" className="hover:text-blue-200">
                  Dashboard
                </Link>
                <Link to="/profile" className="hover:text-blue-200">
                  Profile
                </Link>
                <span className="text-blue-200">
                  {user.full_name} ({user.role})
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
