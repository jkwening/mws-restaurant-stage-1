const gulp = require('gulp');
const htmlmin = require('gulp-htmlmin');
const terser = require('gulp-terser');
const size = require('gulp-size');
const inlinesource = require('gulp-inline-source');
const del = require('del');
const concat = require('gulp-concat');
const webp = require('gulp-webp');

// Clean dist directory
gulp.task('clean', () => del('dist'));

// Copy over manifest file
gulp.task('manifest', () => {
  return gulp.src('./src/manifest.json')
    .pipe(gulp.dest('./dist'));
});

// Minify and copy over service-worker.js
gulp.task('sw', () => {
  return gulp.src('./src/service-worker.js')
    .pipe(size())
    .pipe(terser({compress: {drop_console: true}}))
    .pipe(gulp.dest('./dist'))
    .pipe(size());
});

// Copy over images and convert jpg to webp
gulp.task('images', () => {
  return gulp.src(['./src/img/*_300w.jpg', './src/img/diet.svg'])
    .pipe(size({showFiles: true}))
    .pipe(webp())
    .pipe(size({showFiles: true}))
    .pipe(gulp.dest('./dist/img'));
});

// Generate webp images for source folder
gulp.task('src-images', () => {
  return gulp.src(['./src/img/*_300w.jpg', './src/img/diet.svg'])
    .pipe(size({showFiles: true}))
    .pipe(webp())
    .pipe(size({showFiles: true}))
    .pipe(gulp.dest('./src/img'));
});

// Process main.js by concat activate.js then minify
gulp.task('main.js', () => {
  return gulp.src(['./src/js/activate-sw.js', './src/js/main.js'])
    .pipe(size({showFiles: true}))
    .pipe(concat('main.js'))
    .pipe(terser({
      compress: {drop_console: true}
    }))
    .pipe(gulp.dest('./dist/js'))
    .pipe(size());
});

// Process restaurant_info.js by concat activate.js then minify
gulp.task('restaurant.js', () => {
  return gulp.src(['./src/js/activate-sw.js', './src/js/restaurant_info.js'])
    .pipe(size({showFiles: true}))
    .pipe(concat('restaurant_info.js'))
    .pipe(terser({
      compress: {drop_console: true}
    }))
    .pipe(gulp.dest('./dist/js'))
    .pipe(size());
});

// Minify other JS files
gulp.task('minify-js', () => {
  return gulp.src(['src/js/helper.js', './src/js/idb.js', './src/js/dbhelper.js'])
    .pipe(size({
      showFiles: true
    }))
    .pipe(terser({compress: {drop_console: true}}))
    .pipe(gulp.dest('./dist/js'))
    .pipe(size({
      showFiles: true
    }))
});

// Process html pages by first inlining critical CSS and then minify html
gulp.task('html', () => {
  return gulp.src(['./src/index.html', './src/restaurant.html'])
    .pipe(size({showFiles: true}))
    .pipe(inlinesource())
    .pipe(size({showFiles: true}))
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true
    }))
    .pipe(gulp.dest('dist'))
    .pipe(size({showFiles: true}));
})

// Perform dist build per sequence by default
gulp.task('default', gulp.series('clean', 'manifest', 'sw', 'images', 'main.js', 'restaurant.js',
  'minify-js', 'html'
));

gulp.task('watch', () => {
  gulp.watch('./src/manifest.json', gulp.parallel('manifest'));
  gulp.watch('./src/service-worker.js', gulp.parallel('sw'));
  gulp.watch('./src/img/*.jpg', gulp.parallel('images'));
  gulp.watch('./src/js/*.js', gulp.parallel('main.js', 'restaurant.js', 'minify-js'));
  gulp.watch('./src/css/styles.css', gulp.parallel('html'));
  gulp.watch('./src/*.html', gulp.parallel('html'));
});
