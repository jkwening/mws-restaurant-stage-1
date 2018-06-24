(function() {
  let restaurantDB = {
    active: false
  };
  const RESTAURANTS_STORE = 'restaurants';
  const DBName = 'MWS-Restaurant-DB'
  let datastore = null;

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
    restaurantDB.createDB((error, response) => {
      if (error) {
        console.log(`IndexedDB - Create database event error code: ${error}!`);
      } else {
        console.log(`${response} is ready to handle storing restaurant data!`);
        restaurantDB.active = true;
      }
    })
  }

  // Methods for interacting with the database.
  /**
   * Create indexedDB database and initialize an object store if it doesn't exist.
   * @param {object} callback 
   */
  restaurantDB.createDB = function(callback) {
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
  restaurantDB.addRestaurants = function(data, callback) {
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
  restaurantDB.getRestaurantsByIndex = function(filter, callback) {
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
  restaurantDB.getAllRestaurants = function(callback) {
    const objStore = datastore.transaction(RESTAURANTS_STORE).objectStore(RESTAURANTS_STORE);
    const request = objStore.getAll();
  
    request.onsuccess = e => {
      callback(null, e.target.result);
    }
    
    request.onerror = e => {
      callback(e.target.errorCode, null);
    }
  }

  // Export the restaurantDB object.
  return restaurantDB;
}());


/**
 * Module variables
 */
// let window = self;  // Needed because web workers have no browsing context which contains 'window' scope

