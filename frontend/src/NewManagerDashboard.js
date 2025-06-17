import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NewManagerDashboard = ({ user, token }) => {
  const [activeTab, setActiveTab] = useState('approvals');
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // NEW APPROVAL SYSTEM: Modal states for 4-button workflow
  const [showStudentDetailsModal, setShowStudentDetailsModal] = useState(false);
  const [showStudentDocumentsModal, setShowStudentDocumentsModal] = useState(false);
  const [showRefusalModal, setShowRefusalModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [studentDocuments, setStudentDocuments] = useState(null);
  const [refusalReason, setRefusalReason] = useState('');

  useEffect(() => {
    fetchPendingEnrollments();
  }, []);

  const fetchPendingEnrollments = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/manager/pending-enrollments-enhanced`, { headers });
      setEnrollments(response.data.enrollments || []);
      setError('');
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      setError('Failed to load pending enrollments');
    } finally {
      setLoading(false);
    }
  };

  // NEW APPROVAL SYSTEM: 4-button workflow functions

  // Button 1: View Student Details
  const handleViewStudentDetails = async (enrollment) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/manager/student-details/${enrollment.student_id}`, { headers });
      setStudentDetails(response.data);
      setSelectedEnrollment(enrollment);
      setShowStudentDetailsModal(true);
    } catch (error) {
      console.error('Error fetching student details:', error);
      alert('Failed to load student details');
    }
  };

  // Button 2: View Uploaded Documents
  const handleViewStudentDocuments = async (enrollment) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/manager/student-documents/${enrollment.student_id}`, { headers });
      setStudentDocuments(response.data);
      setSelectedEnrollment(enrollment);
      setShowStudentDocumentsModal(true);
    } catch (error) {
      console.error('Error fetching student documents:', error);
      alert('Failed to load student documents');
    }
  };

  // Button 3: Accept Student
  const handleAcceptStudent = async (enrollment) => {
    if (!window.confirm(`Are you sure you want to accept ${enrollment.student_name}? This will make them an official student who can start lessons immediately.`)) {
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/manager/enrollments/${enrollment.id}/accept`, {}, { headers });
      
      // Remove from pending list
      setEnrollments(prev => prev.filter(e => e.id !== enrollment.id));
      
      alert(`${enrollment.student_name} has been accepted successfully! They can now start their lessons.`);
    } catch (error) {
      console.error('Error accepting student:', error);
      alert('Failed to accept student');
    }
  };

  // Button 4: Refuse Student (with reason)
  const handleRefuseStudent = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setRefusalReason('');
    setShowRefusalModal(true);
  };

  const handleSubmitRefusal = async () => {
    if (!refusalReason.trim()) {
      alert('Please provide a reason for refusing this student');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const formData = new FormData();
      formData.append('reason', refusalReason.trim());
      
      await axios.post(`${API}/manager/enrollments/${selectedEnrollment.id}/refuse`, formData, { headers });
      
      // Remove from pending list
      setEnrollments(prev => prev.filter(e => e.id !== selectedEnrollment.id));
      
      setShowRefusalModal(false);
      setSelectedEnrollment(null);
      setRefusalReason('');
      
      alert(`${selectedEnrollment.student_name} has been refused. They have been notified with your reason.`);
    } catch (error) {
      console.error('Error refusing student:', error);
      alert('Failed to refuse student');
    }
  };

  const getDocumentStatusBadge = (summary) => {
    if (summary.total_uploaded === 0) {
      return <span className="badge bg-secondary">No Documents</span>;
    }
    if (summary.total_uploaded < summary.total_required) {
      return <span className="badge bg-warning">Incomplete ({summary.total_uploaded}/{summary.total_required})</span>;
    }
    if (summary.ready_for_decision) {
      return <span className="badge bg-info">Ready for Review</span>;
    }
    return <span className="badge bg-success">Complete ({summary.total_uploaded}/{summary.total_required})</span>;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      <div className="container mt-4">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="fw-bold">Manager Dashboard - New Approval System</h2>
              <button onClick={fetchPendingEnrollments} className="btn btn-outline-primary">
                <i className="fas fa-sync-alt me-2"></i>Refresh
              </button>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            {/* NEW APPROVAL SYSTEM: Main Content */}
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h5 className="card-title mb-0">
                  <i className="fas fa-users me-2"></i>
                  Student Approvals ({enrollments.length} pending)
                </h5>
              </div>
              <div className="card-body">
                {enrollments.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-check-circle fa-4x text-success mb-3"></i>
                    <h4>No Pending Approvals</h4>
                    <p className="text-muted">All students have been processed. Great job!</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Student</th>
                          <th>Contact</th>
                          <th>Documents</th>
                          <th>Days Pending</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((enrollment) => (
                          <tr key={enrollment.id}>
                            <td>
                              <div>
                                <div className="fw-bold">{enrollment.student_name}</div>
                                <small className="text-muted">ID: {enrollment.student_id}</small>
                              </div>
                            </td>
                            <td>
                              <div>
                                <div className="small">{enrollment.student_email}</div>
                                <div className="small text-muted">{enrollment.student_phone}</div>
                              </div>
                            </td>
                            <td>
                              {getDocumentStatusBadge(enrollment.document_summary)}
                            </td>
                            <td>
                              <span className={`badge ${enrollment.days_pending > 7 ? 'bg-danger' : enrollment.days_pending > 3 ? 'bg-warning' : 'bg-success'}`}>
                                {enrollment.days_pending} days
                              </span>
                            </td>
                            <td>
                              <div className="d-flex gap-2 flex-wrap">
                                {/* NEW APPROVAL SYSTEM: 4 Action Buttons */}
                                
                                {/* Button 1: View Student Details */}
                                <button
                                  onClick={() => handleViewStudentDetails(enrollment)}
                                  className="btn btn-outline-info btn-sm"
                                  title="View Student Details"
                                >
                                  <i className="fas fa-user me-1"></i>Details
                                </button>

                                {/* Button 2: View Documents */}
                                <button
                                  onClick={() => handleViewStudentDocuments(enrollment)}
                                  className="btn btn-outline-secondary btn-sm"
                                  title="View Uploaded Documents"
                                >
                                  <i className="fas fa-file-alt me-1"></i>Documents
                                </button>

                                {/* Button 3: Accept */}
                                <button
                                  onClick={() => handleAcceptStudent(enrollment)}
                                  className="btn btn-success btn-sm"
                                  title="Accept Student - They can start lessons"
                                  disabled={!enrollment.document_summary.all_uploaded}
                                >
                                  <i className="fas fa-check me-1"></i>Accept
                                </button>

                                {/* Button 4: Refuse */}
                                <button
                                  onClick={() => handleRefuseStudent(enrollment)}
                                  className="btn btn-danger btn-sm"
                                  title="Refuse Student with Reason"
                                >
                                  <i className="fas fa-times me-1"></i>Refuse
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEW APPROVAL SYSTEM: Modals */}

      {/* Student Details Modal */}
      {showStudentDetailsModal && studentDetails && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">
                  <i className="fas fa-user me-2"></i>Student Details
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowStudentDetailsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="fw-bold text-primary">Personal Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td className="fw-bold">Full Name:</td>
                          <td>{studentDetails.student.first_name} {studentDetails.student.last_name}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Email:</td>
                          <td>{studentDetails.student.email}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Phone:</td>
                          <td>{studentDetails.student.phone || 'Not provided'}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Address:</td>
                          <td>{studentDetails.student.address || 'Not provided'}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Date of Birth:</td>
                          <td>{studentDetails.student.date_of_birth || 'Not provided'}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Gender:</td>
                          <td className="text-capitalize">{studentDetails.student.gender || 'Not specified'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold text-primary">Enrollment Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td className="fw-bold">School:</td>
                          <td>{studentDetails.school_name}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Status:</td>
                          <td>
                            <span className="badge bg-warning">
                              {studentDetails.enrollment.enrollment_status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Applied:</td>
                          <td>{new Date(studentDetails.enrollment.created_at).toLocaleDateString()}</td>
                        </tr>
                      </tbody>
                    </table>

                    <h6 className="fw-bold text-primary mt-3">Document Status</h6>
                    <div className="list-group list-group-flush">
                      {Object.entries(studentDetails.documents).map(([docType, docInfo]) => (
                        <div key={docType} className="list-group-item d-flex justify-content-between align-items-center">
                          <span className="text-capitalize">{docType.replace('_', ' ')}</span>
                          <span className={`badge ${
                            docInfo.status === 'accepted' ? 'bg-success' : 
                            docInfo.status === 'refused' ? 'bg-danger' : 
                            docInfo.status === 'pending' ? 'bg-warning' : 'bg-secondary'
                          }`}>
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
                  onClick={() => setShowStudentDetailsModal(false)}
                >
                  Close
                </button>
                <button 
                  type="button" 
                  className="btn btn-info" 
                  onClick={() => {
                    setShowStudentDetailsModal(false);
                    handleViewStudentDocuments(selectedEnrollment);
                  }}
                >
                  <i className="fas fa-file-alt me-2"></i>View Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Documents Modal */}
      {showStudentDocumentsModal && studentDocuments && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-secondary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-file-alt me-2"></i>
                  Documents for {studentDocuments.student.name}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowStudentDocumentsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {studentDocuments.documents.map((doc, index) => (
                    <div key={index} className="col-md-6 col-lg-4 mb-4">
                      <div className="card h-100">
                        <div className="card-header d-flex justify-content-between align-items-center">
                          <h6 className="card-title mb-0">{doc.document_type_display}</h6>
                          <span className={`badge ${
                            doc.status === 'accepted' ? 'bg-success' : 
                            doc.status === 'refused' ? 'bg-danger' : 
                            doc.status === 'pending' ? 'bg-warning' : 'bg-secondary'
                          }`}>
                            {doc.status === 'not_uploaded' ? 'Missing' : doc.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="card-body">
                          {doc.file_url ? (
                            <div>
                              <div className="text-center mb-3">
                                {doc.file_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                  <img 
                                    src={doc.file_url} 
                                    alt={doc.document_type_display}
                                    className="img-fluid rounded"
                                    style={{ maxHeight: '200px', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div className="bg-light p-4 rounded text-center">
                                    <i className="fas fa-file fa-3x text-muted mb-2"></i>
                                    <div className="small text-muted">{doc.file_name}</div>
                                  </div>
                                )}
                              </div>
                              <div className="small text-muted">
                                <div><strong>File:</strong> {doc.file_name}</div>
                                <div><strong>Size:</strong> {(doc.file_size / 1024 / 1024).toFixed(2)} MB</div>
                                <div><strong>Uploaded:</strong> {new Date(doc.upload_date).toLocaleDateString()}</div>
                                {doc.refusal_reason && (
                                  <div className="text-danger mt-2">
                                    <strong>Refusal Reason:</strong> {doc.refusal_reason}
                                  </div>
                                )}
                              </div>
                              <div className="mt-3">
                                <a 
                                  href={doc.file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn btn-primary btn-sm w-100"
                                >
                                  <i className="fas fa-external-link-alt me-2"></i>View Full Size
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-muted">
                              <i className="fas fa-exclamation-triangle fa-3x mb-3"></i>
                              <div>Document not uploaded</div>
                            </div>
                          )}
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
                  onClick={() => setShowStudentDocumentsModal(false)}
                >
                  Close
                </button>
                <div className="ms-auto">
                  <button 
                    type="button" 
                    className="btn btn-success me-2" 
                    onClick={() => {
                      setShowStudentDocumentsModal(false);
                      handleAcceptStudent(selectedEnrollment);
                    }}
                    disabled={!selectedEnrollment?.document_summary?.all_uploaded}
                  >
                    <i className="fas fa-check me-2"></i>Accept Student
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={() => {
                      setShowStudentDocumentsModal(false);
                      handleRefuseStudent(selectedEnrollment);
                    }}
                  >
                    <i className="fas fa-times me-2"></i>Refuse Student
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refusal Modal */}
      {showRefusalModal && selectedEnrollment && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="fas fa-times me-2"></i>Refuse Student Enrollment
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowRefusalModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <strong>Warning:</strong> You are about to refuse <strong>{selectedEnrollment.student_name}</strong>'s enrollment. 
                  This action will notify the student and they will not be able to start lessons.
                </div>
                
                <div className="mb-3">
                  <label htmlFor="refusalReason" className="form-label">
                    <strong>Reason for Refusal:</strong> <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="refusalReason"
                    className="form-control"
                    rows="4"
                    value={refusalReason}
                    onChange={(e) => setRefusalReason(e.target.value)}
                    placeholder="Please provide a detailed reason for refusing this student's enrollment. This will be sent to the student."
                    required
                  />
                  <div className="form-text">
                    This reason will be sent to the student, so please be professional and specific.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowRefusalModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleSubmitRefusal}
                  disabled={!refusalReason.trim()}
                >
                  <i className="fas fa-times me-2"></i>Refuse Student
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