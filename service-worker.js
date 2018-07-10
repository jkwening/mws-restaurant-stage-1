importScripts('/js/idb.js', '/js/dbhelper.js');

/**
 * Module variables
 */
const CACHE_NAME = 'mws-restaurant-v1'
const INITIAL_URLS_TO_CACHE = [
  '/index.html',
  '/restaurant.html',
  '/css/styles.css',
  'js/idb.js',
  '/js/dbhelper.js',
  '/js/helper.js',
  '/js/main.js',
  '/js/restaurant_info.js'
]
let indexedDBSupported = false;

/**
 * Install service worker with static files
 */
self.addEventListener('install', event => {
  console.log(CACHE_NAME, 'installing…');

  // Perform intall steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(INITIAL_URLS_TO_CACHE);
      })
  );
});

/**
 * Activate service worker
 */
self.addEventListener('activate', event => {
  console.log(CACHE_NAME, 'now ready to handle URL based fetches!');

  // if indexedDB is supported then create database
  if (DBHelper.checkForIDBSupport) {
    DBHelper.openDB().then(() => {
      console.log('MWS-Restaurant-DB created! Data available offline!')
      indexedDBSupported = true;
    }).catch(() => console.log('Error opening IDB! Offline mode = false!'));
  }
});

/**
 * Handle storing of fetch requests
 */
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  
  // Redirect appropriately for root and restaurant.html
  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname === '/') {
      event.respondWith(caches.match('/index.html'));
      return;
    }
    
    if (requestUrl.pathname === '/restaurant.html') {
      event.respondWith(caches.match('/restaurant.html'));
      return;
    }
  }
  
  // Redirect for backend server
  if (requestUrl.host === 'localhost:1337') {
    console.log('service-worker: ', requestUrl.href);
    if (requestUrl.pathname.includes('restaurants')) {
      fetchAllRestaurants(event);
      return;
    }
  }

  // handle all other requests
  defaultFetchResponse(event);
});

/**
 * Helper function for handling fetch request that are not redirected.
 */
defaultFetchResponse = event => {
  console.log('Default - handle all other requests');
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) { // Cache hit - return response
          return response;
        }
        
        // IMPORTANT: Clone the request. A request is a stream and
        // can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need
        // to clone the response.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(res => {
            // Handle invalid response
            if (!res || res.status !== 200 || res.type !== 'basic') {
              return res;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = res.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return res;
          }
        );
      })
  );
}

/**
 * Fetch restaurants data - preferably from IDB if possile, else directly from server.
 */
fetchAllRestaurants = event => {
  console.log('fetchAllRestaurants():');

  event.respondWith(
    DBHelper.recordsInIDB(RESTAURANTS_STR).then(result => {
      if (result) {
        console.log('Returning restaurants from IDB!');
        return DBHelper.getAllRecords(RESTAURANTS_STR).then(records => {
          return new Response(JSON.stringify(records), {
            status: 200,
            statusText: 'OK',
          });
        });
      } else {
        console.log('Fetching from server then adding to IDB!');
        return fetch(event.request).then(res => {
          if (!res || res.status !== 200) {
            return res;
          }
  
          // clone response and store into IDB
          return res.json();
        }).then(restaurants => {
          console.log('Add restaurants to IDB: ', restaurants);
  
          // add to IDB async
          DBHelper.addRecords(restaurants, RESTAURANTS_STR);
  
          // return response back to client
          return new Response(JSON.stringify(restaurants), {
            status: 200,
            statusText: 'OK',
          });
        });
      }
    })
  );
}
