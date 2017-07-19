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

import metalsmith from 'gulp-metalsmith';
import metalsmithLayouts from 'metalsmith-layouts';
import metalsmithMarkdown from 'metalsmith-markdown';
import metalsmithMatters from 'metalsmith-matters';
import metalsmithCollections from 'metalsmith-collections';
import metalsmithPath from 'metalsmith-paths';
import Handlebars from 'handlebars';
require('./src/helpers/handlebars-helper.js')(Handlebars);

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
                    loader: 'babel-loader'
                }
            ]
        }
    ]
}

// Build the "dist" folder by running all of the below tasks
gulp.task('build',
 gulp.series(clean, gulp.parallel(pages, sass, javascript, images, copy), styleGuide));

// Build the site, run the server, and watch for file changes
gulp.task('default',
  gulp.series('build', server, watch));

function loadConfig(){
    let ymlFile = fs.readFileSync('config.yml', 'utf8');
    return yaml.load(ymlFile);
}

// Delete the "dist" folder
// This happens every time a build starts
function clean(done) {
    rimraf(PATHS.dist, done);
}

// Generate a style guide from the Markdown content and HTML template in styleguide/
function styleGuide(done) {
  sherpa('src/styleguide/index.md', {
    output: PATHS.dist + '/styleguide.html',
    template: 'src/styleguide/template.html'
  }, done);
}

// Copy files out of the assets folder
// This task skips over the "img", "js", and "scss" folders, which are parsed separately
function copy(){
    return gulp.src(PATHS.assets)
               .pipe(gulp.dest(PATHS.dist + '/assets'));
}

// Copy page templates into finished HTML files
function pages() {
  return gulp.src('src/pages/**')
    .pipe(metalsmith({
      // Metalsmith's root directory, for example for locating templates, defaults to CWD 
      root: __dirname,
      // Files to exclude from the build 
      ignore: ['src/*.tmp'],
      // Parsing frontmatter, defaults to true 
      frontmatter: false,
      // Metalsmith plugins to use: 
      source: '/src/pages',
      clean: false,

      destination: '/dist',

      use: [

        metalsmithPath({
          "property": "path"
        }),
        metalsmithMatters({
          '_enable': true,
          'delims': ['---json', '---'],
          'options': {
            'lang': 'json'
          }
        }),
        metalsmithMarkdown({
          '_enable': true,
          'smartypants': true,
          'smartLists': true,
          'gfm': true,
          'tables': true
        }),
        metalsmithLayouts({
          'engine': 'handlebars',
          'directory': 'src/layouts/',
          'partials': 'src/layouts/partials/'
        }),
        metalsmithCollections({
          posts: 'pages/*.md'
        })

      ],
      // Initial Metalsmith metadata, defaults to {} 
      metadata: {
        site_title: 'Sample static site'
      },
      // List of JSON files that contain page definitions 
      // true means "all JSON files", see the section below 
      json: ['src/pages.json']

    }))
    .pipe(gulp.dest(PATHS.dist));
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
