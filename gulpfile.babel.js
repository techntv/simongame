'use strict';

import plugins      from 'gulp-load-plugins';
import yargs        from 'yargs';
import rimraf       from 'rimraf'; // remove folder
import gulp         from 'gulp';
import sherpa       from 'style-sherpa';
import yaml         from 'js-yaml';
import fs           from 'fs';
import webpackStream from 'webpack-stream';
import webpack2      from 'webpack';
import named         from 'vinyl-named';
import browser  from 'browser-sync';


// Load all Gulp plugins into one variables - lazy load
const $ = plugins();

// Check for --production flag in terminal
const PRODUCTION = !!(yargs.argv.production);

// Load settings from config.yml
const { COMPATIBILITY, PORT, UNCSS_OPTIONS, PATHS } = loadConfig();

let webpackConfig = {
    rules: [
        {
            test: /\.js$/,
            use: [
                {
                    loaders: 'babel-loader'
                }
            ]
        }
    ]
}

function loadConfig(){
    let ymlFile = fs.readFileSync('config.yml', 'utf8');
    return yaml.load(ymlFile);
}

// Delete the "dist" folder
// This happens every time a build starts
function clean(done) {
    rimraf(PATHS.dist, done);
}

// Copy files out of the assets folder
// This task skips over the "img", "js", and "scss" folders, which are parsed separately
function copy(){
    return gulp.src(PATHS.assets)
               .pipe(gulp.dest(PATHS.dist + '/assets'));
}

// Copy page templates into finished HTML files
function pages(){

}


// Compile Sass into CSS
// In production, the CSS is compressed
function sass(){
    return gulp.src('src/assets/scss/app.scss')
               .pipe($.sourcemaps.init())
               .pipe($.sass({
                   includePaths: PATHS.sass
               })
                .on('error', $.sass.logError))
               .pipe($.autoprefixer({
                   browsers: COMPATIBILITY
               }))
               .pipe($.if(PRODUCTION, $.cleanCss({ compability: 'ie9 '})))
               .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
               .pipe(gulp.dest(PATHS.dist + '/assets/css'))
               .pipe(browser.reload({ stream: true }))
}

// Combine JavaScript into one file
// In production, the file is minified
function javascript() {
    return gulp.src(PATHS.entries)
               .pipe(named())
               .pipe($.sourcemaps.init())
               .pipe(webpackStream({module: webpackConfig}, webpack2)) // Read ES6 - Convert ES6 to ES5
               .pipe($.if(PRODUCTION, $.uglify()
                    .on('error', function(e){
                        console.log(e);
                    })
                ))
                .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
                .pipe(gulp.dest(PATHS.dist + '/assets/js'));
}

// Copy images to the "dist" folder
// In production, the images are compressed
function images(){
    return gulp.src('src/assets/img/**/*')
               .pipe($.if(PRODUCTION, $.imagemin({
                   progressive: true
               })))
               .pipe(gulp.dest(PATHS.dist + '/assets/img'))
}

// Start a server with BrowserSync to preview the site in
function server(done){
    browser.init({
        server: PATHS.dist,
        port: PORT
    });
    done();
}

// Reload the browser with BrowserSync
function reload(done) {
    browser.reload();
    done();
}

// Watch for changes to static assets, pages, Sass, and JavaScript
function watch() {
    gulp.watch(PATHS.assets, copy);
    gulp.watch('src/pages/**/*.html').on('all', gulp.series(pages, browser.reload));
    gulp.watch('src/{layouts,partials}/**/*.html').on('all', gulp.series(pages, browser.reload));
    gulp.watch('src/assets/scss/**/*.scss').on('all', sass);
    gulp.watch('src/assets/js/**/*.js').on('all', gulp.series(javascript, browser.reload));
    gulp.watch('src/asets/img/**/*').on('all', gulp.series(images, browser.reload));    
}
