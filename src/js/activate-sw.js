/**
 * Handle logic related to service worker
 */
let activeSW;
if ('serviceWorker' in navigator) {
  // listen to state changes
  navigator.serviceWorker.register('/service-worker.js').then(reg => {
    console.log('Registration successful, scope is:', reg.scope);

    if (reg.installing) {
      console.log('Service worker is installing...');
      activeSW = reg.installing;
      activeSW.addEventListener('statechange', () => {
        if (activeSW.state === 'activated') {
          activeSW.postMessage({'onlineStatus': navigator.onLine});
        }
      });
    }
  }).catch(error => {
    console.log('Service worker registration failed, error:', error);
  });

  window.addEventListener('online', event => {
    if (navigator.serviceWorker.controller) {
      console.log('Service worker is in control!');
      navigator.serviceWorker.controller.postMessage({'onlineStatus': true});
    } else {
      activeSW.postMessage({'onlineStatus': true});
    }
    notifyUser();
  });
  
  window.addEventListener('offline', event => {
    if (navigator.serviceWorker.controller) {
      console.log('Service worker is in control!');
      navigator.serviceWorker.controller.postMessage({'onlineStatus': false});
    } else {
      activeSW.postMessage({'onlineStatus': false});
    }
    notifyUser();
  });
} else {
  console.log('Service workers are not supported!');
}

notifyUser = () => {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission(permission => {
        console.log('[notifyUser] Result of permission request: ', permission);
      })
    }
    
    if (Notification.permission === 'granted') {
      let text = 'Network connection: ';
      if (navigator.onLine) {
        text += 'online!';
      } else {
        text += 'offline!';
      }
      const notify = new Notification('Online Status', {
        body: text
      });
      setTimeout(notify.close.bind(notify), 4000);
    }
  }
}