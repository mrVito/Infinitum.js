var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');


gulp.task('scripts-dev', function() {
    return gulp.src(['./src/js/infinitum.js'])
        .pipe(sourcemaps.init())
        .pipe(concat('infinitum.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist/js/'))
        .pipe(gulp.dest('./test/js/'));
});

gulp.task('scripts', function() {
    return gulp.src(['./src/js/infinitum.js'])
        .pipe(concat('infinitum.js'))
        .pipe(gulp.dest('./dist/js/'));
});

gulp.task('minify', function () {
    return gulp.src('./dist/js/infinitum.js')
        .pipe(uglify())
        .pipe(rename('./infinitum.min.js'))
        .pipe(gulp.dest('./dist/js/'))
});

gulp.task('default', ['scripts', 'minify']);
gulp.task('dev', ['scripts-dev']);

gulp.task('watch', function() {
    gulp.watch('./src/js/*.js', ['dev']);
});