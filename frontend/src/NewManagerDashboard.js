import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NewManagerDashboard = ({ user, token }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [schoolData, setSchoolData] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New approval system states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [studentDocuments, setStudentDocuments] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);

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

    } catch (error) {
      console.error('Error fetching manager data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // NEW APPROVAL SYSTEM FUNCTIONS

  // 1. View Student Details
  const handleViewStudentDetails = async (enrollment) => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(`${API}/manager/student-details/${enrollment.student_id}`, { headers });
      setStudentDetails(response.data);
      setSelectedStudent(enrollment);
      setShowStudentModal(true);
    } catch (error) {
      console.error('Error fetching student details:', error);
      alert('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  // 2. View Documents
  const handleViewDocuments = async (enrollment) => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(`${API}/manager/enrollments/${enrollment.id}/documents`, { headers });
      setStudentDocuments(response.data);
      setSelectedStudent(enrollment);
      setShowDocumentsModal(true);
    } catch (error) {
      console.error('Error fetching student documents:', error);
      alert('Failed to load student documents');
    } finally {
      setLoading(false);
    }
  };

  // 3. Accept Student
  const handleAcceptStudent = async (enrollment) => {
    if (!confirm(`Are you sure you want to accept ${enrollment.student_name}? They will become officially enrolled and can start lessons.`)) {
      return;
    }

    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`${API}/manager/enrollments/${enrollment.id}/accept`, {}, { headers });
      
      // Update enrollment status in the list
      setEnrollments(prev => 
        prev.map(e => 
          e.id === enrollment.id 
            ? { ...e, enrollment_status: 'approved' }
            : e
        )
      );
      
      alert(`✅ ${enrollment.student_name} has been accepted! They can now start lessons.`);
    } catch (error) {
      console.error('Error accepting student:', error);
      alert('Failed to accept student');
    } finally {
      setLoading(false);
    }
  };

  // 4. Refuse Student
  const handleRefuseStudent = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setRefusalReason('');
    setShowRefuseModal(true);
  };

  const handleSubmitRefusal = async () => {
    if (!refusalReason.trim()) {
      alert('Please provide a reason for refusal');
      return;
    }

    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const formData = new FormData();
      formData.append('reason', refusalReason);
      
      await axios.post(`${API}/manager/enrollments/${selectedEnrollment.id}/refuse`, formData, { headers });
      
      // Update enrollment status in the list
      setEnrollments(prev => 
        prev.map(e => 
          e.id === selectedEnrollment.id 
            ? { ...e, enrollment_status: 'rejected' }
            : e
        )
      );
      
      setShowRefuseModal(false);
      setSelectedEnrollment(null);
      setRefusalReason('');
      
      alert(`❌ ${selectedEnrollment.student_name} has been refused. They will be notified with the reason.`);
    } catch (error) {
      console.error('Error refusing student:', error);
      alert('Failed to refuse student');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending_documents':
        return 'bg-warning text-dark';
      case 'pending_approval':
        return 'bg-info text-white';
      case 'approved':
        return 'bg-success text-white';
      case 'rejected':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary text-white';
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

  if (loading && !schoolData) {
    return (
      <div className="manager-dashboard-loading text-center py-5">
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
        <button onClick={fetchManagerData} className="btn btn-outline-danger">
          Try Again
        </button>
      </div>
    );
  }

  const pendingApprovals = enrollments.filter(e => e.enrollment_status === 'pending_approval');

  return (
    <div className="manager-dashboard pt-5 mt-5">
      <div className="container-fluid">
        {/* Header */}
        <div className="dashboard-header mb-4">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="display-5 fw-bold mb-2">
                Manager Dashboard 🏫
              </h1>
              <p className="lead text-muted">
                {schoolData?.name || 'Driving School'} - Manage your students and teachers
              </p>
            </div>
            <div className="col-lg-4 text-lg-end">
              <div className="dashboard-stats">
                <div className="stat-item">
                  <div className="stat-number display-6 fw-bold text-warning">
                    {pendingApprovals.length}
                  </div>
                  <div className="stat-label text-muted">Pending Approvals</div>
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
                  <i className="fas fa-users fa-2x"></i>
                </div>
                <h3 className="fw-bold">{enrollments.length}</h3>
                <p className="text-muted mb-0">Total Students</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <div className="icon-circle bg-warning bg-opacity-10 text-warning rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                  <i className="fas fa-clock fa-2x"></i>
                </div>
                <h3 className="fw-bold">{pendingApprovals.length}</h3>
                <p className="text-muted mb-0">Pending Approval</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <div className="icon-circle bg-success bg-opacity-10 text-success rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                  <i className="fas fa-check-circle fa-2x"></i>
                </div>
                <h3 className="fw-bold">
                  {enrollments.filter(e => e.enrollment_status === 'approved').length}
                </h3>
                <p className="text-muted mb-0">Approved Students</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <div className="icon-circle bg-info bg-opacity-10 text-info rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                  <i className="fas fa-chalkboard-teacher fa-2x"></i>
                </div>
                <h3 className="fw-bold">{teachers.length}</h3>
                <p className="text-muted mb-0">Teachers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Student Approvals */}
        <div className="row g-4">
          <div className="col-12">
            
            {/* Pending Approvals Alert */}
            {pendingApprovals.length > 0 && (
              <div className="alert alert-warning d-flex align-items-center mb-4" role="alert">
                <i className="fas fa-exclamation-triangle fa-2x me-3"></i>
                <div className="flex-grow-1">
                  <h5 className="alert-heading mb-1">⚠️ Action Required!</h5>
                  <p className="mb-0">
                    You have <strong>{pendingApprovals.length}</strong> student(s) waiting for approval. 
                    Review their documents and decide to accept or refuse their enrollment.
                  </p>
                </div>
              </div>
            )}

            {/* NEW APPROVAL SYSTEM - Student List with 4 Buttons */}
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h3 className="card-title fw-bold mb-0">
                  <i className="fas fa-user-graduate me-2"></i>
                  Student Enrollment Management
                </h3>
                <p className="text-muted mb-0 mt-2">Review documents and manage student enrollments</p>
              </div>
              <div className="card-body">
                {enrollments.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Student</th>
                          <th>Contact</th>
                          <th>Status</th>
                          <th>Enrolled Date</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((enrollment) => (
                          <tr key={enrollment.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="avatar bg-primary text-white rounded-circle me-3 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                                  {enrollment.student_name?.charAt(0) || 'S'}
                                </div>
                                <div>
                                  <div className="fw-bold">{enrollment.student_name}</div>
                                  <div className="small text-muted">ID: {enrollment.student_id.slice(-8)}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="small">
                                <div><i className="fas fa-envelope me-1"></i> {enrollment.student_email}</div>
                                {enrollment.student_phone && (
                                  <div><i className="fas fa-phone me-1"></i> {enrollment.student_phone}</div>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${getStatusBadgeClass(enrollment.enrollment_status)}`}>
                                {enrollment.enrollment_status?.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td>{new Date(enrollment.created_at).toLocaleDateString()}</td>
                            <td>
                              <div className="d-flex gap-2 justify-content-center">
                                {/* 1. View Student Details Button */}
                                <button
                                  onClick={() => handleViewStudentDetails(enrollment)}
                                  className="btn btn-outline-info btn-sm"
                                  title="View student details"
                                  disabled={loading}
                                >
                                  <i className="fas fa-user"></i>
                                </button>

                                {/* 2. View Documents Button */}
                                <button
                                  onClick={() => handleViewDocuments(enrollment)}
                                  className="btn btn-outline-secondary btn-sm"
                                  title="View uploaded documents"
                                  disabled={loading}
                                >
                                  <i className="fas fa-file-alt"></i>
                                </button>

                                {/* 3. Accept Button (only for pending approval) */}
                                {enrollment.enrollment_status === 'pending_approval' && (
                                  <button
                                    onClick={() => handleAcceptStudent(enrollment)}
                                    className="btn btn-success btn-sm"
                                    title="Accept this student"
                                    disabled={loading}
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                )}

                                {/* 4. Refuse Button (only for pending approval) */}
                                {enrollment.enrollment_status === 'pending_approval' && (
                                  <button
                                    onClick={() => handleRefuseStudent(enrollment)}
                                    className="btn btn-danger btn-sm"
                                    title="Refuse this student"
                                    disabled={loading}
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                )}

                                {/* Show status for already processed students */}
                                {enrollment.enrollment_status === 'approved' && (
                                  <span className="badge bg-success">
                                    ✅ Accepted
                                  </span>
                                )}

                                {enrollment.enrollment_status === 'rejected' && (
                                  <span className="badge bg-danger">
                                    ❌ Refused
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <i className="fas fa-user-graduate fa-4x text-muted mb-4"></i>
                    <h5 className="fw-bold mb-3">No students enrolled yet</h5>
                    <p className="text-muted">Students will appear here when they enroll in your driving school.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Student Details Modal */}
      {showStudentModal && studentDetails && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user me-2"></i>
                  Student Details
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowStudentModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-4">
                  <div className="col-md-6">
                    <h6 className="fw-bold text-primary mb-3">Personal Information</h6>
                    <div className="info-group">
                      <div className="info-item mb-2">
                        <strong>Name:</strong> {studentDetails.student.first_name} {studentDetails.student.last_name}
                      </div>
                      <div className="info-item mb-2">
                        <strong>Email:</strong> {studentDetails.student.email}
                      </div>
                      <div className="info-item mb-2">
                        <strong>Phone:</strong> {studentDetails.student.phone || 'N/A'}
                      </div>
                      <div className="info-item mb-2">
                        <strong>Address:</strong> {studentDetails.student.address || 'N/A'}
                      </div>
                      <div className="info-item mb-2">
                        <strong>Date of Birth:</strong> {studentDetails.student.date_of_birth || 'N/A'}
                      </div>
                      <div className="info-item mb-2">
                        <strong>Gender:</strong> {studentDetails.student.gender || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold text-primary mb-3">Enrollment Information</h6>
                    <div className="info-group">
                      <div className="info-item mb-2">
                        <strong>Status:</strong> 
                        <span className={`badge ms-2 ${getStatusBadgeClass(studentDetails.enrollment.enrollment_status)}`}>
                          {studentDetails.enrollment.enrollment_status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="info-item mb-2">
                        <strong>Enrolled:</strong> {new Date(studentDetails.enrollment.created_at).toLocaleDateString()}
                      </div>
                      {studentDetails.enrollment.approved_at && (
                        <div className="info-item mb-2">
                          <strong>Approved:</strong> {new Date(studentDetails.enrollment.approved_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <h6 className="fw-bold text-primary mb-3 mt-4">Document Status</h6>
                    <div className="documents-summary">
                      {Object.entries(studentDetails.documents).map(([docType, docInfo]) => (
                        <div key={docType} className="d-flex justify-content-between align-items-center mb-2">
                          <span>{getDocumentName(docType)}</span>
                          <span className={`badge ${docInfo.status === 'accepted' ? 'bg-success' : docInfo.status === 'pending' ? 'bg-warning text-dark' : docInfo.status === 'not_uploaded' ? 'bg-secondary' : 'bg-danger'}`}>
                            {docInfo.status === 'not_uploaded' ? 'Not Uploaded' : docInfo.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowStudentModal(false)}
                >
                  Close
                </button>
                {selectedStudent?.enrollment_status === 'pending_approval' && (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-success" 
                      onClick={() => {
                        setShowStudentModal(false);
                        handleAcceptStudent(selectedStudent);
                      }}
                    >
                      <i className="fas fa-check me-2"></i>
                      Accept Student
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      onClick={() => {
                        setShowStudentModal(false);
                        handleRefuseStudent(selectedStudent);
                      }}
                    >
                      <i className="fas fa-times me-2"></i>
                      Refuse Student
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {showDocumentsModal && studentDocuments && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-file-alt me-2"></i>
                  Student Documents - {studentDocuments.student_info.name}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDocumentsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-4">
                  {studentDocuments.documents.map((document) => (
                    <div key={document.id} className="col-md-6">
                      <div className="card border">
                        <div className="card-header d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <i className={`${getDocumentIcon(document.document_type)} me-2 text-primary`}></i>
                            <strong>{getDocumentName(document.document_type)}</strong>
                          </div>
                          <span className={`badge ${document.status === 'accepted' ? 'bg-success' : document.status === 'pending' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                            {document.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="card-body">
                          <div className="document-info mb-3">
                            <div className="small text-muted mb-1">
                              <strong>File:</strong> {document.file_name}
                            </div>
                            <div className="small text-muted mb-1">
                              <strong>Uploaded:</strong> {new Date(document.upload_date).toLocaleDateString()}
                            </div>
                            <div className="small text-muted mb-1">
                              <strong>Size:</strong> {(document.file_size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>

                          {document.refusal_reason && (
                            <div className="alert alert-danger py-2">
                              <small><strong>Refusal Reason:</strong> {document.refusal_reason}</small>
                            </div>
                          )}

                          <div className="d-flex gap-2">
                            <a
                              href={document.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline-primary btn-sm flex-fill"
                            >
                              <i className="fas fa-eye me-1"></i>
                              View Document
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {studentDocuments.documents.length === 0 && (
                  <div className="text-center py-5">
                    <i className="fas fa-file-upload fa-4x text-muted mb-3"></i>
                    <h5 className="text-muted">No documents uploaded yet</h5>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDocumentsModal(false)}
                >
                  Close
                </button>
                {selectedStudent?.enrollment_status === 'pending_approval' && (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-success" 
                      onClick={() => {
                        setShowDocumentsModal(false);
                        handleAcceptStudent(selectedStudent);
                      }}
                    >
                      <i className="fas fa-check me-2"></i>
                      Accept Student
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      onClick={() => {
                        setShowDocumentsModal(false);
                        handleRefuseStudent(selectedStudent);
                      }}
                    >
                      <i className="fas fa-times me-2"></i>
                      Refuse Student
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refuse Modal */}
      {showRefuseModal && selectedEnrollment && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">
                  <i className="fas fa-times-circle me-2"></i>
                  Refuse Student Enrollment
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowRefuseModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>You are about to refuse {selectedEnrollment.student_name}'s enrollment.</strong>
                  <br />
                  <small>The student will be notified with your reason. They can reapply later.</small>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">
                    <strong>Reason for refusal <span className="text-danger">*</span></strong>
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={refusalReason}
                    onChange={(e) => setRefusalReason(e.target.value)}
                    placeholder="Please provide a clear reason why this enrollment is being refused..."
                    required
                  />
                  <div className="form-text">
                    This reason will be shown to the student. Be professional and specific.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowRefuseModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleSubmitRefusal}
                  disabled={!refusalReason.trim() || loading}
                >
                  <i className="fas fa-times me-2"></i>
                  Refuse Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewManagerDashboard;