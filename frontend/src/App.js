import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import NewManagerDashboard from './NewManagerDashboard';
import TeacherDashboard from './TeacherDashboard';
import StudentDashboard from './StudentDashboard';
import DocumentUpload from './components/DocumentUpload';

// Get backend URL from environment
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  // State management
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [language, setLanguage] = useState('en');
  const [drivingSchools, setDrivingSchools] = useState([]);
  const [states, setStates] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [documentUploadModal, setDocumentUploadModal] = useState(false);
  const [uploadDocumentType, setUploadDocumentType] = useState('');
  const [userDocuments, setUserDocuments] = useState([]);
  const [showSchoolRegistrationModal, setShowSchoolRegistrationModal] = useState(false);
  const [showSchoolPhotoModal, setShowSchoolPhotoModal] = useState(false);
  const [schoolPhotoType, setSchoolPhotoType] = useState('logo');
  const [userSchool, setUserSchool] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    has_next: false,
    has_prev: false,
    items_per_page: 20
  });

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    state: '',
    min_price: '',
    max_price: '',
    min_rating: '',
    sort_by: 'name',
    sort_order: 'asc',
    page: 1,
    limit: 20
  });

  // Auth form data
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: 'male',
    state: '',
    profile_photo: null
  });

  // Driving school registration data
  const [schoolData, setSchoolData] = useState({
    name: '',
    address: '',
    state: '',
    phone: '',
    email: '',
    description: '',
    price: '',
    latitude: '',
    longitude: ''
  });

  // Translations
  const translations = {
    en: {
      home: "Home",
      schools: "Schools",
      login: "Login",
      register: "Register",
      logout: "Logout",
      dashboard: "Dashboard",
      findSchools: "Find Driving Schools",
      selectState: "Select State",
      searchPlaceholder: "Search schools...",
      enrollNow: "Enroll Now",
      viewDetails: "View Details",
      email: "Email",
      password: "Password",
      firstName: "First Name",
      lastName: "Last Name",
      phone: "Phone",
      address: "Address",
      dateOfBirth: "Date of Birth",
      gender: "Gender",
      state: "State",
      heroTitle: "Master the Road with AutoKademia",
      heroSubtitle: "Algeria's Premier Driving School Platform",
      heroDescription: "Connect with certified driving schools across all 58 wilayas. Learn theory, practice parking, master road skills, and earn your license with confidence.",
      getStarted: "Get Started",
      features: "Features",
      reviews: "Reviews",
      contactUs: "Contact Us",
      contactDesc: "Ready to start your driving journey? Get in touch with us today!",
      contactEmail: "info@autokademia.dz",
      contactPhone: "+213 (0) 21 123 456",
      contactAddress: "Algiers, Algeria",
      featureTitle1: "Expert Instructors",
      featureDesc1: "Learn from certified driving instructors with years of experience",
      featureTitle2: "Comprehensive Curriculum",
      featureDesc2: "Theory, parking, and road practice - everything you need to succeed",
      featureTitle3: "Flexible Scheduling",
      featureDesc3: "Book sessions that fit your schedule with our easy booking system",
      featureTitle4: "Modern Vehicles",
      featureDesc4: "Practice with well-maintained, modern vehicles equipped with safety features",
      filterByState: "Filter by State",
      allStates: "All States",
      minPrice: "Min Price",
      maxPrice: "Max Price",
      minRating: "Min Rating",
      sortBy: "Sort By",
      uploadDocuments: "Upload Documents",
      profilePhoto: "Profile Photo",
      idCard: "ID Card",
      medicalCertificate: "Medical Certificate",
      residenceCertificate: "Residence Certificate",
      upload: "Upload",
      cancel: "Cancel",
      documentUploaded: "Document uploaded successfully!",
      documentsRequired: "Documents Required",
      documentsStatus: "Documents Status",
      verified: "Verified",
      pending: "Pending Verification",
      uploadFile: "Upload File",
      registerSchool: "Register Your Driving School",
      schoolName: "School Name",
      schoolDescription: "Description",
      schoolPrice: "Course Price (DA)",
      latitude: "Latitude (Optional)",
      longitude: "Longitude (Optional)",
      registerSchoolBtn: "Register School",
      uploadSchoolPhotos: "Upload School Photos",
      uploadLogo: "Upload Logo",
      uploadPhoto: "Upload Photo",
      becomePartner: "Become a Partner",
      partnerTitle: "Start Your Own Driving School",
      partnerSubtitle: "Join Algeria's leading driving education platform",
      partnerDesc: "Register your driving school and connect with students across your wilaya. Manage enrollments, track progress, and grow your business with our comprehensive platform."
    },
    ar: {
      home: "الرئيسية",
      schools: "المدارس",
      login: "تسجيل الدخول",
      register: "إنشاء حساب",
      logout: "تسجيل الخروج",
      dashboard: "لوحة التحكم",
      findSchools: "البحث عن مدارس القيادة",
      selectState: "اختر الولاية",
      searchPlaceholder: "ابحث عن المدارس...",
      enrollNow: "سجل الآن",
      viewDetails: "عرض التفاصيل",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      phone: "الهاتف",
      address: "العنوان",
      dateOfBirth: "تاريخ الميلاد",
      gender: "الجنس",
      state: "الولاية",
      heroTitle: "اتقن الطريق مع أوتو أكاديميا",
      heroSubtitle: "منصة مدارس القيادة الرائدة في الجزائر",
      heroDescription: "اتصل بمدارس القيادة المعتمدة في جميع الولايات الـ 58. تعلم النظرية، ومارس الركن، وأتقن مهارات الطريق، واحصل على رخصتك بثقة.",
      getStarted: "ابدأ الآن",
      uploadDocuments: "رفع المستندات",
      profilePhoto: "صورة الملف الشخصي",
      idCard: "بطاقة الهوية",
      medicalCertificate: "الشهادة الطبية",
      residenceCertificate: "شهادة الإقامة",
      upload: "رفع",
      cancel: "إلغاء",
      documentUploaded: "تم رفع المستند بنجاح!",
      documentsRequired: "المستندات المطلوبة",
      documentsStatus: "حالة المستندات",
      verified: "مُحقق",
      pending: "في انتظار التحقق",
      uploadFile: "رفع الملف",
      registerSchool: "سجل مدرسة القيادة",
      schoolName: "اسم المدرسة",
      schoolDescription: "الوصف",
      schoolPrice: "سعر الدورة (دج)",
      registerSchoolBtn: "سجل المدرسة",
      becomePartner: "كن شريكاً",
      partnerTitle: "ابدأ مدرسة القيادة الخاصة بك",
      partnerSubtitle: "انضم إلى منصة التعليم الرائدة في الجزائر",
      partnerDesc: "سجل مدرسة القيادة الخاصة بك واتصل مع الطلاب في ولايتك. إدارة التسجيلات، وتتبع التقدم، وتنمية عملك مع منصتنا الشاملة."
    },
    fr: {
      home: "Accueil",
      schools: "Écoles",
      login: "Connexion",
      register: "S'inscrire",
      logout: "Déconnexion",
      dashboard: "Tableau de bord",
      findSchools: "Trouver des auto-écoles",
      selectState: "Sélectionner l'état",
      searchPlaceholder: "Rechercher des écoles...",
      enrollNow: "S'inscrire maintenant",
      viewDetails: "Voir les détails",
      email: "Email",
      password: "Mot de passe",
      firstName: "Prénom",
      lastName: "Nom de famille",
      phone: "Téléphone",
      address: "Adresse",
      dateOfBirth: "Date de naissance",
      gender: "Genre",
      state: "État",
      heroTitle: "Maîtrisez la route avec AutoKademia",
      heroSubtitle: "La plateforme d'auto-école de premier plan en Algérie",
      heroDescription: "Connectez-vous avec des auto-écoles certifiées dans les 58 wilayas. Apprenez la théorie, pratiquez le stationnement, maîtrisez les compétences routières et obtenez votre permis en toute confiance.",
      getStarted: "Commencer",
      uploadDocuments: "Télécharger les documents",
      profilePhoto: "Photo de profil",
      idCard: "Carte d'identité",
      medicalCertificate: "Certificat médical",
      residenceCertificate: "Certificat de résidence",
      upload: "Télécharger",
      cancel: "Annuler",
      documentUploaded: "Document téléchargé avec succès!",
      documentsRequired: "Documents requis",
      documentsStatus: "Statut des documents",
      verified: "Vérifié",
      pending: "En attente de vérification",
      uploadFile: "Télécharger le fichier",
      registerSchool: "Enregistrer votre auto-école",
      schoolName: "Nom de l'école",
      schoolDescription: "Description",
      schoolPrice: "Prix du cours (DA)",
      registerSchoolBtn: "Enregistrer l'école",
      becomePartner: "Devenir partenaire",
      partnerTitle: "Créez votre propre auto-école",
      partnerSubtitle: "Rejoignez la plateforme d'éducation routière leader en Algérie",
      partnerDesc: "Enregistrez votre auto-école et connectez-vous avec les étudiants de votre wilaya. Gérez les inscriptions, suivez les progrès et développez votre entreprise avec notre plateforme complète."
    }
  };

  const t = translations[language];

  // Initialize app
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      setCurrentPage('dashboard'); // Redirect to dashboard if logged in
    }
    
    fetchStates();
  }, []);

  // Fetch states
  const fetchStates = async () => {
    try {
      const response = await api.get('/api/states');
      setStates(response.data.states);
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Fetching dashboard data...');
      const response = await api.get('/api/dashboard');
      console.log('Dashboard data response:', response.data);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        // Token might be invalid, logout user
        console.log('Authentication failed, logging out user');
        handleLogout();
      } else {
        setErrorMessage('Failed to load dashboard data: ' + (error.response?.data?.detail || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch user documents
  const fetchUserDocuments = async () => {
    try {
      const response = await api.get('/api/documents');
      setUserDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  // Fetch user's driving school (for managers)
  const fetchUserSchool = async () => {
    try {
      if (user && user.role === 'manager') {
        const response = await api.get('/api/driving-schools');
        const userSchoolData = response.data.schools.find(school => school.manager_id === user.id);
        setUserSchool(userSchoolData);
      }
    } catch (error) {
      console.error('Error fetching user school:', error);
    }
  };

  // Fetch manager-specific data (teachers, quizzes, etc.)
  const fetchManagerData = async () => {
    try {
      if (user && user.role === 'manager') {
        // Fetch teachers
        await fetchUserSchool();
        // Additional manager-specific data fetching can be added here
      }
    } catch (error) {
      console.error('Error fetching manager data:', error);
    }
  };

  // Fetch driving schools
  const fetchDrivingSchools = async (customFilters = {}) => {
    try {
      setLoading(true);
      const queryParams = { ...filters, ...customFilters };
      
      // Fix float parsing error by removing empty string values for numeric fields
      const cleanedParams = {};
      Object.keys(queryParams).forEach(key => {
        const value = queryParams[key];
        if (value !== '' && value !== null && value !== undefined) {
          // Convert numeric strings to numbers for price and rating fields
          if ((key === 'min_price' || key === 'max_price' || key === 'min_rating') && typeof value === 'string' && value.trim() !== '') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              cleanedParams[key] = numValue;
            }
          } else {
            cleanedParams[key] = value;
          }
        }
      });
      
      console.log('Fetching driving schools with params:', cleanedParams);
      
      const response = await api.get('/api/driving-schools', { params: cleanedParams });
      console.log('Driving schools response:', response.data);
      setDrivingSchools(response.data.schools || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error('Error fetching driving schools:', error);
      let errorMessage = 'Failed to load driving schools';
      
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage += ': ' + error.response.data.detail;
        } else {
          errorMessage += ': ' + JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle authentication
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      
      // Add form fields
      Object.keys(authData).forEach(key => {
        if (key === 'profile_photo' && authData[key]) {
          formData.append(key, authData[key]);
        } else if (key !== 'profile_photo') {
          formData.append(key, authData[key]);
        }
      });

      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      console.log('Authentication attempt:', { mode: authMode, endpoint });
      
      const response = await api.post(endpoint, 
        authMode === 'login' ? 
          { email: authData.email, password: authData.password } : 
          formData,
        authMode === 'login' ? 
          { headers: { 'Content-Type': 'application/json' } } :
          { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      console.log('Authentication response:', response.data);

      if (response.data.user && response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('userData', JSON.stringify(response.data.user));
        setUser(response.data.user);
        setShowAuthModal(false);
        setCurrentPage('dashboard'); // Redirect to dashboard after login
        setSuccessMessage(response.data.message);
        
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
          state: '',
          profile_photo: null
        });
        
        console.log('Authentication successful, user set:', response.data.user);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      const errorMessage = formatErrorMessage(error, 'Authentication failed');
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setUser(null);
    setCurrentPage('home');
    setDashboardData(null);
    setUserSchool(null);
  };

  // Handle enrollment
  const handleEnroll = async (schoolId) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/enroll', { school_id: schoolId });
      setSuccessMessage('Enrollment successful! Please upload required documents.');
      setCurrentPage('dashboard');
      fetchDashboardData();
    } catch (error) {
      const errorMessage = formatErrorMessage(error, 'Enrollment failed');
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format error messages
  const formatErrorMessage = (error, defaultMessage = 'An error occurred') => {
    if (!error.response?.data?.detail) {
      return defaultMessage;
    }
    
    const detail = error.response.data.detail;
    
    // If detail is an array of validation errors (FastAPI validation errors)
    if (Array.isArray(detail)) {
      return detail.map(err => {
        if (err.msg && err.loc) {
          const field = err.loc[err.loc.length - 1]; // Get the field name
          return `${field}: ${err.msg}`;
        }
        return err.msg || 'Validation error';
      }).join(', ');
    }
    
    // If detail is a string
    if (typeof detail === 'string') {
      return detail;
    }
    
    // If detail is an object, try to extract meaningful message
    if (typeof detail === 'object' && detail.msg) {
      return detail.msg;
    }
    
    return defaultMessage;
  };

  // Handle driving school registration
  const handleSchoolRegistration = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await api.post('/api/driving-schools', schoolData);
      setSuccessMessage('Driving school registered successfully! You can now upload photos.');
      setShowSchoolRegistrationModal(false);
      
      // Update user data to reflect manager role
      const updatedUser = { ...user, role: 'manager' };
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      
      setCurrentPage('dashboard');
      fetchDashboardData();
      fetchUserSchool();
      
      // Reset form
      setSchoolData({
        name: '',
        address: '',
        state: '',
        phone: '',
        email: '',
        description: '',
        price: '',
        latitude: '',
        longitude: ''
      });
    } catch (error) {
      const errorMessage = formatErrorMessage(error);
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle school photo upload
  const handleSchoolPhotoUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      setLoading(true);
      const response = await api.post(`/api/driving-schools/${userSchool.id}/upload-photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSuccessMessage('Photo uploaded successfully!');
      setShowSchoolPhotoModal(false);
      fetchUserSchool();
    } catch (error) {
      const errorMessage = formatErrorMessage(error, 'Photo upload failed');
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle document upload success
  const handleDocumentUploadSuccess = async (uploadData, documentType) => {
    setSuccessMessage(`${documentType.replace('_', ' ')} uploaded successfully!`);
    await fetchUserDocuments();
    await fetchDashboardData();
  };

  // Handle document upload cancel
  const handleDocumentUploadCancel = () => {
    setDocumentUploadModal(false);
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      state: '',
      min_price: '',
      max_price: '',
      min_rating: '',
      sort_by: 'name',
      sort_order: 'asc',
      page: 1,
      limit: 20
    });
  };

  // Apply filters
  useEffect(() => {
    if (currentPage === 'schools') {
      fetchDrivingSchools();
    }
  }, [filters, currentPage]);

  // Load dashboard data when page changes
  useEffect(() => {
    if (currentPage === 'dashboard' && user) {
      fetchDashboardData();
      fetchUserDocuments();
      fetchManagerData(); // This will fetch manager-specific data including user school
    }
  }, [currentPage, user]);

  // Fetch manager data when user role changes to manager
  useEffect(() => {
    if (user && user.role === 'manager') {
      fetchManagerData();
    }
  }, [user?.role]);

  // Navigation Component
  const renderNavigation = () => (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
      <div className="container">
        <a className="navbar-brand" href="#" onClick={() => setCurrentPage(user ? 'dashboard' : 'home')}>
          <div className="brand-logo-container d-flex align-items-center">
            <div className="brand-logo me-2">
              <svg width="40" height="40" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 10L180 50V150L100 190L20 150V50L100 10Z" fill="#1e3a8a" stroke="#ffffff" strokeWidth="4"/>
                <path d="M100 25L165 60V140L100 175L35 140V60L100 25Z" fill="#0f172a"/>
                <rect x="70" y="45" width="60" height="35" rx="5" fill="#ffffff"/>
                <ellipse cx="75" cy="55" rx="4" ry="6" fill="#0f172a"/>
                <ellipse cx="125" cy="55" rx="4" ry="6" fill="#0f172a"/>
                <rect x="85" y="50" width="30" height="8" fill="#0f172a"/>
                <path d="M50 90Q100 110 150 90" stroke="#ffffff" strokeWidth="8" fill="none"/>
                <rect x="95" y="95" width="10" height="15" fill="#ffffff"/>
                <rect x="95" y="115" width="10" height="15" fill="#ffffff"/>
                <rect x="95" y="135" width="10" height="15" fill="#ffffff"/>
              </svg>
            </div>
            <div className="brand-text">
              <div className="brand-name">AutoKademia</div>
              <div className="brand-tagline">Drive with Confidence</div>
            </div>
          </div>
        </a>
        
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            {!user && (
              <li className="nav-item">
                <a className={`nav-link ${currentPage === 'home' ? 'active' : ''}`} 
                   href="#" onClick={() => setCurrentPage('home')}>
                  {t.home}
                </a>
              </li>
            )}
            
            {user && (
              <li className="nav-item">
                <a className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`} 
                   href="#" onClick={() => setCurrentPage('dashboard')}>
                  {t.dashboard}
                </a>
              </li>
            )}
            
            <li className="nav-item">
              <a className={`nav-link ${currentPage === 'schools' ? 'active' : ''}`} 
                 href="#" onClick={() => setCurrentPage('schools')}>
                {t.schools}
              </a>
            </li>
          </ul>
          
          <div className="navbar-nav">
            {/* Language Selector */}
            <div className="nav-item dropdown">
              <a className="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
                {language === 'ar' ? '🇩🇿 ع' : language === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
              </a>
              <ul className="dropdown-menu">
                <li><a className="dropdown-item" href="#" onClick={() => setLanguage('en')}>🇬🇧 English</a></li>
                <li><a className="dropdown-item" href="#" onClick={() => setLanguage('ar')}>🇩🇿 العربية</a></li>
                <li><a className="dropdown-item" href="#" onClick={() => setLanguage('fr')}>🇫🇷 Français</a></li>
              </ul>
            </div>
            
            {user ? (
              <div className="nav-item dropdown">
                <a className="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
                  {user.first_name} {user.last_name}
                </a>
                <ul className="dropdown-menu">
                  <li><a className="dropdown-item" href="#" onClick={() => setCurrentPage('dashboard')}>{t.dashboard}</a></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><a className="dropdown-item" href="#" onClick={handleLogout}>{t.logout}</a></li>
                </ul>
              </div>
            ) : (
              <>
                <a className="nav-link" href="#" onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}>
                  {t.login}
                </a>
                <a className="nav-link" href="#" onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}>
                  {t.register}
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  // Home Page Component - now only shows when user is not logged in
  const renderHomePage = () => (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg">
          <div className="container">
            <div className="row align-items-center min-vh-100">
              <div className="col-lg-6">
                <div className="hero-content">
                  <div className="hero-badge">
                    <span className="badge bg-light text-primary px-3 py-2 mb-4">
                      🇩🇿 Made for Algeria
                    </span>
                  </div>
                  <h1 className="hero-title display-2 fw-bold mb-4">
                    {t.heroTitle}
                  </h1>
                  <p className="hero-subtitle h4 mb-4 text-white-50">
                    {t.heroSubtitle}
                  </p>
                  <p className="hero-description lead mb-5">
                    {t.heroDescription}
                  </p>
                  <div className="hero-actions">
                    <button
                      onClick={() => setCurrentPage('schools')}
                      className="btn btn-light btn-lg me-3 px-4 py-3"
                    >
                      <i className="fas fa-search me-2"></i>
                      {t.getStarted}
                    </button>
                    <button
                      onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
                      className="btn btn-outline-light btn-lg px-4 py-3"
                    >
                      <i className="fas fa-user-plus me-2"></i>
                      {t.register}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="col-lg-6">
                <div className="hero-cards">
                  <div className="hero-card bg-white bg-opacity-10 p-4 rounded-4 text-center text-white mb-3">
                    <div className="hero-card-icon">📚</div>
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

      {/* Partner Section - NEW */}
      <section className="partner-section py-5 bg-gradient-primary">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="partner-content text-white">
                <div className="partner-badge">
                  <span className="badge bg-light text-primary px-3 py-2 mb-4">
                    🤝 {t.becomePartner}
                  </span>
                </div>
                <h2 className="display-4 fw-bold mb-4">
                  {t.partnerTitle}
                </h2>
                <p className="lead mb-4">
                  {t.partnerSubtitle}
                </p>
                <p className="mb-5">
                  {t.partnerDesc}
                </p>
                <button
                  onClick={() => {
                    if (user) {
                      setShowSchoolRegistrationModal(true);
                    } else {
                      setAuthMode('register');
                      setShowAuthModal(true);
                    }
                  }}
                  className="btn btn-light btn-lg px-4 py-3"
                >
                  <i className="fas fa-school me-2"></i>
                  {t.registerSchool}
                </button>
              </div>
            </div>
            
            <div className="col-lg-6">
              <div className="partner-stats bg-white bg-opacity-10 p-5 rounded-4">
                <div className="row text-center text-white">
                  <div className="col-4">
                    <div className="stat-item">
                      <h3 className="display-5 fw-bold">58</h3>
                      <p className="mb-0">Wilayas</p>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="stat-item">
                      <h3 className="display-5 fw-bold">1000+</h3>
                      <p className="mb-0">Students</p>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="stat-item">
                      <h3 className="display-5 fw-bold">50+</h3>
                      <p className="mb-0">Schools</p>
                    </div>
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
                                {school.price ? school.price.toLocaleString() : 'N/A'} DA
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
                                  className={`star ${star <= Math.floor(school.rating || 0) ? 'text-warning' : 'text-muted'}`}
                                >
                                  {star <= Math.floor(school.rating || 0) ? '★' : '☆'}
                                </span>
                              ))}
                            </div>
                            <span className="school-reviews">({school.total_reviews || 0} reviews)</span>
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

  // Dashboard Component - This replaces the home page when user is logged in
  const renderDashboard = () => {
    const token = localStorage.getItem('token');
    
    // If user is a manager, render the new enhanced ManagerDashboard with 4-button approval system
    if (user?.role === 'manager') {
      return <NewManagerDashboard user={user} token={token} />;
    }
    
    // If user is a teacher, render the dedicated TeacherDashboard
    if (user?.role === 'teacher') {
      return <TeacherDashboard user={user} token={token} />;
    }
    
    // If user is a student, render the enhanced StudentDashboard
    if (user?.role === 'student') {
      return <StudentDashboard user={user} token={token} />;
    }
    
    // Original dashboard for other roles (student, guest)
    return (
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
                {/* Guest Actions */}
                {user?.role === 'guest' && (
                  <div className="card shadow-sm mb-4">
                    <div className="card-header bg-white">
                      <h3 className="card-title fw-bold mb-0">Get Started</h3>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <div className="action-card h-100 text-center p-4 border rounded-3">
                            <i className="fas fa-graduation-cap fa-3x text-primary mb-3"></i>
                            <h5 className="fw-bold mb-3">Find a Driving School</h5>
                            <p className="text-muted mb-4">Browse and enroll in driving schools near you</p>
                            <button
                              onClick={() => {
                                setCurrentPage('schools');
                                fetchDrivingSchools();
                              }}
                              className="btn btn-primary"
                            >
                              Browse Schools
                            </button>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="action-card h-100 text-center p-4 border rounded-3">
                            <i className="fas fa-school fa-3x text-success mb-3"></i>
                            <h5 className="fw-bold mb-3">Register Your School</h5>
                            <p className="text-muted mb-4">Start your own driving school and teach students</p>
                            <button
                              onClick={() => setShowSchoolRegistrationModal(true)}
                              className="btn btn-success"
                            >
                              {t.registerSchool}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manager School Management */}
                {user?.role === 'manager' && userSchool && (
                  <div className="card shadow-sm mb-4">
                    <div className="card-header bg-white">
                      <h3 className="card-title fw-bold mb-0">Your Driving School</h3>
                    </div>
                    <div className="card-body">
                      <div className="school-info mb-4">
                        <div className="row">
                          <div className="col-md-8">
                            <h4 className="fw-bold">{userSchool.name}</h4>
                            <p className="text-muted mb-2">
                              <i className="fas fa-map-marker-alt me-2"></i>
                              {userSchool.address}, {userSchool.state}
                            </p>
                            <p className="text-muted mb-2">
                              <i className="fas fa-phone me-2"></i>
                              {userSchool.phone}
                            </p>
                            <p className="text-muted mb-0">
                              <i className="fas fa-star me-2"></i>
                              {userSchool.rating || 0}/5 ({userSchool.total_reviews || 0} reviews)
                            </p>
                          </div>
                          <div className="col-md-4 text-center">
                            {userSchool.logo_url ? (
                              <img 
                                src={userSchool.logo_url} 
                                alt="School Logo" 
                                className="img-fluid rounded"
                                style={{ maxHeight: '100px' }}
                              />
                            ) : (
                              <div className="logo-placeholder bg-light p-4 rounded">
                                <i className="fas fa-school fa-3x text-muted"></i>
                                <p className="small text-muted mt-2 mb-0">No logo uploaded</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="school-actions">
                        <div className="row g-2">
                          <div className="col-md-4">
                            <button 
                              onClick={() => {
                                setSchoolPhotoType('logo');
                                setShowSchoolPhotoModal(true);
                              }}
                              className="btn btn-outline-primary w-100"
                            >
                              <i className="fas fa-image me-2"></i>
                              {t.uploadLogo}
                            </button>
                          </div>
                          <div className="col-md-4">
                            <button 
                              onClick={() => {
                                setSchoolPhotoType('photo');
                                setShowSchoolPhotoModal(true);
                              }}
                              className="btn btn-outline-success w-100"
                            >
                              <i className="fas fa-camera me-2"></i>
                              {t.uploadPhoto}
                            </button>
                          </div>
                          <div className="col-md-4">
                            <button className="btn btn-outline-info w-100">
                              <i className="fas fa-users me-2"></i>
                              Manage Enrollments
                            </button>
                          </div>
                        </div>
                      </div>

                      {userSchool.photos && userSchool.photos.length > 0 && (
                        <div className="school-photos mt-4">
                          <h6 className="fw-bold mb-3">School Photos</h6>
                          <div className="row g-2">
                            {userSchool.photos.map((photo, index) => (
                              <div key={index} className="col-md-3">
                                <img 
                                  src={photo} 
                                  alt={`School photo ${index + 1}`}
                                  className="img-fluid rounded"
                                  style={{ height: '120px', objectFit: 'cover', width: '100%' }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                              <span className={`badge fs-6 px-3 py-2 status-${enrollment.enrollment_status?.replace('_', '-')}`}>
                                {enrollment.enrollment_status?.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            
                            {enrollment.enrollment_status === 'pending_documents' && (
                              <div className="alert alert-info">
                                <i className="fas fa-info-circle me-2"></i>
                                Please upload required documents for approval
                                <button 
                                  onClick={() => setDocumentUploadModal(true)} 
                                  className="btn btn-sm btn-primary ms-2"
                                >
                                  {t.uploadDocuments}
                                </button>
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

                {/* Documents Status Section */}
                <div className="card shadow-sm mt-4">
                  <div className="card-header bg-white">
                    <h3 className="card-title fw-bold mb-0">{t.documentsStatus}</h3>
                  </div>
                  <div className="card-body">
                    {userDocuments.required_documents && (
                      <div className="documents-grid">
                        {userDocuments.required_documents.map((docType) => {
                          const uploaded = userDocuments.documents?.find(doc => doc.document_type === docType);
                          return (
                            <div key={docType} className="document-item d-flex justify-content-between align-items-center p-3 border rounded-3 mb-3">
                              <div className="d-flex align-items-center">
                                <div className="document-icon me-3">
                                  {docType === 'profile_photo' && <i className="fas fa-user-circle fa-2x text-info"></i>}
                                  {docType === 'id_card' && <i className="fas fa-id-card fa-2x text-primary"></i>}
                                  {docType === 'medical_certificate' && <i className="fas fa-notes-medical fa-2x text-success"></i>}
                                  {docType === 'residence_certificate' && <i className="fas fa-home fa-2x text-warning"></i>}
                                </div>
                                <div>
                                  <h5 className="mb-1">{t[docType] || docType.replace('_', ' ').toUpperCase()}</h5>
                                  <p className="text-muted mb-0 small">
                                    {uploaded ? (
                                      uploaded.is_verified ? (
                                        <span className="text-success">
                                          <i className="fas fa-check-circle me-1"></i>
                                          {t.verified}
                                        </span>
                                      ) : (
                                        <span className="text-warning">
                                          <i className="fas fa-clock me-1"></i>
                                          {t.pending}
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-danger">
                                        <i className="fas fa-times-circle me-1"></i>
                                        Not uploaded
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div>
                                {!uploaded ? (
                                  <button 
                                    onClick={() => {
                                      setUploadDocumentType(docType);
                                      setDocumentUploadModal(true);
                                    }}
                                    className="btn btn-outline-primary btn-sm"
                                  >
                                    {t.uploadFile}
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => window.open(uploaded.file_url, '_blank')}
                                    className="btn btn-outline-secondary btn-sm"
                                  >
                                    View
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
                      {user?.role === 'guest' && (
                        <>
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
                            onClick={() => setShowSchoolRegistrationModal(true)}
                            className="btn btn-success btn-lg"
                          >
                            <i className="fas fa-school me-2"></i>
                            {t.registerSchool}
                          </button>
                        </>
                      )}

                      {user?.role === 'student' && (
                        <>
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
                            onClick={() => setDocumentUploadModal(true)}
                            className="btn btn-success btn-lg"
                          >
                            <i className="fas fa-upload me-2"></i>
                            {t.uploadDocuments}
                          </button>
                        </>
                      )}

                      {user?.role === 'manager' && (
                        <>
                          <button
                            onClick={() => {
                              setSchoolPhotoType('logo');
                              setShowSchoolPhotoModal(true);
                            }}
                            className="btn btn-primary btn-lg"
                          >
                            <i className="fas fa-image me-2"></i>
                            {t.uploadSchoolPhotos}
                          </button>
                          
                          <button className="btn btn-success btn-lg">
                            <i className="fas fa-users me-2"></i>
                            Manage Students
                          </button>
                        </>
                      )}
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
  };

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
                          <option value="">{t.selectState}</option>
                          {states.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">{t.profilePhoto} (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setAuthData(prev => ({ ...prev, profile_photo: e.target.files[0] }))}
                        className="form-control"
                      />
                    </div>
                  </>
                )}

                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Loading...
                      </>
                    ) : (
                      authMode === 'login' ? t.login : t.register
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="btn btn-link"
                  >
                    {authMode === 'login' ? 
                      `Don't have an account? ${t.register}` : 
                      `Already have an account? ${t.login}`
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // School Registration Modal
  const renderSchoolRegistrationModal = () => (
    showSchoolRegistrationModal && (
      <div 
        className="modal show d-block" 
        style={{backgroundColor: 'rgba(0, 0, 0, 0.75)'}}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{t.registerSchool}</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowSchoolRegistrationModal(false)}
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

              <form onSubmit={handleSchoolRegistration}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">{t.schoolName}</label>
                    <input
                      type="text"
                      required
                      value={schoolData.name}
                      onChange={(e) => setSchoolData(prev => ({ ...prev, name: e.target.value }))}
                      className="form-control"
                      placeholder="Enter school name"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t.state}</label>
                    <select
                      required
                      value={schoolData.state}
                      onChange={(e) => setSchoolData(prev => ({ ...prev, state: e.target.value }))}
                      className="form-select"
                    >
                      <option value="">{t.selectState}</option>
                      {states.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">{t.address}</label>
                  <input
                    type="text"
                    required
                    value={schoolData.address}
                    onChange={(e) => setSchoolData(prev => ({ ...prev, address: e.target.value }))}
                    className="form-control"
                    placeholder="Enter school address"
                  />
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">{t.phone}</label>
                    <input
                      type="tel"
                      required
                      value={schoolData.phone}
                      onChange={(e) => setSchoolData(prev => ({ ...prev, phone: e.target.value }))}
                      className="form-control"
                      placeholder="School phone number"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t.email}</label>
                    <input
                      type="email"
                      required
                      value={schoolData.email}
                      onChange={(e) => setSchoolData(prev => ({ ...prev, email: e.target.value }))}
                      className="form-control"
                      placeholder="School email"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">{t.schoolDescription}</label>
                  <textarea
                    required
                    value={schoolData.description}
                    onChange={(e) => setSchoolData(prev => ({ ...prev, description: e.target.value }))}
                    className="form-control"
                    rows="3"
                    placeholder="Describe your driving school..."
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">{t.schoolPrice}</label>
                  <input
                    type="number"
                    required
                    value={schoolData.price}
                    onChange={(e) => setSchoolData(prev => ({ ...prev, price: e.target.value }))}
                    className="form-control"
                    placeholder="Course price in DA"
                  />
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">{t.latitude}</label>
                    <input
                      type="number"
                      step="any"
                      value={schoolData.latitude}
                      onChange={(e) => setSchoolData(prev => ({ ...prev, latitude: e.target.value }))}
                      className="form-control"
                      placeholder="36.7538"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t.longitude}</label>
                    <input
                      type="number"
                      step="any"
                      value={schoolData.longitude}
                      onChange={(e) => setSchoolData(prev => ({ ...prev, longitude: e.target.value }))}
                      className="form-control"
                      placeholder="3.0588"
                    />
                  </div>
                </div>

                <div className="d-grid gap-2 mt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-success"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Registering...
                      </>
                    ) : (
                      t.registerSchoolBtn
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowSchoolRegistrationModal(false)}
                    className="btn btn-secondary"
                  >
                    {t.cancel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // School Photo Upload Modal
  const renderSchoolPhotoModal = () => (
    showSchoolPhotoModal && (
      <div 
        className="modal show d-block" 
        style={{backgroundColor: 'rgba(0, 0, 0, 0.75)'}}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {schoolPhotoType === 'logo' ? t.uploadLogo : t.uploadPhoto}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowSchoolPhotoModal(false)}
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

              <form onSubmit={handleSchoolPhotoUpload}>
                <input type="hidden" name="photo_type" value={schoolPhotoType} />
                
                <div className="mb-3">
                  <label className="form-label">Select Image</label>
                  <input
                    type="file"
                    name="file"
                    required
                    accept="image/*"
                    className="form-control"
                  />
                  <div className="form-text">
                    Accepted formats: JPG, PNG (Max 5MB)
                  </div>
                </div>

                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Uploading...
                      </>
                    ) : (
                      t.upload
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowSchoolPhotoModal(false)}
                    className="btn btn-secondary"
                  >
                    {t.cancel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // Document Upload Modal - using new DocumentUpload component
  const renderDocumentUploadModal = () => {
    return (
      <DocumentUpload
        isOpen={documentUploadModal}
        requiredDocuments={userDocuments.required_documents || []}
        existingDocuments={userDocuments.documents || []}
        onUploadSuccess={handleDocumentUploadSuccess}
        onCancel={handleDocumentUploadCancel}
      />
    );
  };

  // Main render function
  return (
    <div className="App">
      {renderNavigation()}
      
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show fixed-top" style={{ top: '70px', zIndex: 1050 }}>
          {successMessage}
          <button type="button" className="btn-close" onClick={() => setSuccessMessage('')}></button>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger alert-dismissible fade show fixed-top" style={{ top: '70px', zIndex: 1050 }}>
          {errorMessage}
          <button type="button" className="btn-close" onClick={() => setErrorMessage('')}></button>
        </div>
      )}

      {/* Main Content */}
      <main>
        {/* Show dashboard if user is logged in, otherwise show based on currentPage */}
        {user ? (
          currentPage === 'schools' ? renderSchoolsPage() : renderDashboard()
        ) : (
          currentPage === 'schools' ? renderSchoolsPage() : renderHomePage()
        )}
      </main>

      {/* Modals */}
      {renderAuthModal()}
      {renderSchoolRegistrationModal()}
      {renderSchoolPhotoModal()}
      {renderDocumentUploadModal()}
    </div>
  );
}

export default App;