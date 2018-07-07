let restaurant;
var map;
let reviews;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name;
  image.setAttribute('aria-label', ''); // decorative image

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Returns promise that resolves to reviews data or null. The data is fetched
 * from IDB if available else directly from the server.
 */
fetchReviews = () => {
  return DBHelper.recordsInIDB(REVIEWS_STR).then(result => {
    if (result) { // get from IDB if records available
      return DBHelper.getRecordsFromIndex('restaurant_id', self.restaurant.id, REVIEWS_STR)
        .then(reviews => {
          console.log(`Fetching reviews for restaurant id: ${self.restaurant.id}`);
          console.log('Reviews: ', reviews);
          return reviews;
        });
    }

    // else fetch directly from server
    const reviewsEndpoint = `${REVIEWS_STR}/?restaurant_id=${self.restaurant.id}`;
    DBHelper.fetchFromServer(reviewsEndpoint, (error, reviews) => {
      if (error) {
        console.error(error);
        return null;
      }
      return reviews;
    })
  })
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = () => {
  fetchReviews().then(reviews => {
    const container = document.getElementById('reviews-container');
    const title = document.createElement('h2');
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    const addReviewBtn = document.createElement('button');
    addReviewBtn.innerHTML = 'Add Review';
    addReviewBtn.setAttribute('id', 'add-review-btn');
    container.appendChild(addReviewBtn);
  
    if (!reviews) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);

    /**
     * setup and connect add review form modal
     */
    const modal = document.getElementById('add-review-modal');
    const addBtn = document.getElementById('add-review-btn');
    const close = document.getElementsByClassName('close')[0];
    
    // open modal when user clicks on button
    addBtn.onclick = () => {
      modal.style.display = 'block';
    }
    
    // close modal when user clicks on close span (x)
    close.onclick = () => {
      modal.style.display = 'none';
    }
    
    // close modal when user clicks anywhere outside of the modal
    window.onclick = event => {
      if (event.target == modal) {
        modal.style.display = 'none';
      }
    }
  }).catch(error => {
    console.error(`Error filling reviews - error: ${error}`);
  })
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.updatedAt).toDateString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Setup indexedDB for storing server data locally if supported
 */
if (DBHelper.checkForIDBSupport()) {
  // fetch data if database is empty
  DBHelper.recordsInIDB(REVIEWS_STR).then(result => {
    if (!result) {
      DBHelper.fetchFromServer(REVIEWS_STR,
        (error, data) => {
          if (error) {
            console.error(error);
          } else {
            DBHelper.addRecords(data, REVIEWS_STR)
              .then(() => {
                console.log('Records added to IDB! Data available offline!')
              })
              .catch(() => console.log('Error adding data to IDB! Offline mode = false!'));
          }
        });
    } else {
      console.log('Records already available in IDB! Data available offline!')
    }
  });
}
