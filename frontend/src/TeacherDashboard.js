import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TeacherDashboard = ({ user, token }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [students, setStudents] = useState([]);
  const [videoRooms, setVideoRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showVideoRoomModal, setShowVideoRoomModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form states
  const [sessionForm, setSessionForm] = useState({
    student_id: '',
    course_id: '',
    session_type: 'theory',
    scheduled_at: '',
    duration_minutes: 60,
    location: ''
  });

  const [videoRoomForm, setVideoRoomForm] = useState({
    student_id: '',
    course_id: '',
    scheduled_at: '',
    duration_minutes: 60
  });

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch teacher sessions
      const sessionsResponse = await axios.get(`${API}/sessions/my`, { headers });
      setSessions(sessionsResponse.data.sessions || []);

      // Fetch video rooms
      try {
        const videoRoomsResponse = await axios.get(`${API}/video-rooms/my`, { headers });
        setVideoRooms(videoRoomsResponse.data || []);
      } catch (videoError) {
        console.log('Video rooms endpoint not available:', videoError);
        setVideoRooms([]);
      }

      // Fetch teacher analytics
      try {
        const analyticsResponse = await axios.get(`${API}/analytics/teacher-performance/${user.id}`, { headers });
        setAnalytics(analyticsResponse.data);
      } catch (analyticsError) {
        console.log('Analytics not available:', analyticsError);
        setAnalytics({
          total_sessions: sessions.length,
          completed_sessions: sessions.filter(s => s.status === 'completed').length,
          rating: user.rating || 0,
          total_students: 0
        });
      }

      // Fetch assigned students
      try {
        const studentsResponse = await axios.get(`${API}/teacher/students`, { headers });
        setStudents(studentsResponse.data.students || []);
      } catch (studentsError) {
        console.log('Students endpoint not available:', studentsError);
        setStudents([]);
      }

    } catch (error) {
      console.error('Error fetching teacher data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async (sessionId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/sessions/${sessionId}/complete`, {}, { headers });
      
      setSessions(prev => 
        prev.map(session => 
          session.id === sessionId 
            ? { ...session, status: 'completed' }
            : session
        )
      );
      
      alert('Session completed successfully!');
    } catch (error) {
      console.error('Error completing session:', error);
      alert('Failed to complete session');
    }
  };

  const handleScheduleSession = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API}/sessions/schedule`, sessionForm, { headers });
      
      setSessions(prev => [...prev, response.data]);
      setShowSessionModal(false);
      setSessionForm({
        student_id: '',
        course_id: '',
        session_type: 'theory',
        scheduled_at: '',
        duration_minutes: 60,
        location: ''
      });
      
      alert('Session scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling session:', error);
      alert('Failed to schedule session');
    }
  };

  const handleCreateVideoRoom = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API}/video-rooms`, videoRoomForm, { headers });
      
      setVideoRooms(prev => [...prev, response.data]);
      setShowVideoRoomModal(false);
      setVideoRoomForm({
        student_id: '',
        course_id: '',
        scheduled_at: '',
        duration_minutes: 60
      });
      
      alert(`Online theory session created successfully! Room URL: ${response.data.room_url}`);
    } catch (error) {
      console.error('Error creating video room:', error);
      alert('Failed to create video room');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'scheduled': return 'bg-primary';
      case 'in_progress': return 'bg-warning';
      case 'cancelled': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getSessionTypeColor = (type) => {
    switch (type) {
      case 'theory': return 'bg-info';
      case 'park': return 'bg-warning';
      case 'road': return 'bg-success';
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
    <div className="teacher-dashboard">
      <div className="container-fluid px-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center py-4">
          <div>
            <h1 className="h3 mb-0">Teacher Dashboard</h1>
            <p className="text-muted mb-0">
              Welcome, {user.first_name} {user.last_name}
            </p>
          </div>
          <div className="d-flex gap-2">
            <button
              onClick={() => setShowSessionModal(true)}
              className="btn btn-primary"
            >
              <i className="fas fa-calendar-plus me-2"></i>
              Schedule Session
            </button>
            <button
              onClick={() => setShowVideoRoomModal(true)}
              className="btn btn-success"
            >
              <i className="fas fa-video me-2"></i>
              Create Online Course
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
              className={`nav-link ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => setActiveTab('sessions')}
            >
              <i className="fas fa-calendar me-2"></i>My Sessions ({sessions.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'online-courses' ? 'active' : ''}`}
              onClick={() => setActiveTab('online-courses')}
            >
              <i className="fas fa-video me-2"></i>Online Courses ({videoRooms.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              <i className="fas fa-users me-2"></i>My Students ({students.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              <i className="fas fa-chart-bar me-2"></i>Performance
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
                      <div className="h4 mb-0">{sessions.length}</div>
                      <div className="small">Total Sessions</div>
                    </div>
                    <div className="h1 opacity-50">
                      <i className="fas fa-calendar"></i>
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
                      <div className="h4 mb-0">
                        {sessions.filter(s => s.status === 'completed').length}
                      </div>
                      <div className="small">Completed Sessions</div>
                    </div>
                    <div className="h1 opacity-50">
                      <i className="fas fa-check-circle"></i>
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
                      <div className="h4 mb-0">{students.length}</div>
                      <div className="small">Active Students</div>
                    </div>
                    <div className="h1 opacity-50">
                      <i className="fas fa-users"></i>
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
                      <div className="h4 mb-0">{analytics?.rating || 0}/5</div>
                      <div className="small">Teacher Rating</div>
                    </div>
                    <div className="h1 opacity-50">
                      <i className="fas fa-star"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Sessions */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Upcoming Sessions</h5>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Session Type</th>
                          <th>Date & Time</th>
                          <th>Duration</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions
                          .filter(s => s.status === 'scheduled' || s.status === 'in_progress')
                          .slice(0, 5)
                          .map((session) => (
                          <tr key={session.id}>
                            <td>{session.student_name || 'Student'}</td>
                            <td>
                              <span className={`badge ${getSessionTypeColor(session.session_type)}`}>
                                {session.session_type?.toUpperCase()}
                              </span>
                            </td>
                            <td>{new Date(session.scheduled_at).toLocaleString()}</td>
                            <td>{session.duration_minutes} min</td>
                            <td>
                              <span className={`badge ${getStatusBadgeClass(session.status)}`}>
                                {session.status?.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              {session.status === 'scheduled' && (
                                <button
                                  onClick={() => handleCompleteSession(session.id)}
                                  className="btn btn-sm btn-success"
                                >
                                  Complete
                                </button>
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

        {activeTab === 'sessions' && (
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">All Sessions</h5>
              <button
                onClick={() => setShowSessionModal(true)}
                className="btn btn-primary"
              >
                <i className="fas fa-calendar-plus me-2"></i>Schedule New Session
              </button>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Session Type</th>
                      <th>Date & Time</th>
                      <th>Duration</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td>{session.student_name || 'Student'}</td>
                        <td>
                          <span className={`badge ${getSessionTypeColor(session.session_type)}`}>
                            {session.session_type?.toUpperCase()}
                          </span>
                        </td>
                        <td>{new Date(session.scheduled_at).toLocaleString()}</td>
                        <td>{session.duration_minutes} min</td>
                        <td>{session.location || 'N/A'}</td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(session.status)}`}>
                            {session.status?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            {session.status === 'scheduled' && (
                              <button
                                onClick={() => handleCompleteSession(session.id)}
                                className="btn btn-success"
                              >
                                Complete
                              </button>
                            )}
                            <button className="btn btn-outline-primary">
                              <i className="fas fa-eye"></i>
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

        {activeTab === 'online-courses' && (
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Online Theory Courses</h5>
              <button
                onClick={() => setShowVideoRoomModal(true)}
                className="btn btn-success"
              >
                <i className="fas fa-video me-2"></i>Create New Online Course
              </button>
            </div>
            <div className="card-body">
              {videoRooms.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Course</th>
                        <th>Scheduled Date</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videoRooms.map((room) => (
                        <tr key={room.id}>
                          <td>{room.student_name || 'Student'}</td>
                          <td>
                            <span className="badge bg-info">
                              THEORY COURSE
                            </span>
                          </td>
                          <td>{new Date(room.scheduled_at).toLocaleString()}</td>
                          <td>{room.duration_minutes} min</td>
                          <td>
                            <span className={`badge ${room.is_active ? 'bg-success' : 'bg-secondary'}`}>
                              {room.is_active ? 'ACTIVE' : 'COMPLETED'}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              {room.is_active && (
                                <a
                                  href={room.room_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-primary"
                                >
                                  <i className="fas fa-video me-1"></i>Join Room
                                </a>
                              )}
                              <button className="btn btn-outline-secondary">
                                <i className="fas fa-eye"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-video fa-4x text-muted mb-4"></i>
                  <h5>No Online Courses Created</h5>
                  <p className="text-muted">Create online theory courses to teach students remotely using video calls</p>
                  <button
                    onClick={() => setShowVideoRoomModal(true)}
                    className="btn btn-success"
                  >
                    <i className="fas fa-video me-2"></i>Create First Online Course
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">My Students</h5>
            </div>
            <div className="card-body">
              <div className="row g-4">
                {students.map((student) => (
                  <div key={student.id} className="col-md-6 col-lg-4">
                    <div className="card h-100">
                      <div className="card-body text-center">
                        <div className="avatar bg-primary text-white rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                          {student.name?.charAt(0) || 'S'}
                        </div>
                        <h6 className="card-title">{student.name}</h6>
                        <p className="text-muted small mb-2">{student.email}</p>
                        
                        <div className="mb-3">
                          <div className="text-muted small">
                            Progress: {student.progress || 0}%
                          </div>
                          <div className="progress mt-1" style={{ height: '4px' }}>
                            <div
                              className="progress-bar bg-primary"
                              style={{ width: `${student.progress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="d-grid gap-2">
                          <button className="btn btn-outline-primary btn-sm">
                            <i className="fas fa-calendar me-2"></i>Schedule Session
                          </button>
                          <button className="btn btn-outline-secondary btn-sm">
                            <i className="fas fa-chart-line me-2"></i>View Progress
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {students.length === 0 && (
                  <div className="col-12">
                    <div className="text-center py-5">
                      <i className="fas fa-users fa-4x text-muted mb-4"></i>
                      <h5>No Students Assigned</h5>
                      <p className="text-muted">Students will appear here once they are enrolled in your courses</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && analytics && (
          <div className="row g-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h6 className="card-title mb-0">Teaching Performance</h6>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="metric">
                        <div className="metric-value h4 mb-0">{analytics.total_sessions || 0}</div>
                        <div className="metric-label text-muted">Total Sessions</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="metric">
                        <div className="metric-value h4 mb-0">{analytics.completed_sessions || 0}</div>
                        <div className="metric-label text-muted">Completed</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="metric">
                        <div className="metric-value h4 mb-0">{analytics.rating || 0}/5</div>
                        <div className="metric-label text-muted">Rating</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="metric">
                        <div className="metric-value h4 mb-0">{analytics.total_students || 0}</div>
                        <div className="metric-label text-muted">Students</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h6 className="card-title mb-0">Session Types</h6>
                </div>
                <div className="card-body">
                  <div className="session-stats">
                    {['theory', 'park', 'road'].map((type) => {
                      const typeSessions = sessions.filter(s => s.session_type === type);
                      const completed = typeSessions.filter(s => s.status === 'completed').length;
                      const total = typeSessions.length;
                      const percentage = total > 0 ? (completed / total) * 100 : 0;
                      
                      return (
                        <div key={type} className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <div className="fw-bold text-capitalize">{type}</div>
                            <div className="small text-muted">{completed}/{total} completed</div>
                          </div>
                          <div className="text-end">
                            <div className="h6 mb-0">{Math.round(percentage)}%</div>
                            <div className="progress" style={{ width: '60px', height: '4px' }}>
                              <div
                                className={`progress-bar ${getSessionTypeColor(type).replace('bg-', 'bg-')}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Session Modal */}
      {showSessionModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Schedule New Session</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSessionModal(false)}
                ></button>
              </div>
              <form onSubmit={handleScheduleSession}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Student *</label>
                      <select
                        className="form-select"
                        value={sessionForm.student_id}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, student_id: e.target.value }))}
                        required
                      >
                        <option value="">Select Student</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Session Type *</label>
                      <select
                        className="form-select"
                        value={sessionForm.session_type}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, session_type: e.target.value }))}
                        required
                      >
                        <option value="theory">Theory</option>
                        <option value="park">Park Practice</option>
                        <option value="road">Road Practice</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date & Time *</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={sessionForm.scheduled_at}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Duration (minutes) *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={sessionForm.duration_minutes}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                        min="30"
                        max="180"
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        className="form-control"
                        value={sessionForm.location}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Enter session location (for park/road sessions)"
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSessionModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Schedule Session
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Video Room Modal */}
      {showVideoRoomModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Online Theory Course</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowVideoRoomModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateVideoRoom}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    Create an online theory course with video calling to teach students remotely.
                  </div>
                  
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Student *</label>
                      <select
                        className="form-select"
                        value={videoRoomForm.student_id}
                        onChange={(e) => setVideoRoomForm(prev => ({ ...prev, student_id: e.target.value }))}
                        required
                      >
                        <option value="">Select Student</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Course *</label>
                      <select
                        className="form-select"
                        value={videoRoomForm.course_id}
                        onChange={(e) => setVideoRoomForm(prev => ({ ...prev, course_id: e.target.value }))}
                        required
                      >
                        <option value="">Select Course</option>
                        <option value="theory-course-1">Theory Course - Road Signs</option>
                        <option value="theory-course-2">Theory Course - Traffic Rules</option>
                        <option value="theory-course-3">Theory Course - Safety Guidelines</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date & Time *</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={videoRoomForm.scheduled_at}
                        onChange={(e) => setVideoRoomForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Duration (minutes) *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={videoRoomForm.duration_minutes}
                        onChange={(e) => setVideoRoomForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                        min="30"
                        max="120"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h6 className="fw-bold">What happens next?</h6>
                    <ul className="list-unstyled">
                      <li><i className="fas fa-check text-success me-2"></i>A video room will be created using Daily.co</li>
                      <li><i className="fas fa-check text-success me-2"></i>You and your student will receive the room link</li>
                      <li><i className="fas fa-check text-success me-2"></i>You can start teaching theory concepts online</li>
                      <li><i className="fas fa-check text-success me-2"></i>Screen sharing and interactive features available</li>
                    </ul>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowVideoRoomModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success">
                    <i className="fas fa-video me-2"></i>Create Video Room
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

export default TeacherDashboard;