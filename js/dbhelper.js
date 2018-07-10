const DB_NAME = 'MWS-Restaurant-DB'
const RESTAURANTS_STR = 'restaurants';
const REVIEWS_STR = 'reviews';

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
    return 'http://localhost:1337'; // user actual server instead local json
  }

  /**
   * Fetch all restaurants.
   * @param {string} endpoint
   * @param {function} callback 
   */
  static fetchFromServer(endpoint, callback) {
    const DB_URL = `${DBHelper.DATABASE_URL}/${endpoint}`;
    return fetch(DB_URL).then(response => {
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
    DBHelper.fetchFromServer(RESTAURANTS_STR, (error, restaurants) => {
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
    DBHelper.fetchFromServer(RESTAURANTS_STR, (error, restaurants) => {
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
    DBHelper.fetchFromServer(RESTAURANTS_STR, (error, restaurants) => {
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
    DBHelper.recordsInIDB(RESTAURANTS_STR).then(result => {
      if (result) {
        DBHelper.getAllRecords(RESTAURANTS_STR).then(restaurants => {
          DBHelper.filterByCuisineAndNeighborhood(cuisine, neighborhood, restaurants,
            callback);
        });
      } else {
        // Fetch all restaurants
        DBHelper.fetchFromServer(RESTAURANTS_STR, (error, restaurants) => {
          if (error) {
            callback(error, null);
          } else {
            DBHelper.filterByCuisineAndNeighborhood(cuisine, neighborhood, restaurants,
              callback);
          }
        });
      }
    })
  }

  /**
   * Filter for restaurants per cuisine type and neighborhood.
   * @param {string} cuisine type to filter by
   * @param {string} neighborhood to filter by
   * @param {array} restaurants to filter from
   * @callback callback (error, response)
   */
  static filterByCuisineAndNeighborhood(cuisine, neighborhood,
    restaurants, callback) {
      let results = restaurants;
      if (cuisine != 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
      }
      callback(null, results);
    }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    DBHelper.recordsInIDB(RESTAURANTS_STR).then(result => {
      if (result) {
        DBHelper.getAllRecords(RESTAURANTS_STR).then(restaurants => {
          DBHelper.getUniqueNeighborhoods(restaurants, callback);
        }).catch(error => {
          callback(error, null);
        })
      } else {
        // Fetch all restaurants
        DBHelper.fetchFromServer(RESTAURANTS_STR, (error, restaurants) => {
          if (error) {
            callback(error, null);
          } else {
            DBHelper.getUniqueNeighborhoods(restaurants, callback);
          }
        });
      }
    })
  }

  /**
   * Get unique neighborhoods from an array of restaurants.
   * @param {array} restaurants to filter from
   * @callback callback (error, neighborhoods)
   */
  static getUniqueNeighborhoods(restaurants, callback) {
    // Get all neighborhoods from all restaurants
    const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
    // Remove duplicates from neighborhoods
    const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
    callback(null, uniqueNeighborhoods);
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    DBHelper.recordsInIDB(RESTAURANTS_STR).then(result => {
      if (result) {
        DBHelper.getAllRecords(RESTAURANTS_STR).then(restaurants => {
          DBHelper.getUniqueCuisines(restaurants, callback);
        }).catch(error => {
          callback(error, null);
        })
      } else {
        // Fetch all restaurants
        DBHelper.fetchFromServer(RESTAURANTS_STR, (error, restaurants) => {
          if (error) {
            callback(error, null);
          } else {
            DBHelper.getUniqueCuisines(restaurants, callback);
          }
        });
      }
    })
  }

  /**
   * Get unique types of cuisine from an array of restaurants.
   * @param {array} restaurants to filter from
   * @param {*} callback (error, cuisines)
   */
  static getUniqueCuisines(restaurants, callback) {
    // Get all cuisines from all restaurants
    const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
    // Remove duplicates from cuisines
    const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
    callback(null, uniqueCuisines);
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
  static checkForIDBSupport() {    
    if (!('indexedDB' in window)) {
      console.log("Your browser doesn't support a stable version of IndexedDB.")
      return false;
    }
    return true;
  }

  /**
   * Return idb db promise object
   */
  static openDB() {
    // return db promise object
    return idb.open(DB_NAME, 1, upgradeDB => {
      if (!upgradeDB.objectStoreNames.contains(RESTAURANTS_STR)) {
        // create restaurant object store
        const restaurants_store = upgradeDB.createObjectStore(RESTAURANTS_STR,
          {keyPath: 'id'}
        );
        // create neighborhood and cuisine indices
        restaurants_store.createIndex('neighborhood', 'neighborhood', {
          unique: false
        });
        restaurants_store.createIndex('cuisine', 'cuisine_type', {
          unique: false
        });
      }

      if (!upgradeDB.objectStoreNames.contains(REVIEWS_STR)) {
        // create reviews object store
        const reviews_store = upgradeDB.createObjectStore(REVIEWS_STR,
          {keyPath: 'id'}
        );
        // create restaurant_id index
        reviews_store.createIndex('restaurant_id', 'restaurant_id', {
          unique: false
        });        
      }
    });
  }

  /**
   * Returns the number of records in indexedDB
   * @param {string} storeName object store name
   * @returns {number} count of records in object store 
   */
  static getNumRecords(storeName) {
    return DBHelper.openDB().then(db => {
      const store = db.transaction(storeName).objectStore(storeName);
      return store.count();      
    });
  }
  
  /**
   * Returns true if IDB has records for the given object store.
   * @param {string} storeName for object store in IDB
   * @returns {boolean} true if records exist, false otherwise
   */
  static recordsInIDB(storeName) {
    return DBHelper.getNumRecords(storeName).then(count => {
      if (count > 0) {return true;}
      return false;
    });
  }

  /**
   * Add restaurant data to indexedDB database.
   * @param {JSON[]} data array of JSON data objects
   * @param {string} storeName object store name
   * @returns {Promise} a promise. Resolves when transaction completes,
   *  rejects if transaction aborts or errors 
   */
  static addRecords(data, storeName) {
    // get transaction object from dbPromise
    return DBHelper.openDB().then(db => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      // add all restaurant data into database
      data.forEach(r => {
        store.put(r);
      });

      // return transaction complete promise object
      return tx.complete;
    });
  }

  // TODO - remove if still unused
  /**
   * Get all restaurant data matching the index filter.
   * @param {string} field
   * @param {string} key
   * @param {string} storeName
   * @returns {Promise} 
   */
  static getRecordsByValue(field, key, storeName) {
    return DBHelper.openDB().then(db => {
      const records = [];
      const store = db.transaction(storeName).objectStore(storeName);
      return store.openCursor();
    }).then(function getRecords(cursor) {
      if (!cursor) {return;}
      records.push(cursor.value[field]);
      return cursor.continue().then(getRecords);
    }).then(() => {
      return records;
    });
  }

  // TODO - remove if still unused
  /**
   * Returns true if IDB has records for the given object store index.
   * @param {string} idxName
   * @param {string} key
   * @param {string} storeName
   * @returns {boolean} true if records exist, false otherwise
   */
  static recordsInIDBByFilter(idxName, key, storeName) {
    return this.getRecordsFromIndex(idxName, key, storeName).then(records => {
      console.log('recordsInIDBByFilter() - records: ', records);
      if (records.length > 0) {return true;}
      return false;
    });
  }

  /**
   * Get all restaurant data from indexedDB database.
   * @param {string} storeName 
   */
  static getAllRecords(storeName) {
    return DBHelper.openDB().then(db => {
      const store = db.transaction(storeName).objectStore(storeName);

      return store.getAll();
    })
  }

  /**
   * Returns an array of reviews for given field value
   * @param {string} field 
   * @param {object[]} records 
   */
  static filterRecordsByFieldValue(field, value, records) {
    let result = [];

    records.forEach(record => {
      if (record[field] === value) {
        result.push(record);
      }
    });

    return result;
  }
}
