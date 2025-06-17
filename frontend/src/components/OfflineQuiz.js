import React, { useState, useEffect, useCallback } from 'react';

const OfflineQuiz = ({ onClose }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load quizzes on component mount
  useEffect(() => {
    loadQuizzes();
  }, []);

  // Timer effect
  useEffect(() => {
    let timer;
    if (quizStarted && !quizCompleted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleQuizSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizStarted, quizCompleted, timeLeft]);

  const loadQuizzes = async () => {
    try {
      // First try to load from network
      if (isOnline) {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/quizzes/theory`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
          const data = await response.json();
          setQuizzes(data);
          // Store in localStorage for offline use
          localStorage.setItem('offline_quizzes', JSON.stringify(data));
          return;
        }
      }
      
      // Fallback to cached/offline quizzes
      const cachedQuizzes = localStorage.getItem('offline_quizzes');
      if (cachedQuizzes) {
        setQuizzes(JSON.parse(cachedQuizzes));
      } else {
        // Default offline quiz if no cache available
        setQuizzes([{
          id: 'offline-default',
          title: 'Road Signs Quiz (Offline)',
          description: 'Practice road signs offline',
          difficulty: 'medium',
          questions: [
            {
              id: 1,
              question: 'What does a red triangle sign with an exclamation mark mean?',
              options: ['Stop', 'General Warning', 'No Entry', 'Speed Limit'],
              correct_answer: 'General Warning',
              explanation: 'A red triangle with exclamation mark indicates a general warning to drivers.'
            },
            {
              id: 2,
              question: 'What is the speed limit in urban areas in Algeria?',
              options: ['40 km/h', '50 km/h', '60 km/h', '70 km/h'],
              correct_answer: '50 km/h',
              explanation: 'The speed limit in urban areas in Algeria is 50 km/h unless otherwise indicated.'
            },
            {
              id: 3,
              question: 'When should you use your headlights during the day?',
              options: ['Never', 'Only when raining', 'Outside urban areas', 'Always'],
              correct_answer: 'Outside urban areas',
              explanation: 'In Algeria, headlights must be used during the day when driving outside urban areas.'
            },
            {
              id: 4,
              question: 'What does a circular blue sign with a white arrow mean?',
              options: ['Prohibition', 'Mandatory direction', 'Information', 'Warning'],
              correct_answer: 'Mandatory direction',
              explanation: 'Blue circular signs indicate mandatory actions, including direction.'
            },
            {
              id: 5,
              question: 'At what age can you get a driving license in Algeria?',
              options: ['16 years', '17 years', '18 years', '19 years'],
              correct_answer: '18 years',
              explanation: 'In Algeria, you must be at least 18 years old to obtain a driving license.'
            }
          ],
          passing_score: 70,
          time_limit_minutes: 10,
          offline: true
        }]);
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
      // Load from localStorage if available
      const cachedQuizzes = localStorage.getItem('offline_quizzes');
      if (cachedQuizzes) {
        setQuizzes(JSON.parse(cachedQuizzes));
      }
    }
  };

  const startQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeft(quiz.time_limit_minutes * 60);
    setQuizStarted(true);
    setQuizCompleted(false);
    setScore(0);
  };

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleQuizSubmit = useCallback(() => {
    if (!selectedQuiz || quizCompleted) return;

    // Calculate score
    let correctAnswers = 0;
    selectedQuiz.questions.forEach(question => {
      if (answers[question.id] === question.correct_answer) {
        correctAnswers++;
      }
    });

    const finalScore = Math.round((correctAnswers / selectedQuiz.questions.length) * 100);
    setScore(finalScore);
    setQuizCompleted(true);
    setQuizStarted(false);

    // Store result locally for sync when online
    const result = {
      id: Date.now().toString(),
      quiz_id: selectedQuiz.id,
      answers: answers,
      score: finalScore,
      passed: finalScore >= selectedQuiz.passing_score,
      completed_at: new Date().toISOString(),
      time_taken: (selectedQuiz.time_limit_minutes * 60) - timeLeft,
      offline: !isOnline
    };

    // Store in localStorage for sync
    const storedResults = JSON.parse(localStorage.getItem('offline_quiz_results') || '[]');
    storedResults.push(result);
    localStorage.setItem('offline_quiz_results', JSON.stringify(storedResults));

    // Try to sync immediately if online
    if (isOnline) {
      syncQuizResults();
    }
  }, [selectedQuiz, answers, quizCompleted, timeLeft, isOnline]);

  const syncQuizResults = async () => {
    const storedResults = JSON.parse(localStorage.getItem('offline_quiz_results') || '[]');
    if (storedResults.length === 0) return;

    setSyncStatus('syncing');
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setSyncStatus('error');
        return;
      }

      for (const result of storedResults) {
        try {
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/quiz-attempts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(result)
          });

          if (response.ok) {
            // Remove synced result
            const updatedResults = storedResults.filter(r => r.id !== result.id);
            localStorage.setItem('offline_quiz_results', JSON.stringify(updatedResults));
          }
        } catch (error) {
          console.error('Failed to sync individual result:', error);
        }
      }

      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && syncStatus === 'idle') {
      const storedResults = JSON.parse(localStorage.getItem('offline_quiz_results') || '[]');
      if (storedResults.length > 0) {
        syncQuizResults();
      }
    }
  }, [isOnline]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!selectedQuiz) return 0;
    return Math.round(((currentQuestionIndex + 1) / selectedQuiz.questions.length) * 100);
  };

  const currentQuestion = selectedQuiz?.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === selectedQuiz?.questions.length - 1;
  const unsyncedResults = JSON.parse(localStorage.getItem('offline_quiz_results') || '[]').length;

  if (!quizStarted && !quizCompleted) {
    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999}}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            {/* Header */}
            <div className="modal-header bg-primary text-white">
              <div>
                <h2 className="modal-title fs-4 fw-bold">Offline Quizzes</h2>
                <p className="mb-0 opacity-75">Practice anytime, anywhere</p>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>

            {/* Connection Status */}
            <div className="bg-primary bg-opacity-75 text-white">
              <div className="container-fluid">
                <div className="d-flex align-items-center p-3">
                  <div className={`rounded-circle me-3 ${isOnline ? 'bg-success' : 'bg-danger'}`} 
                       style={{width: '12px', height: '12px'}}></div>
                  <span className="small">
                    {isOnline ? 'Online' : 'Offline'} 
                    {unsyncedResults > 0 && (
                      <span className="ms-2 badge bg-warning text-dark">
                        {unsyncedResults} results pending sync
                      </span>
                    )}
                  </span>
                  {syncStatus === 'syncing' && (
                    <div className="ms-auto d-flex align-items-center">
                      <div className="spinner-border spinner-border-sm text-light me-2"></div>
                      <span className="small">Syncing...</span>
                    </div>
                  )}
                  {syncStatus === 'synced' && (
                    <div className="ms-auto d-flex align-items-center text-success">
                      <i className="bi bi-check-circle me-1"></i>
                      <span className="small">Synced</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quiz List */}
            <div className="modal-body">
              {quizzes.length === 0 ? (
                <div className="text-center py-5">
                  <div style={{fontSize: '4rem'}} className="mb-4">📚</div>
                  <p className="text-muted mb-4">No quizzes available offline</p>
                  <button
                    onClick={loadQuizzes}
                    className="btn btn-primary"
                  >
                    Retry Loading
                  </button>
                </div>
              ) : (
                <div className="row g-3">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="col-12">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <h5 className="card-title d-flex align-items-center">
                                {quiz.title}
                                {quiz.offline && (
                                  <span className="ms-2 badge bg-secondary">
                                    📱 Offline
                                  </span>
                                )}
                              </h5>
                              <p className="card-text text-muted">{quiz.description}</p>
                              
                              <div className="d-flex flex-wrap gap-3 text-muted small">
                                <span>
                                  <i className="bi bi-question-circle me-1"></i>
                                  {quiz.questions?.length || 0} questions
                                </span>
                                <span>
                                  <i className="bi bi-clock me-1"></i>
                                  {quiz.time_limit_minutes || 30} minutes
                                </span>
                                <span className={`badge ${
                                  quiz.difficulty === 'easy' ? 'bg-success' :
                                  quiz.difficulty === 'medium' ? 'bg-warning' :
                                  'bg-danger'
                                }`}>
                                  {quiz.difficulty || 'medium'}
                                </span>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => startQuiz(quiz)}
                              className="btn btn-primary ms-3"
                            >
                              Start Quiz
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const passed = score >= selectedQuiz.passing_score;
    
    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999}}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className={`modal-header text-white ${passed ? 'bg-success' : 'bg-danger'}`}>
              <div className="text-center w-100">
                <div style={{fontSize: '4rem'}} className="mb-3">{passed ? '🎉' : '😔'}</div>
                <h2 className="modal-title fs-4 fw-bold">
                  {passed ? 'Congratulations!' : 'Try Again!'}
                </h2>
                <p className="fs-5 mb-0">Score: {score}%</p>
              </div>
            </div>

            <div className="modal-body text-center">
              <p className="text-muted mb-4">
                {passed 
                  ? `You passed the quiz! You need ${selectedQuiz.passing_score}% to pass.`
                  : `You need ${selectedQuiz.passing_score}% to pass. Keep practicing!`
                }
              </p>

              {!isOnline && (
                <div className="alert alert-warning d-flex align-items-center">
                  <i className="bi bi-phone me-2"></i>
                  <small>Your result is saved offline and will sync when you're back online.</small>
                </div>
              )}

              <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                <button
                  onClick={() => startQuiz(selectedQuiz)}
                  className="btn btn-primary"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    setSelectedQuiz(null);
                    setQuizCompleted(false);
                  }}
                  className="btn btn-secondary"
                >
                  Back to Quizzes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress
  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999}}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          {/* Header with progress */}
          <div className="modal-header bg-primary text-white">
            <div className="w-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="modal-title fw-bold">{selectedQuiz.title}</h5>
                <div className="text-end">
                  <div className="fs-5 fw-bold">{formatTime(timeLeft)}</div>
                  <div className="small opacity-75">Time Left</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="progress mb-2" style={{height: '8px'}}>
                <div 
                  className="progress-bar bg-light"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              <div className="small opacity-75">
                Question {currentQuestionIndex + 1} of {selectedQuiz.questions.length}
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="modal-body">
            <div className="mb-4">
              <h6 className="fw-semibold mb-4">
                {currentQuestion.question}
              </h6>

              <div className="d-grid gap-3">
                {currentQuestion.options.map((option, index) => (
                  <label
                    key={index}
                    className={`d-flex align-items-center p-3 border rounded cursor-pointer ${
                      answers[currentQuestion.id] === option
                        ? 'border-primary bg-primary bg-opacity-10'
                        : 'border-secondary'
                    }`}
                    style={{cursor: 'pointer'}}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={() => handleAnswerSelect(currentQuestion.id, option)}
                      className="form-check-input me-3"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="d-flex justify-content-between align-items-center">
              <button
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
                className="btn btn-outline-secondary d-flex align-items-center"
              >
                <i className="bi bi-chevron-left me-1"></i>
                Previous
              </button>

              {isLastQuestion ? (
                <button
                  onClick={handleQuizSubmit}
                  className="btn btn-success fw-medium"
                >
                  Submit Quiz
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="btn btn-primary d-flex align-items-center"
                >
                  Next
                  <i className="bi bi-chevron-right ms-1"></i>
                </button>
              )}
            </div>

            {/* Offline indicator */}
            {!isOnline && (
              <div className="alert alert-warning d-flex align-items-center mt-4">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <small>Taking quiz offline - results will sync when you reconnect</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineQuiz;