const CACHE_NAME = 'mws-restaurant-v1'
const INITIAL_URLS_TO_CACHE = [
  '/',
  '/css/styles.css',
  '/js/dbhelper.js',
  '/js/main.js'
]
let datastore = null;
let window = self;  // Needed because web workers have no browsing context which contains 'window' scope

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

self.addEventListener('activate', event => {
  console.log(CACHE_NAME, 'now ready to handle URL based fetches!');

  /**
   * Configure IndexedDB for use
   */
  // In the following line, you should include the prefixes of implementations you want to test.
  window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  // DON'T use "var indexedDB = ..." if you're not in a function.
  // Moreover, you may need references to some window.IDB* objects:
  window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction
    ||{READ_WRITE: "readwrite"}; // This line should only be needed if it is needed to support the object's constants for older browsers
  window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
  // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)
  
  if (!('indexedDB' in window)) {
    console.log("Your browser doesn't support a stable version of IndexedDB.")
  } else {
    event.waitUntil(
      createDB((error, response) => {
        if (error) {
          console.log(`IndexedDB - Create database event error code: ${error}!`);
        } else {
          console.log(`${response} is ready to handle storing restaurant data!`);
        }
      })
    );
  }
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
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
});

/**
 * IndexedDB Related Functions involving the following basic patterns:
 * 1. Open a database.
 * 2. Create an object store in the database.
 * 3.Start a transaction and make a request to do some database operation, like adding or retrieving data.
 * 4. Wait for the operation to complete by listening to the right kind of DOM event.
 * 5. Do something with the results (which can be found on the request object).
 */
function createDB(callback) {
  const DBName = 'RestaurantsDB';

  // open database connection to datastore
  let request = window.indexedDB.open(DBName, 1);

  // handle datastore upgrades
  request.onupgradeneeded = e => {
    const db = e.target.result;

    // Delete the old datastore
    if (db.objectStoreNames.contains(DBName)) {
      db.deleteObjectStore(DBName);
    }

    // Create a new datastore
    const store = db.createObjectStore(DBName, {
      keyPath: 'id'
    });
  };

  // Handle errors when opening the datastore
  request.onerror = e => {
    callback(e.target.errorCode, null);
  }

  // Handle successful datastore access
  request.onsuccess = e => {
    // Get a reference to the db
    datastore = e.target.result;
    callback(null, DBName);
  }
}

function addToDB(callback) {
  
}