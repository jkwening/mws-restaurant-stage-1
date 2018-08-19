importScripts("js/idb.js","js/dbhelper.js");const CACHE_NAME="mws-restaurant-v1",INITIAL_URLS_TO_CACHE=["./index.html","./restaurant.html","css/main.css","css/restaurant.css","js/helper.js","js/main.js","js/restaurant_info.js"];self.addEventListener("install",e=>{console.log(CACHE_NAME,"installing…"),e.waitUntil(caches.open(CACHE_NAME).then(e=>(console.log("Opened cache"),e.addAll(INITIAL_URLS_TO_CACHE))))}),self.addEventListener("activate",e=>{console.log(CACHE_NAME,"now ready to handle URL based fetches!"),DBHelper.checkForIDBSupport&&DBHelper.openDB().then(()=>{console.log("MWS-Restaurant-DB created! Data available offline!")}).catch(()=>console.log("Error opening IDB! Offline mode = false!")),e.waitUntil(self.clients.claim())}),self.addEventListener("fetch",e=>{const t=new URL(e.request.url);if(t.origin===location.origin){if("/"===t.pathname)return void e.respondWith(caches.match("/index.html"));if("/restaurant.html"===t.pathname)return void e.respondWith(caches.match("/restaurant.html"))}if("localhost:1337"===t.host){if(console.log("service-worker: ",t.href),t.pathname.includes("restaurants"))return void fetchAllRestaurants(e);if(t.pathname.includes("reviews")){console.log("SW - Reviews: ",e.request.method);const s=t.searchParams,r=parseInt(s.get("restaurant_id"));if("GET"===e.request.method)return void fetchReviewsByRestaurantID(e,r);if("POST"===e.request.method)return void postNewReview(e,r)}}defaultFetchResponse(e)}),self.addEventListener("message",e=>{null!=e.data.onlineStatus&&e.data.onlineStatus&&submitDeferredReviews()}),defaultFetchResponse=(e=>{console.log("Default - handle all other requests"),e.respondWith(caches.match(e.request).then(t=>{if(t)return t;const s=e.request.clone();return fetch(s).then(t=>{if(!t||200!==t.status||"basic"!==t.type)return t;const s=t.clone();return caches.open(CACHE_NAME).then(t=>{t.put(e.request,s)}),t})}))}),fetchAllRestaurants=(e=>{console.log("fetchAllRestaurants():"),e.respondWith(DBHelper.recordsInIDB(RESTAURANTS_STR).then(t=>t?(console.log("Returning restaurants from IDB!"),DBHelper.getAllRecords(RESTAURANTS_STR).then(e=>new Response(JSON.stringify(e),{status:200,statusText:"OK"}))):(console.log("Fetching from server then adding to IDB!"),fetch(e.request).then(e=>e&&200===e.status?e.json():e).then(e=>(console.log("Add restaurants to IDB: ",e),DBHelper.addRecords(e,RESTAURANTS_STR),new Response(JSON.stringify(e),{status:200,statusText:"OK"}))))))}),fetchReviewsByRestaurantID=((e,t)=>{console.log("fetchReviewsByRestaurantID()"),e.respondWith(DBHelper.getAllRecords(REVIEWS_STR).then(s=>{const r=DBHelper.filterRecordsByFieldValue("restaurant_id",t,s);if(console.log("Available reviews: ",r),r.length>0)return console.log("Returning reviews from IDB!"),new Response(JSON.stringify(r),{status:200,statusText:"OK"});{console.log("Fetch from server - no reviews available for restaurant id: ",t);const s=e.request.clone();return fetch(s).then(e=>e&&200===e.status?e.json().then(e=>(console.log("Add reviews to IDB: ",e),DBHelper.addRecords(e,REVIEWS_STR),new Response(JSON.stringify(e),{status:200,statusText:"OK"}))):e)}}).catch(t=>(console.log("Fail save - redirecting to server due to error: ",t),fetch(e.request))))}),postNewReview=((e,t)=>{console.log("[service-worker] postNewReview()"),navigator.onLine?e.respondWith(fetch(e.request).then(e=>201!==e.status?e:e.json().then(e=>(console.log("Add newly created review to IDB: ",e),DBHelper.addRecords([e],REVIEWS_STR),new Response(JSON.stringify(e),{status:201,statusText:"CREATED"}))))):e.respondWith(e.request.json().then(e=>{console.log("Defer the following request: ",e);const t=Date.now();return e.createdAt=t,e.updatedAt=t,e.id=t,e.defer=!0,console.log("Add the deferred stamped request to IDB: ",e),DBHelper.addRecords([e],REVIEWS_STR),new Response(JSON.stringify(e),{status:202,statusText:"DEFERRED"})}))}),submitDeferredReviews=(()=>{DBHelper.getAllRecords(REVIEWS_STR).then(e=>DBHelper.filterRecordsByFieldValue("defer",!0,e)).then(e=>{e.forEach(e=>{const t={restaurant_id:e.restaurant_id,name:e.name,rating:e.rating,comments:e.commets},s=`${DBHelper.DATABASE_URL}/${REVIEWS_STR}`;fetch(s,{method:"POST",mode:"cors",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}).then(e=>{if(201===e.status)return e.json();throw"[submitDeferredReviews] Post fetch returned stats: "+e.status}).then(e=>DBHelper.addRecords([e],REVIEWS_STR).then(()=>{})).then(t=>(console.log("[submitDeferredReviews] Successfully submitted and added server review:",t),DBHelper.deleteRecord(e.id,REVIEWS_STR))).then(()=>{console.log("[submitDeferredReviews] Successfully submitted and deleted deferred review:",e)}).catch(t=>{console.log("[submitDeferredReviews] Current connectivity status:",navigator.onLine),console.error("[submitDeferredReviews] Error submitting deferred review: ",e),console.error("[submitDeferredReviews] Error thrown: ",t)})})})});