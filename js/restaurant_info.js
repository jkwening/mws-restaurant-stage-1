let restaurant;
var map;
let reviews;
const REVIEWS_STR = 'reviews';

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
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = () => {
  const endpoint = `${REVIEWS_STR}/?restaurant_id=${self.restaurant.id}`;

  DBHelper.fetchFromServer((error, response) => {
    const reviews = response;

    if (error) {
      console.error(`Error filling reviews - error: ${error}`);
      reviews = null;
    }

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

    // if form passes validation, submit form
    const form = document.getElementById('review-form');
    form.addEventListener('submit', event => {
      event.preventDefault();
      submitForm(event);
    });
  }, endpoint)
}

submitForm = (event) => {
  const data = {
    'restaurant_id': self.restaurant.id,
    'name': event.path[0][0].value,
    'rating': event.path[0][1].value,
    'comments': event.path[0][2].value
  }

  // fetch post reqeust
  fetch(DBHelper.DATABASE_URL(REVIEWS_STR), {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  }).then(response => {
    // if status = 201 - data was created and stored on server
    // status = 202 - updated locally defer post to server untill connection available
    if (response.status === 201 || response.status === 202) {
      // reset form and close the modal
      document.getElementById('add-review-modal').style.display = 'none';
      document.getElementById('review-form').reset();
      return response.json();
    }
  }).then(data => {
    // add new review to HTML page
    const ul = document.getElementById('reviews-list');
    ul.appendChild(createReviewHTML(data));
  }).then(() => {
    console.log('New review was added to IDB successfully!');
  }).catch(error => {
    console.error('Error in submit(): ', error);
  });
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

  // TODO - replace with star icons: create a div then add child icons with appropriate number of checks
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
 * Returns the endpoint for getting all reviews for a restaurant
 */
getReviewsByRestaurantEndpoint = () => {
  const id = getParameterByName('id');
  return `${REVIEWS_STR}/?restaurant_id=${id}`;
}

/**
 * Handle logic related to service worker
 */
let activeSW;
if ('serviceWorker' in navigator) {
  // listen to state changes
  navigator.serviceWorker.register('/service-worker.js').then(reg => {
    console.log('Registration successful, scope is:', reg.scope);

    if (reg.installing) {
      console.log('[restaurants_info.js] Service worker is installing...');
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
      console.log('[restaurants_info.js] Service worker is in control!');
      navigator.serviceWorker.controller.postMessage({'onlineStatus': true});
    } else {
      activeSW.postMessage({'onlineStatus': true});
    }
    notifyUser();
  });
  
  window.addEventListener('offline', event => {
    if (navigator.serviceWorker.controller) {
      console.log('[restaurants_info.js] Service worker is in control!');
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