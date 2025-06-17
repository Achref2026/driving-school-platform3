import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

// Offline Quiz Component (now removed from main interface)
const OfflineQuiz = ({ onClose }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const questions = [
    {
      question: "What does a red traffic light mean?",
      options: [
        { text: "Go", correct: false },
        { text: "Stop", correct: true },
        { text: "Slow down", correct: false },
        { text: "Caution", correct: false }
      ]
    },
    {
      question: "At a stop sign, you should:",
      options: [
        { text: "Slow down and proceed", correct: false },
        { text: "Come to a complete stop", correct: true },
        { text: "Only stop if traffic is coming", correct: false },
        { text: "Speed up to get through quickly", correct: false }
      ]
    },
    {
      question: "When should you use your turn signals?",
      options: [
        { text: "Only when turning left", correct: false },
        { text: "Only when turning right", correct: false },
        { text: "When changing lanes or turning", correct: true },
        { text: "Only at intersections", correct: false }
      ]
    }
  ];

  const handleAnswerClick = (isCorrect) => {
    setSelectedAnswer(isCorrect);
    
    setTimeout(() => {
      if (isCorrect) {
        setScore(score + 1);
      }

      const nextQuestion = currentQuestion + 1;
      if (nextQuestion < questions.length) {
        setCurrentQuestion(nextQuestion);
        setSelectedAnswer(null);
      } else {
        setShowScore(true);
      }
    }, 1000);
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowScore(false);
    setSelectedAnswer(null);
  };

  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0, 0, 0, 0.75)'}} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">📚 Practice Quiz - Traffic Rules</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            {showScore ? (
              <div className="text-center py-5">
                <div className="display-4 mb-4">
                  {score >= questions.length * 0.7 ? '🎉' : '📚'}
                </div>
                <h3 className="mb-3">
                  You scored {score} out of {questions.length}
                </h3>
                <p className="lead mb-4">
                  {score >= questions.length * 0.7 
                    ? 'Great job! You have a good understanding of traffic rules.'
                    : 'Keep studying! Practice makes perfect.'
                  }
                </p>
                <div className="d-flex gap-3 justify-content-center">
                  <button onClick={resetQuiz} className="btn btn-primary">
                    Try Again
                  </button>
                  <button onClick={onClose} className="btn btn-secondary">
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <span className="text-muted">
                    Question {currentQuestion + 1} of {questions.length}
                  </span>
                  <div className="progress" style={{width: '200px'}}>
                    <div 
                      className="progress-bar" 
                      style={{width: `${((currentQuestion + 1) / questions.length) * 100}%`}}
                    ></div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="mb-4">{questions[currentQuestion].question}</h4>
                  
                  <div className="d-grid gap-3">
                    {questions[currentQuestion].options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerClick(option.correct)}
                        disabled={selectedAnswer !== null}
                        className={`btn btn-outline-primary text-start p-3 ${
                          selectedAnswer !== null
                            ? option.correct
                              ? 'btn-success'
                              : selectedAnswer === option.correct
                                ? 'btn-danger'
                                : 'btn-outline-secondary'
                            : ''
                        }`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// PWA Install Prompt Component
const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="position-fixed bottom-0 start-0 end-0 bg-primary text-white p-3 m-3 rounded shadow-lg" style={{zIndex: 9999}}>
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h6 className="mb-1">📱 Install AutoKademia App</h6>
          <p className="mb-0 small">Get the full experience with our mobile app!</p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={handleInstallClick} className="btn btn-light btn-sm">
            Install
          </button>
          <button 
            onClick={() => setShowInstallPrompt(false)} 
            className="btn btn-outline-light btn-sm"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  // State management
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showOfflineQuiz, setShowOfflineQuiz] = useState(false);
  
  // Form states
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: 'male',
    state: ''
  });
  
  // Loading and message states
  const [authLoading, setAuthLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [globalError, setGlobalError] = useState('');
  
  // Data states
  const [drivingSchools, setDrivingSchools] = useState([]);
  const [states, setStates] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    has_prev: false,
    has_next: false
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    state: '',
    search: '',
    min_price: '',
    max_price: '',
    min_rating: '',
    sort_by: 'name',
    sort_order: 'asc'
  });

  // Get backend URL from environment
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Translations
  const translations = {
    en: {
      // Navigation
      home: 'Home',
      schools: 'Schools',
      dashboard: 'Dashboard',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      
      // Home page
      welcome: 'Master Driving in Algeria',
      subtitle: 'Join thousands of students learning to drive safely across all 58 wilayas with certified instructors.',
      findSchools: 'Find Schools',
      learnMore: 'Learn More',
      
      // Schools page
      searchPlaceholder: 'Search driving schools...',
      filterByState: 'Filter by State',
      allStates: 'All States',
      minPrice: 'Min Price',
      maxPrice: 'Max Price',
      minRating: 'Min Rating',
      sortBy: 'Sort By',
      
      // Common
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      state: 'State',
      enrollNow: 'Enroll Now',
      viewDetails: 'View Details',
      
      // Features
      features: 'Why Choose AutoKademia?',
      featureTitle1: 'Certified Instructors',
      featureDesc1: 'Learn from experienced, certified driving instructors across Algeria.',
      featureTitle2: 'Comprehensive Courses',
      featureDesc2: 'Theory, parking, and road practice - complete driving education.',
      featureTitle3: 'Flexible Scheduling',
      featureDesc3: 'Book lessons at your convenience with our flexible scheduling system.',
      featureTitle4: 'Modern Vehicles',
      featureDesc4: 'Practice with well-maintained, modern vehicles equipped with safety features.',
      
      // Reviews
      reviews: 'What Our Students Say',
      
      // Contact
      contactUs: 'Contact Us',
      contactDesc: 'Have questions? Get in touch with our team.',
      contactEmail: 'info@autokademia.dz',
      contactPhone: '+213 555 123 456',
      contactAddress: 'Algiers, Algeria'
    },
    ar: {
      // Navigation
      home: 'الرئيسية',
      schools: 'المدارس',
      dashboard: 'لوحة القيادة',
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      logout: 'تسجيل الخروج',
      
      // Home page
      welcome: 'تعلم القيادة في الجزائر',
      subtitle: 'انضم إلى آلاف الطلاب الذين يتعلمون القيادة الآمنة في جميع الولايات الـ58 مع مدربين معتمدين.',
      findSchools: 'البحث عن المدارس',
      learnMore: 'تعرف أكثر',
      
      // Schools page
      searchPlaceholder: 'البحث عن مدارس تعليم القيادة...',
      filterByState: 'تصفية حسب الولاية',
      allStates: 'جميع الولايات',
      minPrice: 'أقل سعر',
      maxPrice: 'أعلى سعر',
      minRating: 'أقل تقييم',
      sortBy: 'ترتيب حسب',
      
      // Common
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      address: 'العنوان',
      state: 'الولاية',
      enrollNow: 'التسجيل الآن',
      viewDetails: 'عرض التفاصيل',
      
      // Features
      features: 'لماذا تختار أوتوكاديميا؟',
      featureTitle1: 'مدربون معتمدون',
      featureDesc1: 'تعلم من مدربي القيادة ذوي الخبرة والمعتمدين في جميع أنحاء الجزائر.',
      featureTitle2: 'دورات شاملة',
      featureDesc2: 'النظرية والتوقيف والممارسة على الطريق - تعليم قيادة كامل.',
      featureTitle3: 'جدولة مرنة',
      featureDesc3: 'احجز الدروس في الوقت المناسب لك مع نظام الجدولة المرن.',
      featureTitle4: 'مركبات حديثة',
      featureDesc4: 'تدرب مع مركبات حديثة مصانة جيداً ومجهزة بميزات الأمان.',
      
      // Reviews
      reviews: 'ماذا يقول طلابنا',
      
      // Contact
      contactUs: 'اتصل بنا',
      contactDesc: 'لديك أسئلة؟ تواصل مع فريقنا.',
      contactEmail: 'info@autokademia.dz',
      contactPhone: '+213 555 123 456',
      contactAddress: 'الجزائر العاصمة، الجزائر'
    },
    fr: {
      // Navigation
      home: 'Accueil',
      schools: 'Écoles',
      dashboard: 'Tableau de bord',
      login: 'Connexion',
      register: 'S\'inscrire',
      logout: 'Déconnexion',
      
      // Home page
      welcome: 'Maîtriser la conduite en Algérie',
      subtitle: 'Rejoignez des milliers d\'étudiants apprenant à conduire en sécurité dans les 58 wilayas avec des instructeurs certifiés.',
      findSchools: 'Trouver des écoles',
      learnMore: 'En savoir plus',
      
      // Schools page
      searchPlaceholder: 'Rechercher des auto-écoles...',
      filterByState: 'Filtrer par wilaya',
      allStates: 'Toutes les wilayas',
      minPrice: 'Prix min',
      maxPrice: 'Prix max',
      minRating: 'Note min',
      sortBy: 'Trier par',
      
      // Common
      email: 'Email',
      phone: 'Téléphone',
      address: 'Adresse',
      state: 'Wilaya',
      enrollNow: 'S\'inscrire maintenant',
      viewDetails: 'Voir les détails',
      
      // Features
      features: 'Pourquoi choisir AutoKademia?',
      featureTitle1: 'Instructeurs certifiés',
      featureDesc1: 'Apprenez avec des instructeurs de conduite expérimentés et certifiés à travers l\'Algérie.',
      featureTitle2: 'Cours complets',
      featureDesc2: 'Théorie, stationnement et pratique routière - formation complète à la conduite.',
      featureTitle3: 'Horaires flexibles',
      featureDesc3: 'Réservez des cours à votre convenance avec notre système de planification flexible.',
      featureTitle4: 'Véhicules modernes',
      featureDesc4: 'Pratiquez avec des véhicules modernes bien entretenus et équipés de dispositifs de sécurité.',
      
      // Reviews
      reviews: 'Ce que disent nos étudiants',
      
      // Contact
      contactUs: 'Nous contacter',
      contactDesc: 'Des questions? Contactez notre équipe.',
      contactEmail: 'info@autokademia.dz',
      contactPhone: '+213 555 123 456',
      contactAddress: 'Alger, Algérie'
    }
  };

  const t = translations[currentLanguage];

  // Initialize app
  useEffect(() => {
    // Check for stored auth token
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }
    
    // Fetch initial data
    fetchStates();
  }, []);

  // Fetch states from API
  const fetchStates = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/states`);
      setStates(response.data.states);
    } catch (error) {
      console.error('Error fetching states:', error);
      setGlobalError('Failed to load states');
    }
  };

  // Auth functions
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
     
      let requestData;
      if (authMode === 'login') {
        requestData = {
          email: authData.email,
          password: authData.password
        };
      } else {
        requestData = new FormData();
        Object.keys(authData).forEach(key => {
          requestData.append(key, authData[key]);
        });
      }

      const response = await axios.post(`${backendUrl}${endpoint}`, requestData, {
        headers: authMode === 'register' ? {
          'Content-Type': 'multipart/form-data'
        } : {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.access_token) {
        localStorage.setItem('authToken', response.data.access_token);
        localStorage.setItem('userData', JSON.stringify(response.data.user));
        setUser(response.data.user);
        setShowAuthModal(false);
        setSuccessMessage(response.data.message || 'Authentication successful!');
        
        // Reset form
        setAuthData({
          email: '',
          password: '',
          first_name: '',
          last_name: '',
          phone: '',
          address: '',
          date_of_birth: '',
          gender: 'male',
          state: ''
        });
        
        // Navigate to dashboard if user is logged in
        if (response.data.user.role !== 'guest') {
          setCurrentPage('dashboard');
          fetchDashboardData();
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setErrorMessage(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
    setCurrentPage('home');
    setSuccessMessage('Logged out successfully');
  };

  // Dashboard data fetch
  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${backendUrl}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setGlobalError('Failed to load dashboard data');
    }
  };

  // Driving schools fetch
  const fetchDrivingSchools = async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: params.page || pagination.current_page || 1,
        limit: 12,
        ...filters,
        ...params
      });

      const response = await axios.get(`${backendUrl}/api/driving-schools?${queryParams}`);
      setDrivingSchools(response.data.schools);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching driving schools:', error);
      setGlobalError('Failed to load driving schools');
      setDrivingSchools([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle enrollment
  const handleEnroll = async (schoolId) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${backendUrl}/api/enrollments`,
        { school_id: schoolId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccessMessage('Enrollment submitted successfully! Please upload required documents.');
      setCurrentPage('dashboard');
      fetchDashboardData();
    } catch (error) {
      console.error('Enrollment error:', error);
      setGlobalError(error.response?.data?.detail || 'Failed to enroll');
    }
  };

  // Filter handlers
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchDrivingSchools({ ...newFilters, page: 1 });
  };

  const clearFilters = () => {
    const clearedFilters = {
      state: '',
      search: '',
      min_price: '',
      max_price: '',
      min_rating: '',
      sort_by: 'name',
      sort_order: 'asc'
    };
    setFilters(clearedFilters);
    fetchDrivingSchools({ ...clearedFilters, page: 1 });
  };

  // Navigation Component
  const renderNavigation = () => (
    <nav className="navbar navbar-expand-lg navbar-light bg-white fixed-top shadow-sm">
      <div className="container">
        <a href="#" className="navbar-brand d-flex align-items-center" onClick={() => setCurrentPage('home')}>
          <div className="brand-logo me-3">
            <img 
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDVMMzMuMzAxIDEyLjVWMjcuNUwyMCAzNUw2LjY5ODcgMjcuNVYxMi41TDIwIDVaIiBzdHJva2U9IiMxZTQwYWYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iIzFlNDBhZiIgZmlsbC1vcGFjaXR5PSIwLjEiLz4KPHN2ZyB4PSI4IiB5PSIxMiIgd2lkdGg9IjI0IiBoZWlnaHQ9IjE2IiB2aWV3Qm94PSIwIDAgMjQgMTYiIGZpbGw9Im5vbmUiPgo8cGF0aCBkPSJNMTkgMTJINUMzLjkgMTIgMyAxMiAzIDEyVjVDMyAzLjkgMy45IDMgNSAzSDE5QzIwLjEgMyAyMSAzLjkgMjEgNVYxMkMyMSAxMiAyMC4xIDEyIDE5IDEyWiIgZmlsbD0iIzFlNDBhZiIvPgo8Y2lyY2xlIGN4PSI3IiBjeT0iMTQiIHI9IjIiIGZpbGw9IiMxZTQwYWYiLz4KPGNpcmNsZSBjeD0iMTciIGN5PSIxNCIgcj0iMiIgZmlsbD0iIzFlNDBhZiIvPgo8cGF0aCBkPSJNMTIgMTZWMjAiIHN0cm9rZT0iIzFlNDBhZiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHBhdGggZD0iTTggMjBIMTYiIHN0cm9rZT0iIzFlNDBhZiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+Cjwvc3ZnPgo=" 
              alt="AutoKademia Logo" 
              className="brand-logo-img"
            />
          </div>
          <div className="brand-text">
            <div className="brand-name">AutoKademia</div>
            <div className="brand-tagline">Driving Excellence</div>
          </div>
        </a>

        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <a 
                href="#" 
                className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
                onClick={() => setCurrentPage('home')}
              >
                {t.home}
              </a>
            </li>
            <li className="nav-item">
              <a 
                href="#" 
                className={`nav-link ${currentPage === 'schools' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage('schools');
                  fetchDrivingSchools();
                }}
              >
                {t.schools}
              </a>
            </li>
            {user && (
              <li className="nav-item">
                <a 
                  href="#" 
                  className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentPage('dashboard');
                    fetchDashboardData();
                  }}
                >
                  {t.dashboard}
                </a>
              </li>
            )}
          </ul>

          <div className="navbar-nav align-items-center">
            {/* Language Selector */}
            <div className="nav-item me-3">
              <select
                value={currentLanguage}
                onChange={(e) => setCurrentLanguage(e.target.value)}
                className="form-select form-select-sm"
                style={{ minWidth: '80px' }}
              >
                <option value="en">🇺🇸 EN</option>
                <option value="ar">🇩🇿 AR</option>
                <option value="fr">🇫🇷 FR</option>
              </select>
            </div>

            {user ? (
              <div className="nav-item dropdown">
                <a 
                  href="#" 
                  className="nav-link dropdown-toggle d-flex align-items-center" 
                  id="navbarDropdown" 
                  role="button" 
                  data-bs-toggle="dropdown"
                >
                  <div className="user-avatar me-2">
                    {user.first_name?.charAt(0) || 'U'}
                  </div>
                  {user.first_name} {user.last_name}
                </a>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <a 
                      href="#" 
                      className="dropdown-item"
                      onClick={() => {
                        setCurrentPage('dashboard');
                        fetchDashboardData();
                      }}
                    >
                      {t.dashboard}
                    </a>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <a href="#" className="dropdown-item" onClick={handleLogout}>
                      {t.logout}
                    </a>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <li className="nav-item me-2">
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setShowAuthModal(true);
                    }}
                    className="btn btn-outline-primary btn-sm"
                  >
                    {t.login}
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    onClick={() => {
                      setAuthMode('register');
                      setShowAuthModal(true);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    {t.register}
                  </button>
                </li>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  // Home Page Component
  const renderHomePage = () => (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section" style={{
        backgroundImage: `linear-gradient(rgba(30, 64, 175, 0.8), rgba(30, 64, 175, 0.6)), url('https://images.pexels.com/photos/8550826/pexels-photo-8550826.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="container">
          <div className="row align-items-center min-vh-100 py-5">
            <div className="col-lg-6">
              <div className="hero-content text-white">
                <div className="hero-badge mb-4">
                  <span className="badge bg-light text-primary px-3 py-2">
                    🇩🇿 Trusted by 10,000+ Students Across Algeria
                  </span>
                </div>
                
                <h1 className="hero-title display-2 fw-bold mb-4">
                  {t.welcome}
                </h1>
                
                <p className="hero-subtitle fs-4 mb-5 text-light">
                  {t.subtitle}
                </p>
                
                <div className="hero-buttons d-flex flex-wrap gap-3 mb-5">
                  <button
                    onClick={() => {
                      setCurrentPage('schools');
                      fetchDrivingSchools();
                    }}
                    className="btn btn-primary btn-lg px-4 py-3"
                  >
                    <i className="fas fa-search me-2"></i>
                    {t.findSchools}
                  </button>
                  <button className="btn btn-outline-light btn-lg px-4 py-3">
                    <i className="fas fa-play me-2"></i>
                    {t.learnMore}
                  </button>
                </div>

                {/* Hero Stats */}
                <div className="hero-stats row text-center">
                  <div className="col-4">
                    <div className="stat-number display-6 fw-bold">58</div>
                    <div className="stat-label">Wilayas</div>
                  </div>
                  <div className="col-4">
                    <div className="stat-number display-6 fw-bold">500+</div>
                    <div className="stat-label">Schools</div>
                  </div>
                  <div className="col-4">
                    <div className="stat-number display-6 fw-bold">10K+</div>
                    <div className="stat-label">Students</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-lg-6">
              <div className="hero-visual d-flex justify-content-center">
                <div className="hero-cards">
                  <div className="hero-card bg-white bg-opacity-10 p-4 rounded-4 text-center text-white mb-3">
                    <div className="hero-card-icon">🚗</div>
                    <h5>Theory</h5>
                    <p className="small">Learn traffic rules</p>
                  </div>
                  <div className="hero-card bg-white bg-opacity-10 p-4 rounded-4 text-center text-white mb-3">
                    <div className="hero-card-icon">🅿️</div>
                    <h5>Parking</h5>
                    <p className="small">Master parking skills</p>
                  </div>
                  <div className="hero-card bg-white bg-opacity-10 p-4 rounded-4 text-center text-white mb-3">
                    <div className="hero-card-icon">🛣️</div>
                    <h5>Road Practice</h5>
                    <p className="small">Real road experience</p>
                  </div>
                  <div className="hero-card bg-white bg-opacity-10 p-4 rounded-4 text-center text-white">
                    <div className="hero-card-icon">📜</div>
                    <h5>Certificate</h5>
                    <p className="small">Get licensed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section py-5 bg-light">
        <div className="container">
          <div className="row">
            <div className="col-lg-12 text-center mb-5">
              <div className="section-badge">
                <span className="badge bg-primary px-3 py-2 mb-3">
                  ✨ {t.features}
                </span>
              </div>
              <h2 className="display-4 fw-bold mb-4">{t.features}</h2>
              <p className="lead text-muted">
                Discover what makes AutoKademia the preferred choice for driving education in Algeria
              </p>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-3 col-md-6">
              <div className="feature-card h-100 bg-white p-4 rounded-4 shadow-sm text-center">
                <div className="feature-icon mb-4">
                  <div className="icon-circle bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{width: '80px', height: '80px'}}>
                    <i className="fas fa-user-graduate fa-2x"></i>
                  </div>
                </div>
                <h4 className="fw-bold mb-3">{t.featureTitle1}</h4>
                <p className="text-muted">{t.featureDesc1}</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-6">
              <div className="feature-card h-100 bg-white p-4 rounded-4 shadow-sm text-center">
                <div className="feature-icon mb-4">
                  <div className="icon-circle bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{width: '80px', height: '80px'}}>
                    <i className="fas fa-book-open fa-2x"></i>
                  </div>
                </div>
                <h4 className="fw-bold mb-3">{t.featureTitle2}</h4>
                <p className="text-muted">{t.featureDesc2}</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-6">
              <div className="feature-card h-100 bg-white p-4 rounded-4 shadow-sm text-center">
                <div className="feature-icon mb-4">
                  <div className="icon-circle bg-warning text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{width: '80px', height: '80px'}}>
                    <i className="fas fa-calendar-alt fa-2x"></i>
                  </div>
                </div>
                <h4 className="fw-bold mb-3">{t.featureTitle3}</h4>
                <p className="text-muted">{t.featureDesc3}</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-6">
              <div className="feature-card h-100 bg-white p-4 rounded-4 shadow-sm text-center">
                <div className="feature-icon mb-4">
                  <div className="icon-circle bg-info text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{width: '80px', height: '80px'}}>
                    <i className="fas fa-car fa-2x"></i>
                  </div>
                </div>
                <h4 className="fw-bold mb-3">{t.featureTitle4}</h4>
                <p className="text-muted">{t.featureDesc4}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="reviews-section py-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-12 text-center mb-5">
              <div className="section-badge">
                <span className="badge bg-primary px-3 py-2 mb-3">
                  ⭐ {t.reviews}
                </span>
              </div>
              <h2 className="display-4 fw-bold mb-4">{t.reviews}</h2>
              <p className="lead text-muted">
                Hear from thousands of satisfied students across Algeria
              </p>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-4 col-md-6">
              <div className="review-card bg-white p-4 rounded-4 shadow-sm">
                <div className="review-stars mb-3">
                  <span className="text-warning">★★★★★</span>
                </div>
                <p className="review-text mb-4">
                  "AutoKademia made learning to drive so easy! The instructors were patient and professional. I passed my exam on the first try!"
                </p>
                <div className="reviewer d-flex align-items-center">
                  <div className="reviewer-avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '50px', height: '50px'}}>
                    A
                  </div>
                  <div>
                    <div className="reviewer-name fw-bold">Amina Benali</div>
                    <div className="reviewer-location text-muted small">Algiers</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div className="review-card bg-white p-4 rounded-4 shadow-sm">
                <div className="review-stars mb-3">
                  <span className="text-warning">★★★★★</span>
                </div>
                <p className="review-text mb-4">
                  "Excellent driving school! The online theory lessons were very helpful, and the practical sessions were well-structured."
                </p>
                <div className="reviewer d-flex align-items-center">
                  <div className="reviewer-avatar bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '50px', height: '50px'}}>
                    Y
                  </div>
                  <div>
                    <div className="reviewer-name fw-bold">Youssef Kadri</div>
                    <div className="reviewer-location text-muted small">Oran</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div className="review-card bg-white p-4 rounded-4 shadow-sm">
                <div className="review-stars mb-3">
                  <span className="text-warning">★★★★★</span>
                </div>
                <p className="review-text mb-4">
                  "I found the perfect driving school through AutoKademia. The platform is easy to use and the instructors are top-notch!"
                </p>
                <div className="reviewer d-flex align-items-center">
                  <div className="reviewer-avatar bg-warning text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '50px', height: '50px'}}>
                    S
                  </div>
                  <div>
                    <div className="reviewer-name fw-bold">Sara Meziane</div>
                    <div className="reviewer-location text-muted small">Constantine</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section py-5 bg-primary text-white">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h2 className="display-5 fw-bold mb-4">{t.contactUs}</h2>
              <p className="lead mb-4">{t.contactDesc}</p>
              
              <div className="contact-info">
                <div className="contact-item d-flex align-items-center mb-3">
                  <div className="contact-icon me-4">
                    <i className="fas fa-envelope fa-2x"></i>
                  </div>
                  <div>
                    <div className="contact-label fw-bold">Email</div>
                    <div className="contact-value">{t.contactEmail}</div>
                  </div>
                </div>

                <div className="contact-item d-flex align-items-center mb-3">
                  <div className="contact-icon me-4">
                    <i className="fas fa-phone fa-2x"></i>
                  </div>
                  <div>
                    <div className="contact-label fw-bold">Phone</div>
                    <div className="contact-value">{t.contactPhone}</div>
                  </div>
                </div>

                <div className="contact-item d-flex align-items-center mb-3">
                  <div className="contact-icon me-4">
                    <i className="fas fa-map-marker-alt fa-2x"></i>
                  </div>
                  <div>
                    <div className="contact-label fw-bold">Address</div>
                    <div className="contact-value">{t.contactAddress}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="contact-form bg-white text-dark p-5 rounded-4">
                <h4 className="fw-bold mb-4">Send us a message</h4>
                <form>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input type="text" className="form-control" placeholder="Your full name" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" placeholder="your@email.com" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Message</label>
                    <textarea className="form-control" rows="4" placeholder="How can we help you?"></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary w-100">
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  // Schools Page Component
  const renderSchoolsPage = () => (
    <div className="schools-page pt-5 mt-5">
      <div className="container">
        <div className="page-header text-center mb-5">
          <h1 className="display-4 fw-bold mb-3">Find Your Perfect Driving School</h1>
          <p className="lead text-muted">
            Discover certified driving schools across all 58 Algerian wilayas
          </p>
        </div>

        {/* Search and Filters */}
        <div className="search-filters-section mb-5">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              {/* Search Bar */}
              <div className="search-bar mb-4">
                <div className="input-group input-group-lg">
                  <span className="input-group-text">
                    <i className="fas fa-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t.searchPlaceholder}
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="filters-grid">
                <div className="row g-3">
                  <div className="col-lg-3 col-md-6">
                    <label className="form-label fw-bold">{t.filterByState}</label>
                    <select
                      className="form-select"
                      value={filters.state}
                      onChange={(e) => handleFilterChange('state', e.target.value)}
                    >
                      <option value="">{t.allStates}</option>
                      {states.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-lg-2 col-md-6">
                    <label className="form-label fw-bold">{t.minPrice}</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0"
                      value={filters.min_price}
                      onChange={(e) => handleFilterChange('min_price', e.target.value)}
                    />
                  </div>

                  <div className="col-lg-2 col-md-6">
                    <label className="form-label fw-bold">{t.maxPrice}</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="∞"
                      value={filters.max_price}
                      onChange={(e) => handleFilterChange('max_price', e.target.value)}
                    />
                  </div>

                  <div className="col-lg-2 col-md-6">
                    <label className="form-label fw-bold">{t.minRating}</label>
                    <select
                      className="form-select"
                      value={filters.min_rating}
                      onChange={(e) => handleFilterChange('min_rating', e.target.value)}
                    >
                      <option value="">Any</option>
                      <option value="1">1+ ⭐</option>
                      <option value="2">2+ ⭐</option>
                      <option value="3">3+ ⭐</option>
                      <option value="4">4+ ⭐</option>
                      <option value="5">5 ⭐</option>
                    </select>
                  </div>

                  <div className="col-lg-3 col-md-6">
                    <label className="form-label fw-bold">{t.sortBy}</label>
                    <select
                      className="form-select"
                      value={`${filters.sort_by}_${filters.sort_order}`}
                      onChange={(e) => {
                        const [sortBy, sortOrder] = e.target.value.split('_');
                        handleFilterChange('sort_by', sortBy);
                        handleFilterChange('sort_order', sortOrder);
                      }}
                    >
                      <option value="name_asc">Name A-Z</option>
                      <option value="name_desc">Name Z-A</option>
                      <option value="price_asc">Price Low-High</option>
                      <option value="price_desc">Price High-Low</option>
                      <option value="rating_desc">Rating High-Low</option>
                      <option value="newest_desc">Newest First</option>
                    </select>
                  </div>
                </div>

                <div className="row mt-3">
                  <div className="col-12 d-flex justify-content-end">
                    <button onClick={clearFilters} className="btn btn-outline-secondary">
                      <i className="fas fa-times me-2"></i>
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-section text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Finding the best driving schools for you...</p>
          </div>
        )}

        {/* Schools Grid */}
        {!loading && (
          <>
            <div className="schools-grid">
              <div className="row g-4">
                {drivingSchools.map((school) => (
                  <div key={school.id} className="col-lg-6 col-xl-4">
                    <div className="school-card h-100 card shadow-sm">
                      {school.photos && school.photos.length > 0 && (
                        <img 
                          src={school.photos[0]} 
                          className="card-img-top" 
                          alt={school.name}
                          style={{ height: '200px', objectFit: 'cover' }}
                        />
                      )}
                      
                      <div className="card-body d-flex flex-column">
                        <div className="school-header mb-3">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <h5 className="school-name fw-bold mb-2">{school.name}</h5>
                              <p className="school-location text-muted small mb-0">
                                <i className="fas fa-map-marker-alt me-1"></i>
                                {school.address}, {school.state}
                              </p>
                            </div>
                            <div className="school-price">
                              <span className="badge bg-primary fs-6">
                                {school.price.toLocaleString()} DA
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="school-rating mb-3">
                          <div className="d-flex align-items-center gap-2">
                            <div className="stars">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span 
                                  key={star} 
                                  className={`star ${star <= Math.floor(school.rating) ? 'text-warning' : 'text-muted'}`}
                                >
                                  {star <= Math.floor(school.rating) ? '★' : '☆'}
                                </span>
                              ))}
                            </div>
                            <span className="school-reviews">({school.total_reviews} reviews)</span>
                          </div>
                        </div>
                      
                        <p className="school-description flex-grow-1">
                          {school.description}
                        </p>
                      
                        <div className="school-actions mt-auto">
                          <div className="d-flex gap-2">
                            <button
                              onClick={() => handleEnroll(school.id)}
                              className="btn btn-primary flex-grow-1"
                            >
                              {t.enrollNow}
                            </button>
                            <button className="btn btn-outline-secondary">
                              {t.viewDetails}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <nav className="mt-5">
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${!pagination.has_prev ? 'disabled' : ''}`}>
                    <button
                      onClick={() => fetchDrivingSchools({ page: pagination.current_page - 1 })}
                      disabled={!pagination.has_prev}
                      className="page-link"
                    >
                      ← Previous
                    </button>
                  </li>
                  
                  {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <li key={page} className={`page-item ${pagination.current_page === page ? 'active' : ''}`}>
                        <button
                          onClick={() => fetchDrivingSchools({ page })}
                          className="page-link"
                        >
                          {page}
                        </button>
                      </li>
                    );
                  })}
                  
                  <li className={`page-item ${!pagination.has_next ? 'disabled' : ''}`}>
                    <button
                      onClick={() => fetchDrivingSchools({ page: pagination.current_page + 1 })}
                      disabled={!pagination.has_next}
                      className="page-link"
                    >
                      Next →
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}

        {drivingSchools.length === 0 && !loading && (
          <div className="no-results text-center py-5">
            <div className="no-results-icon mb-4">
              <i className="fas fa-school fa-4x text-muted"></i>
            </div>
            <h3 className="fw-bold mb-3">No driving schools found</h3>
            <p className="text-muted mb-4">Try adjusting your search criteria or filters</p>
            <button
              onClick={clearFilters}
              className="btn btn-primary"
            >
              Clear filters to see all schools
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Dashboard Component
  const renderDashboard = () => (
    <div className="dashboard-page pt-5 mt-5">
      <div className="container">
        <div className="dashboard-header mb-5">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="display-5 fw-bold mb-2">
                Welcome back, {user?.first_name}!
              </h1>
              <p className="lead text-muted">
                Your role: <span className="fw-bold text-capitalize text-primary">{user?.role}</span>
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
        
        {dashboardData ? (
          <div className="dashboard-content">
            <div className="row g-4">
              <div className="col-lg-8">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h3 className="card-title fw-bold mb-0">Your Enrollments</h3>
                  </div>
                  <div className="card-body">
                    {dashboardData.enrollments && dashboardData.enrollments.length > 0 ? (
                      <div className="enrollments-list">
                        {dashboardData.enrollments.map((enrollment) => (
                          <div key={enrollment.id} className="enrollment-card p-4 border rounded-3 mb-3">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div>
                                <h4 className="fw-bold mb-2">
                                  {enrollment.school_name}
                                </h4>
                                <p className="text-muted mb-0">
                                  <i className="fas fa-calendar-alt me-2"></i>
                                  Enrolled: {new Date(enrollment.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <span className={`badge fs-6 px-3 py-2 status-${enrollment.enrollment_status.replace('_', '-')}`}>
                                {enrollment.enrollment_status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            
                            {enrollment.enrollment_status === 'pending_documents' && (
                              <div className="alert alert-info">
                                <i className="fas fa-info-circle me-2"></i>
                                Please upload required documents for approval
                              </div>
                            )}
                            
                            {enrollment.enrollment_status === 'approved' && (
                              <div className="alert alert-success">
                                <i className="fas fa-check-circle me-2"></i>
                                Enrollment approved! You can start your courses.
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
                          onClick={() => {
                            setCurrentPage('schools');
                            fetchDrivingSchools();
                          }}
                          className="btn btn-primary"
                        >
                          <i className="fas fa-search me-2"></i>
                          Find Schools
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="col-lg-4">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h3 className="card-title fw-bold mb-0">Quick Actions</h3>
                  </div>
                  <div className="card-body">
                    <div className="quick-actions d-grid gap-3">
                      <button
                        onClick={() => {
                          setCurrentPage('schools');
                          fetchDrivingSchools();
                        }}
                        className="btn btn-primary btn-lg"
                      >
                        <i className="fas fa-search me-2"></i>
                        Find Driving Schools
                      </button>
                      
                      <button
                        onClick={() => setCurrentPage('home')}
                        className="btn btn-outline-secondary btn-lg"
                      >
                        <i className="fas fa-home me-2"></i>
                        Back to Home
                      </button>
                    </div>
                  </div>
                </div>

                {/* User Profile Card */}
                <div className="card shadow-sm mt-4">
                  <div className="card-header bg-white">
                    <h3 className="card-title fw-bold mb-0">Profile</h3>
                  </div>
                  <div className="card-body">
                    <div className="profile-info">
                      <div className="text-center mb-4">
                        <div className="profile-avatar bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{width: '80px', height: '80px', fontSize: '2rem'}}>
                          {user?.first_name?.charAt(0) || 'U'}
                        </div>
                      </div>
                      <div className="profile-details">
                        <div className="detail-item mb-3">
                          <label className="form-label fw-bold">Name</label>
                          <p className="mb-0">{user?.first_name} {user?.last_name}</p>
                        </div>
                        <div className="detail-item mb-3">
                          <label className="form-label fw-bold">Email</label>
                          <p className="mb-0">{user?.email}</p>
                        </div>
                        <div className="detail-item mb-3">
                          <label className="form-label fw-bold">Role</label>
                          <p className="mb-0 text-capitalize">{user?.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="loading-section text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading your dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );

  // Auth Modal Component
  const renderAuthModal = () => (
    showAuthModal && (
      <div 
        className="modal show d-block" 
        style={{backgroundColor: 'rgba(0, 0, 0, 0.75)'}}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {authMode === 'login' ? t.login : t.register}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowAuthModal(false)}
              ></button>
            </div>
            
            <div className="modal-body">
              {errorMessage && (
                <div className="alert alert-danger">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="alert alert-success">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleAuth}>
                <div className="mb-3">
                  <label className="form-label">{t.email}</label>
                  <input
                    type="email"
                    required
                    value={authData.email}
                    onChange={(e) => setAuthData(prev => ({ ...prev, email: e.target.value }))}
                    className="form-control"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    required
                    value={authData.password}
                    onChange={(e) => setAuthData(prev => ({ ...prev, password: e.target.value }))}
                    className="form-control"
                  />
                </div>

                {authMode === 'register' && (
                  <>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">First Name</label>
                        <input
                          type="text"
                          required
                          value={authData.first_name}
                          onChange={(e) => setAuthData(prev => ({ ...prev, first_name: e.target.value }))}
                          className="form-control"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Last Name</label>
                        <input
                          type="text"
                          required
                          value={authData.last_name}
                          onChange={(e) => setAuthData(prev => ({ ...prev, last_name: e.target.value }))}
                          className="form-control"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">{t.phone}</label>
                      <input
                        type="tel"
                        required
                        value={authData.phone}
                        onChange={(e) => setAuthData(prev => ({ ...prev, phone: e.target.value }))}
                        className="form-control"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">{t.address}</label>
                      <input
                        type="text"
                        required
                        value={authData.address}
                        onChange={(e) => setAuthData(prev => ({ ...prev, address: e.target.value }))}
                        className="form-control"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Date of Birth</label>
                      <input
                        type="date"
                        required
                        value={authData.date_of_birth}
                        onChange={(e) => setAuthData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                        className="form-control"
                      />
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Gender</label>
                        <select
                          value={authData.gender}
                          onChange={(e) => setAuthData(prev => ({ ...prev, gender: e.target.value }))}
                          className="form-select"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">{t.state}</label>
                        <select
                          required
                          value={authData.state}
                          onChange={(e) => setAuthData(prev => ({ ...prev, state: e.target.value }))}
                          className="form-select"
                        >
                          <option value="">Select Wilaya</option>
                          {states.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="btn btn-primary w-100 mt-4"
                >
                  {authLoading ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2"></div>
                      {authMode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    authMode === 'login' ? t.login : t.register
                  )}
                </button>
              </form>

              <div className="text-center mt-3">
                <button
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="btn btn-link text-decoration-none"
                >
                  {authMode === 'login' 
                    ? "Don't have an account? Register" 
                    : "Already have an account? Login"
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // Main render
  return (
    <div className="min-vh-100">
      {/* Global Messages */}
      {globalError && (
        <div className="position-fixed top-0 end-0 m-3" style={{zIndex: 9999}}>
          <div className="alert alert-danger" style={{maxWidth: '400px'}}>
            {globalError}
            <button
              onClick={() => setGlobalError('')}
              className="btn-close ms-auto"
            ></button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="position-fixed top-0 end-0 m-3" style={{zIndex: 9999}}>
          <div className="alert alert-success" style={{maxWidth: '400px'}}>
            {successMessage}
            <button
              onClick={() => setSuccessMessage('')}
              className="btn-close ms-auto"
            ></button>
          </div>
        </div>
      )}

      {/* Navigation */}
      {renderNavigation()}

      {/* Main Content */}
      <main>
        {currentPage === 'home' && renderHomePage()}
        {currentPage === 'schools' && renderSchoolsPage()}
        {currentPage === 'dashboard' && renderDashboard()}
      </main>

      {/* Modals */}
      {renderAuthModal()}
      
      {/* Offline Quiz Modal */}
      {showOfflineQuiz && (
        <OfflineQuiz onClose={() => setShowOfflineQuiz(false)} />
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}

export default App;