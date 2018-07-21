const gulp = require('gulp');
const cssnano = require('gulp-cssnano');
const terser = require('gulp-terser');
const rename = require('gulp-rename');
const size = require('gulp-size');

gulp.task('minify-css', () => {
  return gulp.src('css/styles.css')
    .pipe(size())
    .pipe(cssnano())
    .pipe(gulp.dest('dist/css'))
    .pipe(size())
});

gulp.task('terser', () => {
  return gulp.src(['js/main.js', 'js/helper.js', 'js/restaurant_info.js'])
    .pipe(size({
      showFiles: true
    }))
    .pipe(terser())
    .pipe(gulp.dest('dist/js'))
    .pipe(size({
      showFiles: true
    }))
});
