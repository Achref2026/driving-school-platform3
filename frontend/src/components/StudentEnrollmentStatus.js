import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StudentEnrollmentStatus = ({ user, token }) => {
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEnrollmentStatus();
  }, []);

  const fetchEnrollmentStatus = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/student/enrollment-status`, { headers });
      setEnrollmentStatus(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching enrollment status:', error);
      setError('Failed to load enrollment status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'bg-success';
      case 'rejected': return 'bg-danger';
      case 'pending_approval': return 'bg-warning';
      case 'pending_documents': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return 'fas fa-check-circle';
      case 'rejected': return 'fas fa-times-circle';
      case 'pending_approval': return 'fas fa-clock';
      case 'pending_documents': return 'fas fa-upload';
      default: return 'fas fa-question-circle';
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="fas fa-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }

  return (
    <div className="student-enrollment-status">
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h5 className="card-title mb-0">
            <i className="fas fa-graduation-cap me-2"></i>
            My Enrollment Status
          </h5>
        </div>
        <div className="card-body">
          {enrollmentStatus?.enrollments?.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-school fa-4x text-muted mb-3"></i>
              <h4>No Enrollments</h4>
              <p className="text-muted mb-4">You haven't enrolled in any driving school yet.</p>
              <button className="btn btn-primary">
                <i className="fas fa-search me-2"></i>Find Driving Schools
              </button>
            </div>
          ) : (
            <div className="enrollment-list">
              {enrollmentStatus?.enrollments?.map((enrollment, index) => (
                <div key={enrollment.id} className="card mb-4 border-start border-4 border-primary">
                  <div className="card-body">
                    <div className="row align-items-center">
                      <div className="col-lg-8">
                        <div className="d-flex align-items-center mb-3">
                          <div className="flex-shrink-0">
                            <i className={`${getStatusIcon(enrollment.enrollment_status)} fa-2x text-primary`}></i>
                          </div>
                          <div className="flex-grow-1 ms-3">
                            <h5 className="mb-1">{enrollment.school_name}</h5>
                            <p className="text-muted mb-0">
                              <i className="fas fa-map-marker-alt me-1"></i>
                              {enrollment.school_address}, {enrollment.school_state}
                            </p>
                          </div>
                        </div>
                        
                        <div className="enrollment-details">
                          <div className="row">
                            <div className="col-md-6">
                              <div className="small text-muted mb-1">Enrollment Date</div>
                              <div className="fw-bold">{new Date(enrollment.created_at).toLocaleDateString()}</div>
                            </div>
                            {enrollment.approved_at && (
                              <div className="col-md-6">
                                <div className="small text-muted mb-1">Approved Date</div>
                                <div className="fw-bold">{new Date(enrollment.approved_at).toLocaleDateString()}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-lg-4 text-lg-end">
                        <div className="status-info">
                          <span className={`badge ${getStatusBadgeClass(enrollment.enrollment_status)} fs-6 px-3 py-2 mb-3`}>
                            {enrollment.enrollment_status.replace('_', ' ').toUpperCase()}
                          </span>
                          
                          <div className="document-summary">
                            <div className="small text-muted">Documents Status</div>
                            <div className="progress mb-2" style={{ height: '8px' }}>
                              <div 
                                className="progress-bar bg-success" 
                                style={{ 
                                  width: `${(enrollment.document_summary.total_accepted / enrollment.document_summary.total_required) * 100}%` 
                                }}
                              ></div>
                            </div>
                            <div className="small">
                              {enrollment.document_summary.total_accepted}/{enrollment.document_summary.total_required} Accepted
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Show rejection details if rejected */}
                    {enrollment.enrollment_status === 'rejected' && enrollment.rejection_details && (
                      <div className="alert alert-danger mt-3">
                        <h6 className="alert-heading">
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          Enrollment Rejected
                        </h6>
                        <p className="mb-0">
                          <strong>Reason:</strong> {enrollment.rejection_details.reason}
                        </p>
                        {enrollment.rejection_details.rejected_at && (
                          <p className="mb-0 small text-muted mt-2">
                            Rejected on: {new Date(enrollment.rejection_details.rejected_at).toLocaleString()}
                          </p>
                        )}
                        {enrollment.can_reapply && (
                          <div className="mt-3">
                            <button className="btn btn-outline-primary btn-sm">
                              <i className="fas fa-redo me-2"></i>Apply Again
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show document refusal details if any */}
                    {enrollment.document_summary.refused_documents && enrollment.document_summary.refused_documents.length > 0 && (
                      <div className="alert alert-warning mt-3">
                        <h6 className="alert-heading">
                          <i className="fas fa-file-times me-2"></i>
                          Document Issues ({enrollment.document_summary.refused_documents.length})
                        </h6>
                        {enrollment.document_summary.refused_documents.map((refusedDoc, idx) => (
                          <div key={idx} className="mb-2">
                            <div className="fw-bold">{refusedDoc.document_type}</div>
                            <div className="small text-muted">
                              <strong>Reason:</strong> {refusedDoc.refusal_reason}
                            </div>
                            {refusedDoc.refused_at && (
                              <div className="small text-muted">
                                Refused on: {new Date(refusedDoc.refused_at).toLocaleString()}
                              </div>
                            )}
                            {idx < enrollment.document_summary.refused_documents.length - 1 && <hr className="my-2" />}
                          </div>
                        ))}
                        <div className="mt-3">
                          <button className="btn btn-outline-warning btn-sm">
                            <i className="fas fa-upload me-2"></i>Re-upload Documents
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Show success message if approved */}
                    {enrollment.enrollment_status === 'approved' && (
                      <div className="alert alert-success mt-3">
                        <h6 className="alert-heading">
                          <i className="fas fa-check-circle me-2"></i>
                          Congratulations! Enrollment Approved
                        </h6>
                        <p className="mb-0">
                          You are now an official student at {enrollment.school_name}. You can start your driving lessons immediately!
                        </p>
                        <div className="mt-3">
                          <button className="btn btn-success btn-sm me-2">
                            <i className="fas fa-play me-2"></i>Start Lessons
                          </button>
                          <button className="btn btn-outline-success btn-sm">
                            <i className="fas fa-calendar me-2"></i>View Schedule
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Show pending status message */}
                    {enrollment.enrollment_status === 'pending_approval' && (
                      <div className="alert alert-info mt-3">
                        <h6 className="alert-heading">
                          <i className="fas fa-clock me-2"></i>
                          Pending Manager Approval
                        </h6>
                        <p className="mb-0">
                          Your documents have been uploaded and are waiting for review by the driving school manager. 
                          You will be notified once a decision is made.
                        </p>
                      </div>
                    )}

                    {enrollment.enrollment_status === 'pending_documents' && (
                      <div className="alert alert-warning mt-3">
                        <h6 className="alert-heading">
                          <i className="fas fa-upload me-2"></i>
                          Documents Required
                        </h6>
                        <p className="mb-0">
                          Please upload all required documents to proceed with your enrollment.
                        </p>
                        <div className="mt-3">
                          <button className="btn btn-warning btn-sm">
                            <i className="fas fa-upload me-2"></i>Upload Documents
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary information */}
          {enrollmentStatus && (
            <div className="row mt-4">
              <div className="col-md-4">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <h5 className="text-primary">{enrollmentStatus.total_enrollments}</h5>
                    <div className="small text-muted">Total Enrollments</div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <h5 className="text-success">
                      {enrollmentStatus.enrollments?.filter(e => e.enrollment_status === 'approved').length || 0}
                    </h5>
                    <div className="small text-muted">Approved</div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <h5 className={enrollmentStatus.has_rejections ? "text-danger" : "text-muted"}>
                      {enrollmentStatus.enrollments?.filter(e => e.enrollment_status === 'rejected').length || 0}
                    </h5>
                    <div className="small text-muted">Rejected</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentEnrollmentStatus;