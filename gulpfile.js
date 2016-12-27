var gulp        = require('gulp'),
    sass        = require('gulp-sass'),
    rename      = require('gulp-rename'),
    cssmin      = require('gulp-clean-css'),
    concat      = require('gulp-concat'),
    uglify      = require('gulp-uglify'),
    jshint      = require('gulp-jshint'),
    cache       = require('gulp-cached'),
    prefix      = require('gulp-autoprefixer'),
    browserSync = require('browser-sync'),
    reload      = browserSync.reload,
    minifyHTML  = require('gulp-minify-html'),
    size        = require('gulp-size'),
    plumber     = require('gulp-plumber'),
    notify      = require('gulp-notify');

// Compile scss
gulp.task('scss', function() {
  var onError = function(err) {
    notify.onError({
        title:    "Gulp",
        subtitle: "Failure!",
        message:  "Error: <%= error.message %>",
        sound:    "Beep"
    })(err);
    this.emit('end');
  };

  return gulp.src('scss/main.scss')
    .pipe(plumber({errorHandler: onError}))
    .pipe(sass())
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(prefix())
    .pipe(rename('main.css'))
    .pipe(gulp.dest('dist/css'))
    .pipe(reload({stream:true}))
    .pipe(cssmin())
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('dist/css'));
});

// Js Hint
gulp.task('jshint', function() {
  gulp.src('js/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

// Concat js
gulp.task('js', function(){
  gulp.src([
      'node_modules/bootstrap/node_modules/jquery/dist/jquery.slim.js',
      'node_modules/bootstrap/node_modules/tether/dist/js/tether.js',
      'node_modules/bootstrap/js/dist/util.js',
      'node_modules/bootstrap/js/dist/tooltip.js',
      'node_modules/bootstrap/js/dist/popover.js',
      'node_modules/topojson/dist/topojson.js',
      'js/d3.js',
      'js/main.js'
    ])
    .pipe(uglify())
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(concat('main.js'))
    .pipe(gulp.dest('dist/js'))
    .pipe(reload({stream:true}));
});

// Copy data files
gulp.task('data', function(){
  gulp.src(['es/municipalities.json', 'data/dvmi.csv'])
    .pipe(gulp.dest('dist/data/'));
});

// Minify html
gulp.task('minify-html', function() {
    var opts = {
      comments:true,
      spare:true
    };

  gulp.src('./*.html')
    .pipe(minifyHTML(opts))
    .pipe(gulp.dest('dist/'))
    .pipe(reload({stream:true}));
});

// Run browser sync
gulp.task('browser-sync', function() {
  browserSync({
    server: {
      port: 6000,
      baseDir: "dist/"
    }
  });
});

// Watch
gulp.task('watch', function() {
  gulp.watch('scss/*.scss', ['scss']);
  gulp.watch('js/*.js', ['jshint', 'js']);
  gulp.watch('./*.html', ['minify-html']);
});

gulp.task('default', ['browser-sync', 'data', 'js', 'minify-html', 'scss', 'watch']);
