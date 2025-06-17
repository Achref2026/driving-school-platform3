import React, { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deviceType, setDeviceType] = useState('desktop');

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
    }

    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) {
      setDeviceType('android');
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
    } else {
      setDeviceType('desktop');
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing
      e.preventDefault();
      // Save the event for later use
      setDeferredPrompt(e);
      
      // Check if user has dismissed the prompt before
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowInstallPrompt(true);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Remember that user dismissed the prompt
    localStorage.setItem('pwa-install-dismissed', 'true');
    
    // Clear the deferredPrompt
    setDeferredPrompt(null);
  };

  const getInstallInstructions = () => {
    switch (deviceType) {
      case 'ios':
        return {
          icon: '🍎',
          title: 'Install on iPhone/iPad',
          steps: [
            'Tap the share button at the bottom of Safari',
            'Scroll down and tap "Add to Home Screen"',
            'Tap "Add" to install the app'
          ]
        };
      case 'android':
        return {
          icon: '🤖',
          title: 'Install on Android',
          steps: [
            'Tap the menu button (three dots) in Chrome',
            'Select "Add to Home screen" or "Install app"',
            'Tap "Add" or "Install" to confirm'
          ]
        };
      default:
        return {
          icon: '💻',
          title: 'Install on Desktop',
          steps: [
            'Look for the install button in your browser\'s address bar',
            'Click the install button or use the browser menu',
            'Follow the prompts to install the app'
          ]
        };
    }
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // For iOS, show manual instructions since beforeinstallprompt isn't supported
  if (deviceType === 'ios' && !deferredPrompt) {
    return (
      <div className="position-fixed bottom-0 start-0 end-0 p-3" style={{zIndex: 1040}}>
        <div className="d-md-none d-lg-block" style={{maxWidth: '400px', marginLeft: 'auto'}}>
          <div className="bg-primary text-white rounded shadow-lg p-3">
            <div className="d-flex align-items-start">
              <div className="fs-3 me-3">📱</div>
              <div className="flex-grow-1">
                <h6 className="fw-semibold small mb-1">Install Drive School DZ</h6>
                <p className="small mb-2 opacity-75">
                  Add to home screen for quick access and offline features
                </p>
                <button
                  onClick={() => setShowInstallPrompt(true)}
                  className="btn btn-light btn-sm"
                >
                  Show Instructions
                </button>
              </div>
              <button
                onClick={handleDismiss}
                className="btn-close btn-close-white ms-2"
              ></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop install prompt
  if (showInstallPrompt && deferredPrompt) {
    return (
      <div className="position-fixed bottom-0 start-0 end-0 p-3" style={{zIndex: 1040}}>
        <div className="d-md-none d-lg-block" style={{maxWidth: '400px', marginLeft: 'auto'}}>
          <div className="bg-primary text-white rounded shadow-lg p-3">
            <div className="d-flex align-items-start">
              <div className="fs-3 me-3">📱</div>
              <div className="flex-grow-1">
                <h6 className="fw-semibold mb-1">Install Drive School DZ</h6>
                <p className="small opacity-75 mb-3">
                  Get offline quizzes, push notifications, and quick access!
                </p>
                <div className="d-flex gap-2">
                  <button
                    onClick={handleInstallClick}
                    className="btn btn-light btn-sm fw-medium"
                  >
                    Install
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="btn btn-link btn-sm text-white text-decoration-none opacity-75"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Manual instructions modal
  if (showInstallPrompt && deviceType === 'ios') {
    const instructions = getInstallInstructions();
    
    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999}}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body p-4">
              <div className="text-center mb-4">
                <div style={{fontSize: '3rem'}} className="mb-3">{instructions.icon}</div>
                <h5 className="modal-title fw-semibold">
                  {instructions.title}
                </h5>
              </div>
              
              <div className="mb-4">
                {instructions.steps.map((step, index) => (
                  <div key={index} className="d-flex align-items-start mb-3">
                    <div className="badge bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" 
                         style={{width: '24px', height: '24px', fontSize: '0.75rem'}}>
                      {index + 1}
                    </div>
                    <p className="small mb-0 text-muted">{step}</p>
                  </div>
                ))}
              </div>

              <div className="alert alert-primary">
                <h6 className="alert-heading fw-medium">Why install?</h6>
                <ul className="list-unstyled small mb-0">
                  <li>• 📚 Take quizzes offline</li>
                  <li>• 🔔 Get push notifications</li>
                  <li>• ⚡ Faster app loading</li>
                  <li>• 📱 Native app experience</li>
                </ul>
              </div>

              <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                <button
                  onClick={handleDismiss}
                  className="btn btn-secondary"
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleDismiss}
                  className="btn btn-primary"
                >
                  Got It!
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PWAInstallPrompt;