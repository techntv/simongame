'use strict'

import gulp         from 'gulp'
import concat       from 'gulp-concat'
import uglify       from 'gulp-uglify'
import rename       from 'gulp-rename'
import sass         from 'gulp-sass'
import sourcemaps   from 'gulp-sourcemaps'
import autoprefixer from 'gulp-autoprefixer'
import del          from 'del'
import browserSync  from 'browser-sync'
import minify       from 'gulp-minify'
const data = {

};

gulp.task('concatScript', () => {
   return gulp.src([
        'app/vendor/foundation/jquery.js',
        'app/vendor/foundation/what-input.js',
        'app/vendor/foundation/foundation.min.js',
        'app/js/app.js'
    ])
    .pipe(concat('app.js'))
    .pipe(gulp.dest('app/js'));
})

gulp.task('minifyScript',['concatScript'], () => {
   return gulp.src('app/js/app.js')
    .pipe(minify({
        ext: {
            min:'.js'
        }
    }))
    .pipe(gulp.dest('dist/js'));
})

gulp.task('compileSass', () => {
   return gulp.src('app/scss/style.scss')
    .pipe(sourcemaps.init())
    .pipe(sass())    
    .pipe(autoprefixer(['last 2 versions','> 5%','Firefox ESR']))
    .pipe(sourcemaps.write('./'))    
    .pipe(gulp.dest('app/css'));    
})

gulp.task('concatStyle', ['compileSass'],() => {
    return gulp.src(['app/vendor/foundation/foundation.min.css','app/css/style.css'])
                .pipe(concat('style.css'))
                .pipe(gulp.dest('app/css'))
                .pipe(browserSync.stream());
})

gulp.task('clean', () => {
    del.sync([
        'dist'
    ]);
})
gulp.task('watch', ['build'],() => {
    browserSync.init({
        server: './app'
    });
    gulp.watch('app/scss/**/*.scss', ['concatStyle']);
    gulp.watch('app/js/app.js',['concatScript']);
    gulp.watch("app/*.html").on('change', browserSync.reload);
})

gulp.task('build', ['concatScript','concatStyle']);

gulp.task('build-prod', ['minifyScript','concatStyle'],() => {
    return gulp.src([
        'app/index.html',
        'app/css/style.css',
        'app/js/app.min.js',
        'app/images/**',
        'app/fonts/**'],
        { base: './app'})
                .pipe(gulp.dest('dist'));
});

gulp.task('serve', ['watch']);

gulp.task('default', ['clean'], ()=> {
    gulp.start('build');
});