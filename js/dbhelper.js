let idbActive = false;
const RESTAURANTS_STORE = 'restaurants';
const DBName = 'MWS-Restaurant-DB'
let datastore = null;

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    // const port = 8000 // Change this to your server port
    // return `http://localhost:${port}/data/restaurants.json`;
    return 'http://localhost:1337/restaurants'; // user actual server instead local json
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    if (idbActive) {
      DBHelper.getAllRestaurants(callback);
    } else {
      DBHelper.fetchFromURL(callback);
    }
  }

  static fetchFromURL(callback) {
    fetch(DBHelper.DATABASE_URL).then(response => {
      if (response.status === 200) { // Got a success response from server!
        return response.json();  // return promise to parse response body to json
      } else { // Oops!. Got an error from server.
        const error = (`Request failed. Returned status of ${response.status}`);
        callback(error, null);
      }
    }).then(restaurants => callback(null, restaurants));
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  /**
   * Verify indexedDB is supported.
   */
  static checkForSupport() {    
    if (!('indexedDB' in window)) {
      console.log("Your browser doesn't support a stable version of IndexedDB.")
    } else {
      // Attempt to create an indexedDB database.
      DBHelper.createDB((error, response) => {
        if (error) {
          console.log(`IndexedDB - Create database event error code: ${error}!`);
        } else {
          console.log(`${DBName} is ready to handle storing restaurant data!`);

          // Attempt to fetch data and store in indexedDB
          DBHelper.fetchFromURL((error, response) => {
            if (error) {
              console.log(error);
            } else { // Fetched data - store in indexedDB
              DBHelper.addRestaurants(response, (err, resp) => {
                if (err) {
                  console.log(`Failed to populated ${DBName}! Error code: ${err}`);
                } else { // Data loaded into indexedDB
                  console.log(`Success - the following was loaded: ${response}`);
                  idbActive = true;
                }
              })
            }
          })
        }
      })
    }
  }

  /**
   * Create indexedDB database and initialize an object store if it doesn't exist.
   * @param {object} callback 
   */
  static createDB(callback) {
    // open database connection to datastore
    let request = window.indexedDB.open(DBName, 1);

    // handle datastore upgrades
    request.onupgradeneeded = e => {
      const db = e.target.result;

      // Delete the old datastore
      if (db.objectStoreNames.contains(RESTAURANTS_STORE)) {
        db.deleteObjectStore(DBName);
      }

      // Create a new datastore
      const store = db.createObjectStore(RESTAURANTS_STORE, {
        keyPath: 'id'
      });

      // Create indices to search by 'cuisine' and 'neighborhoods'
      store.createIndex('neighborhood', 'neighborhood', {unique: false});
      store.createIndex('cuisine', 'cuisine_type', {unique: false});
    };

    // Handle errors when opening the datastore
    request.onerror = e => {
      callback(e.target.errorCode, null);
    }

    // Handle successful datastore access
    request.onsuccess = e => {
      // Get a reference to the datastore
      datastore = e.target.result;
      callback(null, e.target.result);
    }
  }

  /**
   * Add restaurant data to indexedDB database.
   * @param {JSON} data 
   * @param {object} callback 
   */
  static addRestaurants(data, callback) {
    // Initiate a new transaction and get object store
    const transaction = datastore.transaction([RESTAURANTS_STORE], 'readwrite');
    const store = transaction.objectStore(RESTAURANTS_STORE);
    
    transaction.oncomplete = e => {
      callback(null, e.target.result);
    }
    
    transaction.onerror = e => {
      callback(e.target.errorCode, null);
    }
    
    transaction.onabort = e => {
      callback(e.target.errorCode, null);
    }

    // add all restaurant data into database
    data.forEach(r => {
      store.add(r);
    });
  }

  /**
   * Get all restaurant data matching the index filter.
   * @param {string} filter 
   * @param {object} callback 
   */
  static getRestaurantsByIndex(filter, callback) {
    const objStore = datastore.transaction(RESTAURANTS_STORE).objectStore(RESTAURANTS_STORE);
    const index = objStore.index(filter);
    const request = index.getAll();

    request.onsuccess = e => {
      callback(null, e.target.result);
    }
    
    request.onerror = e => {
      callback(e.target.errorCode, null);
    }

  }

  /**
   * Get all restaurant data from indexedDB database.
   * @param {object} callback 
   */
  static getAllRestaurants(callback) {
    const objStore = datastore.transaction(RESTAURANTS_STORE).objectStore(RESTAURANTS_STORE);
    const request = objStore.getAll();

    request.onsuccess = e => {
      callback(null, e.target.result);
    }
    
    request.onerror = e => {
      callback(e.target.errorCode, null);
    }
  }

}
