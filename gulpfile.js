const gulp = require('gulp');
const htmlmin = require('gulp-htmlmin');
const purgecss = require('gulp-purgecss');
const terser = require('gulp-terser');
const rename = require('gulp-rename');
const size = require('gulp-size');
const inlinesource = require('gulp-inline-source');
const gulpSequence = require('gulp-sequence');
const del = require('del');
const concat = require('gulp-concat');
const webp = require('gulp-webp');

// Clean dist directory
gulp.task('clean', () => del('dist'));

// Copy over manifest file
gulp.task('manifest', () => {
  return gulp.src('./manifest.json')
    .pipe(gulp.dest('./dist'));
});

// Minify and copy over service-worker.js
gulp.task('sw', () => {
  return gulp.src('./src/service-worker.js')
    .pipe(size())
    .pipe(terser())
    .pipe(gulp.dest('./dist'))
    .pipe(size());
});

// Copy over images
gulp.task('images', () => {
  return gulp.src(['./src/img/*_300w.jpg', './src/img/diet.svg'])
    .pipe(size({showFiles: true}))
    .pipe(webp())
    .pipe(size({showFiles: true}))
    .pipe(gulp.dest('./dist/img'));
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

// TODO - remove if contiune with
// Create main.css by purging unused css styles
gulp.task('main.css', () => {
  return gulp.src('./src/css/styles.css')
    .pipe(size())
    .pipe(purgecss({content: ['./src/index.html']}))
    .pipe(size())
    .pipe(rename('main.css'))
    .pipe(gulp.dest('./src/css'));
});

// Create restaurant.css by purging unused css styles
gulp.task('restaurant.css', () => {
  return gulp.src('./src/css/styles.css')
    .pipe(size())
    .pipe(purgecss({content: ['./src/restaurant.html']}))
    .pipe(size())
    .pipe(rename('restaurant.css'))
    .pipe(gulp.dest('./src/css'));
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

// Perform dist build in appropriate sequence
// gulp.task('build', (cb) => {
//   gulpSequence('clean', ['manifest', 'sw', 'images', 'main.js', 'restaurant.js', 'minify-js', 'html'], cb)
// });
