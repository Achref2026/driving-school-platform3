import React, { useState, useEffect } from 'react';

const MobileNotifications = ({ 
  notifications = [], 
  unreadCount = 0, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onDeleteNotification,
  onToggleNotifications,
  showNotifications = false 
}) => {
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [subscribedToPush, setSubscribedToPush] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
      
      // Check if already subscribed
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setSubscribedToPush(!!subscription);
        });
      });
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!pushSupported) {
      alert('Push notifications are not supported on this device');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        await subscribeToPushNotifications();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const subscribeToPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // For demo purposes, we'll use a dummy VAPID key
      // In production, you'd get this from your backend
      const vapidPublicKey = 'BMxG-VmFL2lBTf0bXWHO1YQk-eSrX8rFgIGdOPqcJYp1t1kC7qGGY7l1B9k6bKYsW7q1fIrOyRdDqPjd8hYQw';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      
      // Send subscription to backend
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/notifications/subscribe`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            device_type: getMobileDeviceType()
          })
        });
      }
      
      setSubscribedToPush(true);
      console.log('Push notification subscription successful');
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify backend
        const token = localStorage.getItem('auth_token');
        if (token) {
          await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/notifications/unsubscribe`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              endpoint: subscription.endpoint
            })
          });
        }
      }
      
      setSubscribedToPush(false);
      console.log('Unsubscribed from push notifications');
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const getMobileDeviceType = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) return 'android';
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    return 'mobile';
  };

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-success bg-opacity-25 text-success',
      medium: 'bg-warning bg-opacity-25 text-warning',
      high: 'bg-info bg-opacity-25 text-info',
      urgent: 'bg-danger bg-opacity-25 text-danger'
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityIcon = (type) => {
    const icons = {
      enrollment_approved: '✅',
      enrollment_rejected: '❌',
      session_reminder: '⏰',
      exam_scheduled: '📝',
      course_completed: '🎓',
      certificate_ready: '🏆',
      payment_reminder: '💳',
      payment_completed: '✅',
      payment_failed: '❌'
    };
    return icons[type] || '📢';
  };

  if (!showNotifications) {
    return (
      <button
        onClick={onToggleNotifications}
        className="position-relative btn btn-link text-muted p-2"
        aria-label="Notifications"
      >
        <i className="bi bi-bell fs-5"></i>
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-md-none" style={{zIndex: 9999}}>
      <div className="position-fixed end-0 top-0 h-100 bg-white shadow-lg" style={{width: '100%', maxWidth: '400px'}}>
        {/* Header */}
        <div className="bg-primary text-white p-3">
          <div className="d-flex align-items-center justify-content-between">
            <h5 className="mb-0 fw-semibold">Notifications</h5>
            <button
              onClick={onToggleNotifications}
              className="btn-close btn-close-white"
            ></button>
          </div>
          
          {unreadCount > 0 && (
            <div className="d-flex align-items-center justify-content-between mt-2">
              <span className="small opacity-75">{unreadCount} unread</span>
              <button
                onClick={onMarkAllAsRead}
                className="btn btn-sm btn-light bg-opacity-25 text-white border-0"
              >
                Mark all read
              </button>
            </div>
          )}
        </div>

        {/* Push Notification Settings */}
        {pushSupported && (
          <div className="p-3 border-bottom bg-light">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="small fw-medium text-dark mb-0">Push Notifications</p>
                <p className="text-muted" style={{fontSize: '0.75rem'}}>
                  {subscribedToPush ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              {pushPermission === 'granted' ? (
                <button
                  onClick={subscribedToPush ? unsubscribeFromPushNotifications : subscribeToPushNotifications}
                  className={`btn btn-sm ${
                    subscribedToPush 
                      ? 'btn-outline-danger' 
                      : 'btn-outline-success'
                  }`}
                >
                  {subscribedToPush ? 'Disable' : 'Enable'}
                </button>
              ) : (
                <button
                  onClick={requestNotificationPermission}
                  className="btn btn-sm btn-outline-primary"
                >
                  Enable
                </button>
              )}
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="overflow-auto" style={{height: 'calc(100vh - 200px)'}}>
          {notifications.length === 0 ? (
            <div className="d-flex flex-column align-items-center justify-content-center text-muted" style={{height: '300px'}}>
              <i className="bi bi-bell fs-1 opacity-50 mb-3"></i>
              <p className="text-center mb-1">No notifications yet</p>
              <p className="small text-center opacity-75">You'll see updates here</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-bottom ${
                    !notification.is_read ? 'bg-primary bg-opacity-10 border-start border-primary border-3' : ''
                  }`}
                >
                  <div className="d-flex align-items-start">
                    <div className="me-3 fs-4">
                      {getPriorityIcon(notification.type)}
                    </div>
                    
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center justify-content-between">
                        <p className="small fw-medium text-dark mb-1">
                          {notification.title}
                        </p>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`badge ${getPriorityColor(notification.priority)}`}>
                            {notification.priority}
                          </span>
                          <button
                            onClick={() => onDeleteNotification(notification.id)}
                            className="btn btn-sm btn-link text-muted p-0"
                          >
                            <i className="bi bi-trash3"></i>
                          </button>
                        </div>
                      </div>
                      
                      <p className="small text-muted mb-2" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {notification.message}
                      </p>
                      
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="text-muted" style={{fontSize: '0.75rem'}}>
                          {formatNotificationTime(notification.created_at)}
                        </span>
                        
                        {!notification.is_read && (
                          <button
                            onClick={() => onMarkAsRead(notification.id)}
                            className="btn btn-link btn-sm text-primary p-0 text-decoration-none"
                            style={{fontSize: '0.75rem'}}
                          >
                            Mark as read
                          </button>
                        )}
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
  );
};

export default MobileNotifications;