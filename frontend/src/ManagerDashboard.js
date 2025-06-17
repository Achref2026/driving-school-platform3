import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ManagerDashboard = ({ user, token }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [schoolData, setSchoolData] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showRefusalModal, setShowRefusalModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [refusalReason, setRefusalReason] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [studentDocuments, setStudentDocuments] = useState([]);

  // Form states
  const [teacherForm, setTeacherForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: 'male',
    password: '', // Added password field
    can_teach_male: true,
    can_teach_female: true
  });

  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    course_type: 'theory',
    difficulty: 'medium',
    passing_score: 70,
    time_limit_minutes: 30,
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    explanation: ''
  });

  useEffect(() => {
    fetchManagerData();
  }, [user]);

  const fetchManagerData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch school data
      const schoolResponse = await axios.get(`${API}/schools/my`, { headers });
      setSchoolData(schoolResponse.data);

      // Fetch enrollments
      const enrollmentsResponse = await axios.get(`${API}/manager/enrollments`, { headers });
      setEnrollments(enrollmentsResponse.data.enrollments || []);

      // Fetch teachers
      const teachersResponse = await axios.get(`${API}/teachers/my`, { headers });
      setTeachers(teachersResponse.data.teachers || []);

      // Fetch analytics
      const analyticsResponse = await axios.get(`${API}/analytics/school-overview`, { headers });
      setAnalytics(analyticsResponse.data);

      // Fetch quizzes
      const quizzesResponse = await axios.get(`${API}/quizzes/my`, { headers });
      setQuizzes(quizzesResponse.data.quizzes || []);

      // Fetch sessions
      const sessionsResponse = await axios.get(`${API}/sessions/school`, { headers });
      setSessions(sessionsResponse.data.sessions || []);

      // Fetch pending documents using the new endpoint
      try {
        const pendingDocsResponse = await axios.get(`${API}/managers/pending-documents`, { headers });
        setPendingDocuments(pendingDocsResponse.data.documents || []);
      } catch (docError) {
        console.warn('Could not fetch pending documents:', docError);
        setPendingDocuments([]);
      }

    } catch (error) {
      console.error('Error fetching manager data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocuments = async (enrollmentId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/manager/enrollments/${enrollmentId}/documents`, { headers });
      
      setStudentDocuments(response.data);
      setShowDocumentsModal(true);
    } catch (error) {
      console.error('Error fetching student documents:', error);
      alert('Failed to load student documents');
    }
  };

  const handleApproveEnrollment = async (enrollmentId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/manager/enrollments/${enrollmentId}/approve`, {}, { headers });
      
      setEnrollments(prev => 
        prev.map(enrollment => 
          enrollment.id === enrollmentId 
            ? { ...enrollment, enrollment_status: 'approved' }
            : enrollment
        )
      );
      
      alert('Enrollment approved successfully!');
    } catch (error) {
      console.error('Error approving enrollment:', error);
      alert('Failed to approve enrollment');
    }
  };

  const handleRejectEnrollment = async (enrollment) => {
    // Set the enrollment to be rejected and show the modal
    setSelectedEnrollment(enrollment);
    setRefusalReason('');
    setShowRefusalModal(true);
  };

  const handleSubmitEnrollmentRejection = async () => {
    if (!refusalReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const formData = new FormData();
      formData.append('reason', refusalReason);
      
      await axios.post(`${API}/manager/enrollments/${selectedEnrollment.id}/reject`, formData, { headers });
      
      setEnrollments(prev => 
        prev.map(enrollment => 
          enrollment.id === selectedEnrollment.id 
            ? { ...enrollment, enrollment_status: 'rejected' }
            : enrollment
        )
      );
      
      setShowRefusalModal(false);
      setSelectedEnrollment(null);
      setRefusalReason('');
      
      alert('Enrollment rejected successfully');
    } catch (error) {
      console.error('Error rejecting enrollment:', error);
      alert('Failed to reject enrollment');
    }
  };

  const handleVerifyDocument = async (documentId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const formData = new FormData();
      formData.append('is_verified', 'true');
      
      await axios.post(`${API}/documents/verify/${documentId}`, formData, { headers });
      
      // Update the document status in the UI
      setStudentDocuments(prev => ({
        ...prev,
        documents: prev.documents.map(doc => 
          doc.id === documentId 
            ? { ...doc, is_verified: true }
            : doc
        )
      }));
      
      // Refresh the enrollments list to get updated enrollment status
      const enrollmentsResponse = await axios.get(`${API}/manager/enrollments`, { headers });
      setEnrollments(enrollmentsResponse.data.enrollments || []);
      
      alert('Document verified successfully!');
    } catch (error) {
      console.error('Error verifying document:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to verify document';
      alert(errorMessage);
    }
  };

  const handleAcceptDocument = async (documentId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/documents/accept/${documentId}`, {}, { headers });
      
      // Update the document status in the UI
      setStudentDocuments(prev => ({
        ...prev,
        documents: prev.documents.map(doc => 
          doc.id === documentId 
            ? { ...doc, status: 'accepted', is_verified: true, refusal_reason: null }
            : doc
        )
      }));
      
      // Refresh the enrollments list to get updated enrollment status
      const enrollmentsResponse = await axios.get(`${API}/manager/enrollments`, { headers });
      setEnrollments(enrollmentsResponse.data.enrollments || []);
      
      alert('Document accepted successfully!');
    } catch (error) {
      console.error('Error accepting document:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to accept document';
      alert(errorMessage);
    }
  };

  const handleRefuseDocument = (document) => {
    setSelectedDocument(document);
    setRefusalReason('');
    setShowRefusalModal(true);
  };

  const handleSubmitRefusal = async () => {
    if (!refusalReason.trim()) {
      alert('Please provide a reason for refusal');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const formData = new FormData();
      formData.append('reason', refusalReason);
      
      await axios.post(`${API}/documents/refuse/${selectedDocument.id}`, formData, { headers });
      
      // Update the document status in the UI
      setStudentDocuments(prev => ({
        ...prev,
        documents: prev.documents.map(doc => 
          doc.id === selectedDocument.id 
            ? { ...doc, status: 'refused', is_verified: false, refusal_reason: refusalReason }
            : doc
        )
      }));
      
      // Also remove from pending documents if it's there
      setPendingDocuments(prev => prev.filter(doc => doc.id !== selectedDocument.id));
      
      setShowRefusalModal(false);
      setSelectedDocument(null);
      setRefusalReason('');
      
      alert('Document refused successfully!');
    } catch (error) {
      console.error('Error refusing document:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to refuse document';
      alert(errorMessage);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    
    // Validate password
    if (!teacherForm.password || teacherForm.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API}/teachers/add`, teacherForm, { headers });
      
      // Update the teachers list with the new teacher
      if (response.data.teacher) {
        setTeachers(prev => [...prev, response.data.teacher]);
      }
      
      setShowTeacherModal(false);
      setTeacherForm({
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        address: '',
        date_of_birth: '',
        gender: 'male',
        password: '', // Reset password field
        can_teach_male: true,
        can_teach_female: true
      });
      
      alert(`Teacher added successfully! Teacher can login with email: ${teacherForm.email} and the password you provided.`);
    } catch (error) {
      console.error('Error adding teacher:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to add teacher';
      alert(errorMessage);
    }
  };

  const handleRemoveTeacher = async (teacherId) => {
    if (!window.confirm('Are you sure you want to remove this teacher?')) return;
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API}/teachers/${teacherId}`, { headers });
      
      setTeachers(prev => prev.filter(teacher => teacher.id !== teacherId));
      alert('Teacher removed successfully');
    } catch (error) {
      console.error('Error removing teacher:', error);
      alert('Failed to remove teacher');
    }
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API}/quizzes`, quizForm, { headers });
      
      setQuizzes(prev => [...prev, response.data]);
      setShowQuizModal(false);
      setQuizForm({
        title: '',
        description: '',
        course_type: 'theory',
        difficulty: 'medium',
        passing_score: 70,
        time_limit_minutes: 30,
        questions: []
      });
      
      alert('Quiz created successfully!');
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('Failed to create quiz');
    }
  };

  const addQuestionToQuiz = () => {
    if (!currentQuestion.question || currentQuestion.options.some(opt => !opt)) {
      alert('Please fill all question fields');
      return;
    }

    setQuizForm(prev => ({
      ...prev,
      questions: [...prev.questions, { ...currentQuestion }]
    }));

    setCurrentQuestion({
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      explanation: ''
    });
  };

  const removeQuestionFromQuiz = (index) => {
    setQuizForm(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleQuickAcceptDocument = async (documentId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/documents/accept/${documentId}`, {}, { headers });
      
      // Remove the document from pending list
      setPendingDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      // Refresh enrollments to get updated status
      try {
        const enrollmentsResponse = await axios.get(`${API}/managers/pending-enrollments`, { headers });
        setEnrollments(enrollmentsResponse.data.enrollments || []);
      } catch (err) {
        console.warn('Could not refresh enrollments:', err);
      }
      
      alert('Document accepted successfully!');
    } catch (error) {
      console.error('Error accepting document:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to accept document';
      alert(errorMessage);
    }
  };

  const handleQuickRefuseDocument = (document) => {
    setSelectedDocument(document);
    setRefusalReason('');
    setShowRefusalModal(true);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'bg-success';
      case 'pending_approval': return 'bg-warning';
      case 'pending_documents': return 'bg-info';
      case 'rejected': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      <div className="container-fluid px-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center py-4">
          <div>
            <h1 className="h3 mb-0">Manager Dashboard</h1>
            <p className="text-muted mb-0">
              {schoolData?.name || 'Driving School Management'}
            </p>
          </div>
          <div className="d-flex gap-2">
            <button
              onClick={() => setShowTeacherModal(true)}
              className="btn btn-primary"
            >
              <i className="fas fa-user-plus me-2"></i>
              Add Teacher
            </button>
            <button
              onClick={() => setShowQuizModal(true)}
              className="btn btn-success"
            >
              <i className="fas fa-plus me-2"></i>
              Create Quiz
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <ul className="nav nav-pills mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <i className="fas fa-chart-line me-2"></i>Overview
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'enrollments' ? 'active' : ''}`}
              onClick={() => setActiveTab('enrollments')}
            >
              <i className="fas fa-users me-2"></i>Enrollments ({enrollments.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'teachers' ? 'active' : ''}`}
              onClick={() => setActiveTab('teachers')}
            >
              <i className="fas fa-chalkboard-teacher me-2"></i>Teachers ({teachers.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'quizzes' ? 'active' : ''}`}
              onClick={() => setActiveTab('quizzes')}
            >
              <i className="fas fa-question-circle me-2"></i>Quizzes ({quizzes.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => setActiveTab('sessions')}
            >
              <i className="fas fa-calendar me-2"></i>Sessions ({sessions.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <i className="fas fa-chart-bar me-2"></i>Analytics
            </button>
          </li>
        </ul>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="row g-4">
            {/* Key Metrics */}
            <div className="col-md-3">
              <div className="card bg-primary text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <div className="h4 mb-0">{enrollments.length}</div>
                      <div className="small">Total Enrollments</div>
                    </div>
                    <div className="h1 opacity-50">
                      <i className="fas fa-users"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card bg-success text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <div className="h4 mb-0">{teachers.length}</div>
                      <div className="small">Active Teachers</div>
                    </div>
                    <div className="h1 opacity-50">
                      <i className="fas fa-chalkboard-teacher"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card bg-info text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <div className="h4 mb-0">{quizzes.length}</div>
                      <div className="small">Created Quizzes</div>
                    </div>
                    <div className="h1 opacity-50">
                      <i className="fas fa-question-circle"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card bg-warning text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <div className="h4 mb-0">{pendingDocuments.length}</div>
                      <div className="small">Pending Documents</div>
                    </div>
                    <div className="h1 opacity-50">
                      <i className="fas fa-file-alt"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Approvals Alert */}
            {enrollments.filter(e => e.enrollment_status === 'pending_approval').length > 0 && (
              <div className="col-12">
                <div className="alert alert-warning d-flex align-items-center" role="alert">
                  <i className="fas fa-exclamation-triangle fa-2x me-3"></i>
                  <div className="flex-grow-1">
                    <h5 className="alert-heading mb-1">Action Required!</h5>
                    <p className="mb-0">
                      You have <strong>{enrollments.filter(e => e.enrollment_status === 'pending_approval').length}</strong> student enrollment(s) waiting for your approval.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('enrollments')}
                    className="btn btn-warning"
                  >
                    <i className="fas fa-eye me-2"></i>
                    Review Now
                  </button>
                </div>
              </div>
            )}

            {/* Pending Approvals Section */}
            {enrollments.filter(e => e.enrollment_status === 'pending_approval').length > 0 && (
              <div className="col-12">
                <div className="card border-warning">
                  <div className="card-header bg-warning text-dark">
                    <h5 className="card-title mb-0">
                      <i className="fas fa-clock me-2"></i>
                      Pending Approvals ({enrollments.filter(e => e.enrollment_status === 'pending_approval').length})
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Email</th>
                            <th>Enrolled</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enrollments
                            .filter(e => e.enrollment_status === 'pending_approval')
                            .slice(0, 5)
                            .map((enrollment) => (
                            <tr key={enrollment.id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="avatar bg-warning text-dark rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                    {enrollment.student_name?.charAt(0) || 'S'}
                                  </div>
                                  <div>
                                    <div className="fw-bold">{enrollment.student_name}</div>
                                    <div className="small text-muted">Waiting for approval</div>
                                  </div>
                                </div>
                              </td>
                              <td>{enrollment.student_email}</td>
                              <td>{new Date(enrollment.created_at).toLocaleDateString()}</td>
                              <td>
                                <div className="d-flex gap-2">
                                  <button
                                    onClick={() => handleApproveEnrollment(enrollment.id)}
                                    className="btn btn-success btn-sm"
                                    title="Approve this enrollment"
                                  >
                                    <i className="fas fa-check me-1"></i>
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectEnrollment(enrollment)}
                                    className="btn btn-danger btn-sm"
                                    title="Reject this enrollment"
                                  >
                                    <i className="fas fa-times me-1"></i>
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => handleViewDocuments(enrollment.id)}
                                    className="btn btn-outline-info btn-sm"
                                    title="View uploaded documents"
                                  >
                                    <i className="fas fa-file-alt"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {enrollments.filter(e => e.enrollment_status === 'pending_approval').length > 5 && (
                      <div className="text-center mt-3">
                        <button
                          onClick={() => setActiveTab('enrollments')}
                          className="btn btn-outline-warning"
                        >
                          <i className="fas fa-plus me-2"></i>
                          View All Pending ({enrollments.filter(e => e.enrollment_status === 'pending_approval').length - 5} more)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Recent Enrollments</h5>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Enrolled</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.slice(0, 5).map((enrollment) => (
                          <tr key={enrollment.id}>
                            <td>{enrollment.student_name}</td>
                            <td>{enrollment.student_email}</td>
                            <td>
                              <span className={`badge ${getStatusBadgeClass(enrollment.enrollment_status)}`}>
                                {enrollment.enrollment_status?.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td>{new Date(enrollment.created_at).toLocaleDateString()}</td>
                            <td>
                              {enrollment.enrollment_status === 'pending_approval' && (
                                <div className="btn-group btn-group-sm">
                                  <button
                                    onClick={() => handleApproveEnrollment(enrollment.id)}
                                    className="btn btn-success"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectEnrollment(enrollment)}
                                    className="btn btn-danger"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'enrollments' && (
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Student Enrollments</h5>
              <div className="d-flex gap-2">
                <select className="form-select form-select-sm" style={{ width: 'auto' }}>
                  <option value="">All Status</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Documents</th>
                      <th>Enrolled Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enrollment) => (
                      <tr key={enrollment.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="avatar bg-primary text-white rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                              {enrollment.student_name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <div className="fw-bold">{enrollment.student_name}</div>
                            </div>
                          </div>
                        </td>
                        <td>{enrollment.student_email}</td>
                        <td>{enrollment.student_phone || 'N/A'}</td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(enrollment.enrollment_status)}`}>
                            {enrollment.enrollment_status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted small">
                            {enrollment.documents_verified ? '✓ Verified' : '⏳ Pending'}
                          </span>
                        </td>
                        <td>{new Date(enrollment.created_at).toLocaleDateString()}</td>
                        <td>
                          {enrollment.enrollment_status === 'pending_approval' ? (
                            <div className="d-flex gap-2">
                              <button
                                onClick={() => handleApproveEnrollment(enrollment.id)}
                                className="btn btn-success btn-sm"
                                title="Approve Enrollment"
                              >
                                <i className="fas fa-check me-1"></i>
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectEnrollment(enrollment)}
                                className="btn btn-danger btn-sm"
                                title="Reject Enrollment"
                              >
                                <i className="fas fa-times me-1"></i>
                                Reject
                              </button>
                              <div className="dropdown">
                                <button className="btn btn-outline-secondary btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                                  <i className="fas fa-ellipsis-h"></i>
                                </button>
                                <ul className="dropdown-menu">
                                  <li>
                                    <button className="dropdown-item">
                                      <i className="fas fa-eye me-2"></i>View Details
                                    </button>
                                  </li>
                                  <li>
                                    <button 
                                      className="dropdown-item"
                                      onClick={() => handleViewDocuments(enrollment.id)}
                                    >
                                      <i className="fas fa-file-alt me-2"></i>View Documents
                                    </button>
                                  </li>
                                </ul>
                              </div>
                            </div>
                          ) : (
                            <div className="dropdown">
                              <button className="btn btn-outline-secondary btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                                Actions
                              </button>
                              <ul className="dropdown-menu">
                                <li>
                                  <button className="dropdown-item">
                                    <i className="fas fa-eye me-2"></i>View Details
                                  </button>
                                </li>
                                <li>
                                  <button 
                                    className="dropdown-item"
                                    onClick={() => handleViewDocuments(enrollment.id)}
                                  >
                                    <i className="fas fa-file-alt me-2"></i>View Documents
                                  </button>
                                </li>
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">School Teachers</h5>
              <button
                onClick={() => setShowTeacherModal(true)}
                className="btn btn-primary"
              >
                <i className="fas fa-user-plus me-2"></i>Add Teacher
              </button>
            </div>
            <div className="card-body">
              <div className="row g-4">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="col-md-6 col-lg-4">
                    <div className="card h-100">
                      <div className="card-body text-center">
                        <div className="avatar bg-info text-white rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                          {teacher.user_details?.first_name?.charAt(0) || 'T'}
                        </div>
                        <h6 className="card-title">{teacher.user_details ? `${teacher.user_details.first_name} ${teacher.user_details.last_name}` : 'Unknown Teacher'}</h6>
                        <p className="text-muted small mb-2">{teacher.user_details?.email || 'No email'}</p>
                        
                        <div className="mb-3">
                          <div className="d-flex justify-content-center gap-2 mb-2">
                            {teacher.can_teach_male && (
                              <span className="badge bg-primary">♂ Male Students</span>
                            )}
                            {teacher.can_teach_female && (
                              <span className="badge bg-pink text-white" style={{ backgroundColor: '#e91e63' }}>♀ Female Students</span>
                            )}
                          </div>
                          
                          <div className="text-muted small">
                            <i className="fas fa-star text-warning me-1"></i>
                            {teacher.rating || 0}/5 ({teacher.total_reviews || 0} reviews)
                          </div>
                        </div>
                        
                        <div className="d-grid gap-2">
                          <button className="btn btn-outline-primary btn-sm">
                            <i className="fas fa-eye me-2"></i>View Profile
                          </button>
                          <button
                            onClick={() => handleRemoveTeacher(teacher.id)}
                            className="btn btn-outline-danger btn-sm"
                          >
                            <i className="fas fa-trash me-2"></i>Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {teachers.length === 0 && (
                  <div className="col-12">
                    <div className="text-center py-5">
                      <i className="fas fa-chalkboard-teacher fa-4x text-muted mb-4"></i>
                      <h5>No Teachers Added</h5>
                      <p className="text-muted">Start by adding teachers to your driving school</p>
                      <button
                        onClick={() => setShowTeacherModal(true)}
                        className="btn btn-primary"
                      >
                        <i className="fas fa-user-plus me-2"></i>Add First Teacher
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Course Quizzes</h5>
              <button
                onClick={() => setShowQuizModal(true)}
                className="btn btn-success"
              >
                <i className="fas fa-plus me-2"></i>Create Quiz
              </button>
            </div>
            <div className="card-body">
              <div className="row g-4">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="col-md-6 col-lg-4">
                    <div className="card h-100">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <h6 className="card-title">{quiz.title}</h6>
                          <span className={`badge ${quiz.course_type === 'theory' ? 'bg-info' : quiz.course_type === 'park' ? 'bg-warning' : 'bg-success'}`}>
                            {quiz.course_type.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-muted small mb-3">{quiz.description}</p>
                        
                        <div className="quiz-stats mb-3">
                          <div className="row text-center">
                            <div className="col">
                              <div className="fw-bold">{quiz.questions?.length || 0}</div>
                              <div className="small text-muted">Questions</div>
                            </div>
                            <div className="col">
                              <div className="fw-bold">{quiz.time_limit_minutes}m</div>
                              <div className="small text-muted">Time Limit</div>
                            </div>
                            <div className="col">
                              <div className="fw-bold">{quiz.passing_score}%</div>
                              <div className="small text-muted">Pass Score</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="d-flex justify-content-between align-items-center">
                          <span className={`badge ${quiz.difficulty === 'easy' ? 'bg-success' : quiz.difficulty === 'medium' ? 'bg-warning' : 'bg-danger'}`}>
                            {quiz.difficulty.toUpperCase()}
                          </span>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary">
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="btn btn-outline-secondary">
                              <i className="fas fa-edit"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {quizzes.length === 0 && (
                  <div className="col-12">
                    <div className="text-center py-5">
                      <i className="fas fa-question-circle fa-4x text-muted mb-4"></i>
                      <h5>No Quizzes Created</h5>
                      <p className="text-muted">Create quizzes to test your students' knowledge</p>
                      <button
                        onClick={() => setShowQuizModal(true)}
                        className="btn btn-success"
                      >
                        <i className="fas fa-plus me-2"></i>Create First Quiz
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Scheduled Sessions</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Teacher</th>
                      <th>Session Type</th>
                      <th>Date & Time</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td>{session.student_name}</td>
                        <td>{session.teacher_name}</td>
                        <td>
                          <span className={`badge ${session.session_type === 'theory' ? 'bg-info' : session.session_type === 'park' ? 'bg-warning' : 'bg-success'}`}>
                            {session.session_type.toUpperCase()}
                          </span>
                        </td>
                        <td>{new Date(session.scheduled_at).toLocaleString()}</td>
                        <td>{session.duration_minutes} min</td>
                        <td>
                          <span className={`badge ${session.status === 'completed' ? 'bg-success' : session.status === 'scheduled' ? 'bg-primary' : 'bg-secondary'}`}>
                            {session.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary">
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="btn btn-outline-secondary">
                              <i className="fas fa-edit"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}



        {activeTab === 'analytics' && analytics && (
          <div className="row g-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h6 className="card-title mb-0">School Performance</h6>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="metric">
                        <div className="metric-value h4 mb-0">{analytics.total_students || 0}</div>
                        <div className="metric-label text-muted">Total Students</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="metric">
                        <div className="metric-value h4 mb-0">{analytics.completion_rate || 0}%</div>
                        <div className="metric-label text-muted">Completion Rate</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="metric">
                        <div className="metric-value h4 mb-0">{analytics.average_rating || 0}</div>
                        <div className="metric-label text-muted">Avg Rating</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="metric">
                        <div className="metric-value h4 mb-0">{analytics.total_revenue || 0} DA</div>
                        <div className="metric-label text-muted">Revenue</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h6 className="card-title mb-0">Course Statistics</h6>
                </div>
                <div className="card-body">
                  <div className="course-stats">
                    {analytics.course_stats && Object.entries(analytics.course_stats).map(([course, stats]) => (
                      <div key={course} className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <div className="fw-bold text-capitalize">{course}</div>
                          <div className="small text-muted">{stats.completed}/{stats.total} completed</div>
                        </div>
                        <div className="text-end">
                          <div className="h6 mb-0">{Math.round((stats.completed / stats.total) * 100) || 0}%</div>
                          <div className="progress" style={{ width: '60px', height: '4px' }}>
                            <div
                              className="progress-bar bg-primary"
                              style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Teacher Modal */}
      {showTeacherModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Teacher</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowTeacherModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddTeacher}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        value={teacherForm.email}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        value={teacherForm.password}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Minimum 6 characters"
                        required
                        minLength="6"
                      />
                      <div className="form-text">Teacher will use this password to login</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">First Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={teacherForm.first_name}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, first_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Last Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={teacherForm.last_name}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, last_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={teacherForm.phone}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Gender</label>
                      <select
                        className="form-select"
                        value={teacherForm.gender}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, gender: e.target.value }))}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date of Birth</label>
                      <input
                        type="date"
                        className="form-control"
                        value={teacherForm.date_of_birth}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Address</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={teacherForm.address}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, address: e.target.value }))}
                      ></textarea>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Teaching Permissions</label>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={teacherForm.can_teach_male}
                          onChange={(e) => setTeacherForm(prev => ({ ...prev, can_teach_male: e.target.checked }))}
                        />
                        <label className="form-check-label">Can teach male students</label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={teacherForm.can_teach_female}
                          onChange={(e) => setTeacherForm(prev => ({ ...prev, can_teach_female: e.target.checked }))}
                        />
                        <label className="form-check-label">Can teach female students</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowTeacherModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Teacher
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Quiz Modal */}
      {showQuizModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Quiz</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowQuizModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateQuiz}>
                <div className="modal-body">
                  <div className="row g-3 mb-4">
                    <div className="col-md-8">
                      <label className="form-label">Quiz Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={quizForm.title}
                        onChange={(e) => setQuizForm(prev => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Course Type</label>
                      <select
                        className="form-select"
                        value={quizForm.course_type}
                        onChange={(e) => setQuizForm(prev => ({ ...prev, course_type: e.target.value }))}
                      >
                        <option value="theory">Theory</option>
                        <option value="park">Park</option>
                        <option value="road">Road</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={quizForm.description}
                        onChange={(e) => setQuizForm(prev => ({ ...prev, description: e.target.value }))}
                      ></textarea>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Difficulty</label>
                      <select
                        className="form-select"
                        value={quizForm.difficulty}
                        onChange={(e) => setQuizForm(prev => ({ ...prev, difficulty: e.target.value }))}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Time Limit (minutes)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={quizForm.time_limit_minutes}
                        onChange={(e) => setQuizForm(prev => ({ ...prev, time_limit_minutes: parseInt(e.target.value) }))}
                        min="5"
                        max="180"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Passing Score (%)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={quizForm.passing_score}
                        onChange={(e) => setQuizForm(prev => ({ ...prev, passing_score: parseInt(e.target.value) }))}
                        min="50"
                        max="100"
                      />
                    </div>
                  </div>

                  {/* Questions Section */}
                  <div className="questions-section">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6>Questions ({quizForm.questions.length})</h6>
                    </div>

                    {/* Add New Question */}
                    <div className="card mb-3">
                      <div className="card-header">
                        <h6 className="mb-0">Add Question</h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <label className="form-label">Question</label>
                          <textarea
                            className="form-control"
                            rows="2"
                            value={currentQuestion.question}
                            onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                            placeholder="Enter your question here..."
                          ></textarea>
                        </div>
                        
                        <div className="row g-2 mb-3">
                          {currentQuestion.options.map((option, index) => (
                            <div key={index} className="col-md-6">
                              <div className="input-group">
                                <span className="input-group-text">
                                  <input
                                    type="radio"
                                    name="correct_answer"
                                    checked={currentQuestion.correct_answer === index}
                                    onChange={() => setCurrentQuestion(prev => ({ ...prev, correct_answer: index }))}
                                  />
                                </span>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder={`Option ${index + 1}`}
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...currentQuestion.options];
                                    newOptions[index] = e.target.value;
                                    setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mb-3">
                          <label className="form-label">Explanation (Optional)</label>
                          <textarea
                            className="form-control"
                            rows="2"
                            value={currentQuestion.explanation}
                            onChange={(e) => setCurrentQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                            placeholder="Explain why this is the correct answer..."
                          ></textarea>
                        </div>
                        
                        <button
                          type="button"
                          onClick={addQuestionToQuiz}
                          className="btn btn-success btn-sm"
                        >
                          <i className="fas fa-plus me-2"></i>Add Question
                        </button>
                      </div>
                    </div>

                    {/* Added Questions List */}
                    {quizForm.questions.map((question, index) => (
                      <div key={index} className="card mb-2">
                        <div className="card-body py-2">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <div className="fw-bold">Q{index + 1}: {question.question}</div>
                              <div className="small text-muted">
                                Correct: {question.options[question.correct_answer]}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeQuestionFromQuiz(index)}
                              className="btn btn-sm btn-outline-danger"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowQuizModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={quizForm.questions.length === 0}
                  >
                    Create Quiz ({quizForm.questions.length} questions)
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Documents Modal */}
      {showDocumentsModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Student Documents</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDocumentsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {studentDocuments.student_info && (
                  <div className="student-info mb-4">
                    <h6 className="fw-bold">Student Information</h6>
                    <p className="mb-1"><strong>Name:</strong> {studentDocuments.student_info.name}</p>
                    <p className="mb-0"><strong>Email:</strong> {studentDocuments.student_info.email}</p>
                  </div>
                )}

                <div className="documents-section">
                  <h6 className="fw-bold mb-3">Uploaded Documents ({studentDocuments.total || 0})</h6>
                  
                  {studentDocuments.documents && studentDocuments.documents.length > 0 ? (
                    <div className="row g-3">
                      {studentDocuments.documents.map((document, index) => (
                        <div key={index} className="col-md-6">
                          <div className="card document-card">
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="card-title text-capitalize">
                                  {document.document_type.replace('_', ' ')}
                                </h6>
                                <span className="badge bg-success">
                                  ✓ Uploaded
                                </span>
                              </div>
                              
                              <p className="small text-muted mb-2">
                                <i className="fas fa-file me-1"></i>
                                {document.file_name}
                              </p>
                              
                              <p className="small text-muted mb-3">
                                <i className="fas fa-calendar me-1"></i>
                                Uploaded: {new Date(document.upload_date).toLocaleDateString()}
                              </p>
                              
                              <div className="document-actions">
                                {document.file_url && (
                                  <a
                                    href={document.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary btn-sm"
                                  >
                                    <i className="fas fa-eye me-1"></i>View Document
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="fas fa-file-upload fa-3x text-muted mb-3"></i>
                      <p className="text-muted">No documents uploaded yet</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDocumentsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Refusal Modal */}
      {showRefusalModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Refuse Document</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowRefusalModal(false);
                    setSelectedDocument(null);
                    setRefusalReason('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {selectedDocument && (
                  <div className="mb-3">
                    <p className="fw-bold">Document: {selectedDocument.document_type.replace('_', ' ')}</p>
                    <p className="text-muted">Student: {studentDocuments.student_info?.name || 'Unknown'}</p>
                  </div>
                )}
                
                <div className="mb-3">
                  <label className="form-label fw-bold">Reason for refusal <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Please provide a clear reason why this document is being refused..."
                    value={refusalReason}
                    onChange={(e) => setRefusalReason(e.target.value)}
                  />
                  <div className="form-text">
                    This reason will be sent to the student so they can understand what needs to be corrected.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowRefusalModal(false);
                    setSelectedDocument(null);
                    setRefusalReason('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleSubmitRefusal}
                  disabled={!refusalReason.trim()}
                >
                  <i className="fas fa-times me-2"></i>
                  Refuse Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Enrollment Rejection Modal */}
      {showRefusalModal && selectedEnrollment && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reject Enrollment</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowRefusalModal(false);
                    setSelectedEnrollment(null);
                    setRefusalReason('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <p className="fw-bold">Student: {selectedEnrollment.student_name}</p>
                  <p className="text-muted">Email: {selectedEnrollment.student_email}</p>
                  <p className="text-muted">Enrolled: {new Date(selectedEnrollment.created_at).toLocaleDateString()}</p>
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-bold">Reason for rejection <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Please provide a clear reason why this enrollment is being rejected..."
                    value={refusalReason}
                    onChange={(e) => setRefusalReason(e.target.value)}
                  />
                  <div className="form-text">
                    This reason will be sent to the student so they can understand what needs to be corrected.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowRefusalModal(false);
                    setSelectedEnrollment(null);
                    setRefusalReason('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleSubmitEnrollmentRejection}
                  disabled={!refusalReason.trim()}
                >
                  <i className="fas fa-times me-2"></i>
                  Reject Enrollment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;