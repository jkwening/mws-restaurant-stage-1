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
    // Fetch all restaurants
    DBHelper.fetchFromServer(RESTAURANTS_STR, (error, restaurants) => {
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
    DBHelper.fetchFromServer(RESTAURANTS_STR, (error, restaurants) => {
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
    DBHelper.fetchFromServer(RESTAURANTS_STR, (error, restaurants) => {
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
      // create reviews object store
      const reviews_store = upgradeDB.createObjectStore(REVIEWS_STR,
        {keyPath: 'id'}
      );
      // create restaurant_id index
      reviews_store.createIndex('restaurant_id', 'restaurant_id', {
        unique: false
      });        
    });
  }

  /**
   * Returns the number of records in indexedDB
   * @param {string} storeName object store name
   * @returns {number} count of records in object store 
   */
  static getNumRecords(storeName) {
    return DBHelper.fetchFromServer(storeName, (error, response) => {

    })
    return DBHelper.openDB().then(db => {
      const store = db.transaction(storeName).objectStore(storeName);
      return store.count();      
    });
  }

  /**
   * Add restaurant data to indexedDB database.
   * @param {JSON} data 
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
        store.add(r);
      });

      // return transaction complete promise object
      return tx.complete;
    });
  }

  /**
   * Get all restaurant data matching the index filter.
   * @param {string} idxName
   * @param {string} key
   * @param {string} storeName
   * @returns {Promise} 
   */
  static getRecordsFromIndex(idxName, key, storeName) {
    return DBHelper.openDB().then(db => {
      const index = db.transaction(storeName).objectStore(storeName)
        .index(idxName);
      
      return index.getAll(key);
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
}
