// Service Worker for Algeria Driving School Platform
// Provides offline functionality and push notifications

const CACHE_NAME = 'drive-school-dz-v1.0.0';
const OFFLINE_CACHE = 'drive-school-offline-v1';
const QUIZ_CACHE = 'drive-school-quiz-v1';

// Resources to cache for offline use
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Quiz data that should be available offline
const offlineQuizEndpoints = [
  '/api/quizzes/theory',
  '/api/states'
];

// Install event - cache core resources
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    Promise.all([
      // Cache core app resources
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Caching core resources');
        return cache.addAll(urlsToCache);
      }),
      
      // Prepare offline cache
      caches.open(OFFLINE_CACHE).then(cache => {
        console.log('[SW] Preparing offline cache');
        return cache.put('/offline.html', new Response(`
          <!DOCTYPE html>
          <html lang="ar">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Offline - Drive School DZ</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
              }
              .offline-container {
                max-width: 400px;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 15px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
              }
              .offline-icon {
                font-size: 4rem;
                margin-bottom: 20px;
                animation: pulse 2s infinite;
              }
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
              }
              h1 { margin: 0 0 20px 0; font-size: 2rem; }
              p { font-size: 1.1rem; line-height: 1.6; margin-bottom: 30px; opacity: 0.9; }
              .retry-btn {
                background: rgba(255,255,255,0.2);
                border: 2px solid rgba(255,255,255,0.3);
                color: white;
                padding: 12px 30px;
                border-radius: 25px;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s ease;
              }
              .retry-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
              }
              .offline-features {
                margin-top: 30px;
                text-align: left;
              }
              .feature-item {
                margin: 10px 0;
                padding: 10px;
                background: rgba(255,255,255,0.1);
                border-radius: 8px;
              }
            </style>
          </head>
          <body>
            <div class="offline-container">
              <div class="offline-icon">🚗</div>
              <h1>You're Offline</h1>
              <p>أنت غير متصل بالإنترنت</p>
              <p>Don't worry! Some features are available offline:</p>
              
              <div class="offline-features">
                <div class="feature-item">
                  📚 <strong>Practice Quizzes</strong> - Take theory tests offline
                </div>
                <div class="feature-item">
                  📍 <strong>Browse States</strong> - View all 58 Algerian wilayas
                </div>
                <div class="feature-item">
                  👤 <strong>View Profile</strong> - Access your stored information
                </div>
              </div>
              
              <button class="retry-btn" onclick="window.location.reload()">
                Try Again / حاول مرة أخرى
              </button>
            </div>
          </body>
          </html>
        `, {
          headers: {
            'Content-Type': 'text/html',
          },
        }));
      })
    ])
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE && cacheName !== QUIZ_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients
  return self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (request.method === 'GET') {
    // API requests
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(handleApiRequest(request));
    }
    // Static resources
    else {
      event.respondWith(handleStaticRequest(request));
    }
  }
});

// Handle API requests with offline fallback
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses for offline use
    if (response.ok) {
      const cache = await caches.open(QUIZ_CACHE);
      
      // Cache quiz data and states
      if (offlineQuizEndpoints.some(endpoint => url.pathname.includes(endpoint))) {
        cache.put(request, response.clone());
      }
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed for API request:', url.pathname);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving API request from cache:', url.pathname);
      return cachedResponse;
    }
    
    // Return offline data for specific endpoints
    if (url.pathname.includes('/api/states')) {
      return new Response(JSON.stringify({
        states: [
          "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", 
          "Béchar", "Blida", "Bouira", "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", 
          "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saïda", "Skikda", 
          "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem", 
          "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh", "Illizi", 
          "Bordj Bou Arréridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt", "El Oued",
          "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent",
          "Ghardaïa", "Relizane", "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal", "Béni Abbès",
          "In Salah", "In Guezzam", "Touggourt", "Djanet", "El Meghaier", "El Meniaa"
        ]
      }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    if (url.pathname.includes('/api/quizzes')) {
      return new Response(JSON.stringify([
        {
          id: 'offline-quiz-1',
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
            }
          ],
          passing_score: 70,
          time_limit_minutes: 15,
          offline: true
        }
      ]), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Generic offline response for other API calls
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'This feature requires an internet connection'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Handle static resource requests
async function handleStaticRequest(request) {
  try {
    // Try network first for HTML pages (for updates)
    if (request.headers.get('accept').includes('text/html')) {
      const response = await fetch(request);
      return response;
    }
    
    // For other static resources, try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to network
    return await fetch(request);
  } catch (error) {
    console.log('[SW] Network failed for static request:', request.url);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's an HTML page, show offline page
    if (request.headers.get('accept').includes('text/html')) {
      const offlineResponse = await caches.match('/offline.html');
      return offlineResponse || new Response('Offline', { status: 503 });
    }
    
    // For other resources, return error
    return new Response('Offline', { status: 503 });
  }
}

// Push notification event
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();
  const options = {
    body: data.message || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'general',
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    vibrate: [200, 100, 200],
    requireInteraction: data.priority === 'high'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Drive School DZ', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Open the app
  event.waitUntil(
    clients.matchAll().then(clientList => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise open new window
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/';
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered');
  
  if (event.tag === 'quiz-sync') {
    event.waitUntil(syncQuizResults());
  }
});

// Sync quiz results when back online
async function syncQuizResults() {
  try {
    // Get stored quiz results from IndexedDB
    const storedResults = await getStoredQuizResults();
    
    for (const result of storedResults) {
      try {
        await fetch('/api/quiz-attempts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(result)
        });
        
        // Remove from local storage after successful sync
        await removeStoredQuizResult(result.id);
      } catch (error) {
        console.error('[SW] Failed to sync quiz result:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// IndexedDB helpers for offline quiz storage
async function getStoredQuizResults() {
  // Implementation would use IndexedDB to get stored quiz results
  return [];
}

async function removeStoredQuizResult(id) {
  // Implementation would remove specific result from IndexedDB
  console.log('[SW] Removing synced quiz result:', id);
}

console.log('[SW] Service Worker script loaded');