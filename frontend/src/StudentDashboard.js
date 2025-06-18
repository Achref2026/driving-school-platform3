import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentDashboard = ({ user, token }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [progress, setProgress] = useState({});
  const [documentUploadModal, setDocumentUploadModal] = useState(false);
  const [uploadDocumentType, setUploadDocumentType] = useState('');

  // Get backend URL from environment
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Axios instance
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });

  useEffect(() => {
    if (user && user.role === 'student') {
      fetchDashboardData();
      fetchCourses();
      fetchNotifications();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/dashboard');
      setDashboardData(response.data);
      calculateProgress(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/api/courses');
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications');
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const calculateProgress = (data) => {
    if (!data || !data.enrollments) return;

    const progressData = {};
    data.enrollments.forEach(enrollment => {
      if (enrollment.enrollment_status === 'approved') {
        progressData[enrollment.id] = {
          theory: 0,
          park: 0,
          road: 0,
          overall: 0
        };
      }
    });
    setProgress(progressData);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending_documents':
        return 'badge bg-warning';
      case 'pending_approval':
        return 'badge bg-info';
      case 'approved':
        return 'badge bg-success';
      case 'rejected':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  };

  const handleDocumentUpload = async (event, documentType) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    try {
      setLoading(true);
      await api.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDocumentUploadModal(false);
      fetchDashboardData();
      alert('Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentIcon = (docType) => {
    switch (docType) {
      case 'profile_photo':
        return 'fas fa-user-circle';
      case 'id_card':
        return 'fas fa-id-card';
      case 'medical_certificate':
        return 'fas fa-notes-medical';
      case 'residence_certificate':
        return 'fas fa-home';
      default:
        return 'fas fa-file';
    }
  };

  const getDocumentName = (docType) => {
    const names = {
      profile_photo: 'Profile Photo',
      id_card: 'ID Card',
      medical_certificate: 'Medical Certificate',
      residence_certificate: 'Residence Certificate'
    };
    return names[docType] || docType.replace('_', ' ').toUpperCase();
  };

  if (loading && !dashboardData) {
    return (
      <div className="student-dashboard-loading text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error Loading Dashboard</h4>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="btn btn-outline-danger">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="student-dashboard pt-5 mt-5">
      <div className="container-fluid">
        {/* Header */}
        <div className="dashboard-header mb-4">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="display-5 fw-bold mb-2">
                Welcome back, {user?.first_name}! 🎓
              </h1>
              <p className="lead text-muted">
                Track your driving education progress and manage your enrollment
              </p>
            </div>
            <div className="col-lg-4 text-lg-end">
              <div className="dashboard-stats">
                <div className="stat-item">
                  <div className="stat-number display-6 fw-bold text-primary">
                    {dashboardData?.enrollments?.length || 0}
                  </div>
                  <div className="stat-label text-muted">Active Enrollments</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="row g-4 mb-4">
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <div className="icon-circle bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                  <i className="fas fa-book fa-2x"></i>
                </div>
                <h3 className="fw-bold">
                  {courses.filter(c => c.course_type === 'theory').length}
                </h3>
                <p className="text-muted mb-0">Theory Courses</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <div className="icon-circle bg-success bg-opacity-10 text-success rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                  <i className="fas fa-car fa-2x"></i>
                </div>
                <h3 className="fw-bold">
                  {courses.filter(c => c.course_type === 'park').length}
                </h3>
                <p className="text-muted mb-0">Parking Practice</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <div className="icon-circle bg-warning bg-opacity-10 text-warning rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                  <i className="fas fa-road fa-2x"></i>
                </div>
                <h3 className="fw-bold">
                  {courses.filter(c => c.course_type === 'road').length}
                </h3>
                <p className="text-muted mb-0">Road Practice</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <div className="icon-circle bg-info bg-opacity-10 text-info rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                  <i className="fas fa-certificate fa-2x"></i>
                </div>
                <h3 className="fw-bold">
                  {courses.filter(c => c.status === 'completed').length}
                </h3>
                <p className="text-muted mb-0">Completed</p>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Main Content */}
          <div className="col-lg-8">
            
            {/* Enrollments Section */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white">
                <h3 className="card-title fw-bold mb-0">Your Enrollments</h3>
              </div>
              <div className="card-body">
                {dashboardData?.enrollments && dashboardData.enrollments.length > 0 ? (
                  <div className="enrollments-list">
                    {dashboardData.enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="enrollment-card p-4 border rounded-3 mb-3">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h4 className="fw-bold mb-2">
                              {enrollment.school_name || 'Unknown School'}
                            </h4>
                            <p className="text-muted mb-2">
                              <i className="fas fa-calendar-alt me-2"></i>
                              Enrolled: {new Date(enrollment.created_at).toLocaleDateString()}
                            </p>
                            {enrollment.school_address && (
                              <p className="text-muted mb-0">
                                <i className="fas fa-map-marker-alt me-2"></i>
                                {enrollment.school_address}, {enrollment.school_state}
                              </p>
                            )}
                          </div>
                          <span className={getStatusBadgeClass(enrollment.enrollment_status)}>
                            {enrollment.enrollment_status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        
                        {/* Status-specific alerts */}
                        {enrollment.enrollment_status === 'pending_documents' && (
                          <div className="alert alert-warning">
                            <i className="fas fa-info-circle me-2"></i>
                            Please upload all required documents for approval
                            <button 
                              onClick={() => setDocumentUploadModal(true)} 
                              className="btn btn-sm btn-warning ms-2"
                            >
                              Upload Documents
                            </button>
                          </div>
                        )}
                        
                        {enrollment.enrollment_status === 'pending_approval' && (
                          <div className="alert alert-info">
                            <i className="fas fa-clock me-2"></i>
                            Your documents are being reviewed by the driving school manager.
                          </div>
                        )}
                        
                        {enrollment.enrollment_status === 'approved' && (
                          <div className="alert alert-success">
                            <i className="fas fa-check-circle me-2"></i>
                            Enrollment approved! You can start your courses.
                            <div className="mt-2">
                              <button className="btn btn-sm btn-success me-2">
                                <i className="fas fa-play me-1"></i>
                                Start Theory Course
                              </button>
                              <button className="btn btn-sm btn-outline-success">
                                <i className="fas fa-calendar me-1"></i>
                                Schedule Session
                              </button>
                            </div>
                          </div>
                        )}

                        {enrollment.enrollment_status === 'rejected' && (
                          <div className="alert alert-danger">
                            <i className="fas fa-times-circle me-2"></i>
                            <strong>Your enrollment was refused.</strong>
                            {enrollment.refusal_reason && (
                              <div className="mt-2">
                                <strong>Reason:</strong> {enrollment.refusal_reason}
                              </div>
                            )}
                            <div className="mt-2">
                              <small>You can contact the school or apply to another driving school.</small>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <i className="fas fa-graduation-cap fa-4x text-muted mb-4"></i>
                    <h5 className="fw-bold mb-3">No enrollments yet</h5>
                    <p className="text-muted mb-4">Find a driving school to get started with your journey!</p>
                    <button
                      onClick={() => window.location.href = '#schools'}
                      className="btn btn-primary"
                    >
                      <i className="fas fa-search me-2"></i>
                      Find Schools
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Course Progress Section */}
            {courses.length > 0 && (
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white">
                  <h3 className="card-title fw-bold mb-0">Course Progress</h3>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {courses.map((course) => (
                      <div key={course.id} className="col-md-6">
                        <div className="course-card p-3 border rounded-3">
                          <div className="d-flex align-items-center mb-3">
                            <div className={`course-icon me-3 text-${course.course_type === 'theory' ? 'primary' : course.course_type === 'park' ? 'success' : 'warning'}`}>
                              <i className={`fas fa-${course.course_type === 'theory' ? 'book' : course.course_type === 'park' ? 'car' : 'road'} fa-2x`}></i>
                            </div>
                            <div>
                              <h5 className="mb-1">{course.course_type.charAt(0).toUpperCase() + course.course_type.slice(1)} Course</h5>
                              <small className="text-muted">
                                {course.completed_sessions}/{course.total_sessions} sessions
                              </small>
                            </div>
                          </div>
                          
                          <div className="progress mb-2">
                            <div 
                              className="progress-bar" 
                              role="progressbar" 
                              style={{width: `${(course.completed_sessions / course.total_sessions) * 100}%`}}
                            >
                              {Math.round((course.completed_sessions / course.total_sessions) * 100)}%
                            </div>
                          </div>
                          
                          <div className="d-flex justify-content-between align-items-center">
                            <span className={`badge ${course.status === 'completed' ? 'bg-success' : course.status === 'available' ? 'bg-primary' : 'bg-secondary'}`}>
                              {course.status}
                            </span>
                            {course.status === 'available' && (
                              <button className="btn btn-sm btn-outline-primary">
                                Continue
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="col-lg-4">
            
            {/* Document Status */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white">
                <h3 className="card-title fw-bold mb-0">Document Status</h3>
              </div>
              <div className="card-body">
                {dashboardData?.documents ? (
                  <div className="documents-list">
                    {['profile_photo', 'id_card', 'medical_certificate', 'residence_certificate'].map((docType) => {
                      const uploaded = dashboardData.documents.find(doc => doc.document_type === docType);
                      return (
                        <div key={docType} className="document-item d-flex justify-content-between align-items-center p-2 border-bottom">
                          <div className="d-flex align-items-center">
                            <i className={`${getDocumentIcon(docType)} me-3 fa-lg text-${uploaded ? uploaded.status === 'accepted' ? 'success' : uploaded.status === 'refused' ? 'danger' : 'warning' : 'muted'}`}></i>
                            <div>
                              <div className="fw-bold">{getDocumentName(docType)}</div>
                              {uploaded && uploaded.status === 'refused' && (
                                <small className="text-danger">{uploaded.refusal_reason}</small>
                              )}
                            </div>
                          </div>
                          <div>
                            {uploaded ? (
                              <span className={`badge ${uploaded.status === 'accepted' ? 'bg-success' : uploaded.status === 'refused' ? 'bg-danger' : 'bg-warning'}`}>
                                {uploaded.status}
                              </span>
                            ) : (
                              <button 
                                onClick={() => {
                                  setUploadDocumentType(docType);
                                  setDocumentUploadModal(true);
                                }}
                                className="btn btn-sm btn-outline-primary"
                              >
                                Upload
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <i className="fas fa-file-upload fa-3x text-muted mb-3"></i>
                    <p className="text-muted">No documents uploaded yet</p>
                    <button 
                      onClick={() => setDocumentUploadModal(true)}
                      className="btn btn-primary btn-sm"
                    >
                      Upload Documents
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Notifications */}
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h3 className="card-title fw-bold mb-0">Recent Notifications</h3>
              </div>
              <div className="card-body">
                {notifications.length > 0 ? (
                  <div className="notifications-list">
                    {notifications.slice(0, 5).map((notification) => (
                      <div key={notification.id} className={`notification-item p-3 border rounded-3 mb-2 ${!notification.is_read ? 'bg-light' : ''}`}>
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">{notification.title}</h6>
                            <p className="small text-muted mb-1">{notification.message}</p>
                            <small className="text-muted">
                              {new Date(notification.created_at).toLocaleDateString()}
                            </small>
                          </div>
                          {!notification.is_read && (
                            <div className="notification-indicator bg-primary rounded-circle" style={{width: '8px', height: '8px'}}></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <i className="fas fa-bell fa-3x text-muted mb-3"></i>
                    <p className="text-muted">No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Upload Modal */}
      {documentUploadModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Upload Document</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setDocumentUploadModal(false)}
                ></button>
              </div>
              <form onSubmit={(e) => handleDocumentUpload(e, uploadDocumentType)}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Document Type</label>
                    <select 
                      name="document_type"
                      className="form-select"
                      value={uploadDocumentType}
                      onChange={(e) => setUploadDocumentType(e.target.value)}
                      required
                    >
                      <option value="">Select document type...</option>
                      <option value="profile_photo">Profile Photo</option>
                      <option value="id_card">ID Card</option>
                      <option value="medical_certificate">Medical Certificate</option>
                      <option value="residence_certificate">Residence Certificate</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Select File</label>
                    <input 
                      type="file" 
                      name="file"
                      className="form-control"
                      accept="image/*,.pdf"
                      required
                    />
                    <div className="form-text">
                      Accepted formats: JPG, PNG, PDF (Max 5MB)
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setDocumentUploadModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Upload Document
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;