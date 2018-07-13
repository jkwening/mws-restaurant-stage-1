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
let onlineStatus = null;
let deferedNewReviews = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
  7: [],
  8: [],
  9: [],
  10: []
}; // object storing deferred review for each restaurant id (key)

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

    if (requestUrl.pathname.includes('reviews')) {
      console.log('SW - Reviews: ', event.request.method);
        const params = requestUrl.searchParams;
        const id = parseInt(params.get('restaurant_id'));
      if (event.request.method === 'GET') {
        fetchReviewsByRestaurantID(event, id);
        return;
      }

      if (event.request.method === 'POST') {
        postNewReview(event, id);
        return;
      }
    }
  }

  // handle all other requests
  defaultFetchResponse(event);
});

/**
 * Handles tasks related to changes to connectivity
 */
updateOnlineStatus = status => {
  console.log('Current connectivity: ', onlineStatus);
  onlineStatus = status;
  console.log('Updated connectivity: ', onlineStatus);

  //TODO // if back online, submit deferred new reviews to server
}

/**
 * Listen for connectively changes and respond accordingly
 */
self.addEventListener('message', event => {
  if (event.data.onlineStatus != null) {updateOnlineStatus(event.data.onlineStatus);}
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

fetchReviewsByRestaurantID = (event, restaurantId) => {
  console.log('fetchReviewsByRestaurantID()');

  event.respondWith(
    DBHelper.getAllRecords(REVIEWS_STR).then(records => {
      // get reviews for given restaurant id
      const reviews  = DBHelper.filterRecordsByFieldValue('restaurant_id', restaurantId, records);
      console.log('Available reviews: ', reviews);
      if (reviews.length > 0) { // if records founds then return record from IDB as Response
        console.log('Returning reviews from IDB!');
        return new Response(JSON.stringify(reviews), {
          status: 200,
          statusText: 'OK',
        });
      } else { // else redirect to server and attempt to add data to IDB before responding to client
        console.log('Fetch from server - no reviews available for restaurant id: ', restaurantId);
        // clone request just in case promise fails at some point in next code logic
        const fetchRequest = event.request.clone();
        return fetch(fetchRequest).then(res => {
          if (!res || res.status !== 200) {
            return res;
          } else {
            return res.json().then(reviews => {
              console.log('Add reviews to IDB: ', reviews);
              // add to IDB async
              DBHelper.addRecords(reviews, REVIEWS_STR);

              // return response back to client
              return new Response(JSON.stringify(reviews), {
                status: 200,
                statusText: 'OK',
              });
            });
          }
        });
      }
    }).catch(error => {
      // fetch for client as fail safe
      console.log('Fail save - redirecting to server due to error: ', error);
      return fetch(event.request);
    })
  );
}

postNewReview = (event, restaurantId) => {
  console.log('postNewReview()');
  // event.respondWith(
  //   // console.log('navigator.onLine = ', onlineStatus);
  //   // connectivety = online - post to server, if created add to IDB, and return server response
  //   if (onlineStatus) {
  //     // console.log('Posting new review to server!');
  //     fetch(event.request).then(response => {
  //       if (response.status === 201) {
  //         const storeResp = response.clone();
  //         storeResp.json().then(data => {
  //           console.log('Add to IDB new review: ', data);
  //           DBHelper.addRecords([data], REVIEWS_STR);
  //         });
  //       }
  //       return response;
  //     });
  //   } else {
  //     // connectivety = offline - add to 'deferredNewReview', add 'defer' flag to review, add to IDB,
  //     // and return response with status = 100
  //     console.log('Deferring new review until online!');
  //     // store request clone for deferred push
  //     deferedNewReviews[restaurantId].push(event.request.clone());
  //     return event.request.body.json().then(data => {
  //       data[defer] = true;
  //       console.log('Add to IDB deferred review: ', data);
  //       DBHelper.addRecords([data], REVIEWS_STR);
  //       return new Response(JSON.stringify(data), {
  //         status: 100,
  //         statusText: 'DEFERRED',
  //       });
  //     });
  //   }
  // );
}
