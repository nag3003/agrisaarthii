const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist');
const indexPath = path.join(distPath, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('index.html not found in dist');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// 0. Inject Base Tag (CRITICAL for GitHub Pages Subdirectory)
// For local development on localhost:8090, we don't need a base path.
// For production on GitHub Pages (/agrisaarthii/), we do.
// We detect if we should use the base path by checking if we are in a 'deploy' context or specific flag
const USE_SUBPATH = process.argv.includes('--use-subpath') || process.env.USE_SUBPATH === 'true';
const BASE_URL = USE_SUBPATH ? '/agrisaarthii' : '';

if (!html.includes('<base href') && BASE_URL) {
  html = html.replace('<head>', `<head><base href="${BASE_URL}/" />`);
}

// Ensure all assets use the correct path
if (!USE_SUBPATH) {
  // If not using subpath, strip it from all hardcoded links/scripts
  html = html.split('/agrisaarthii/').join('/');
}

// 1. Inject Error Handler (Always first to catch early errors)
const errorHandler = `
<script>
  window.addEventListener('error', function(e) {
    const root = document.getElementById('root');
    if (!root) return;
    
    // Check if it's a script loading error
    if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
       // Ignore for now or log quietly
       console.warn('Asset Load Error:', e.target.src || e.target.href);
       return;
    }

    // Runtime Error
    if (e.message) {
      console.error('Runtime Error:', e.message);
    }
  }, true);
</script>
`;
html = html.replace('</body>', errorHandler + '</body>');

// 2. Inject Simple Loading UI (White background)
const loadingSpinner = `<div id="root" style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;font-size:18px;font-family:system-ui;background-color:white;">
  <div style="font-size:40px;margin-bottom:20px;">🚜</div>
  <div>Loading AgriSaarthii...</div>
</div>`;

html = html.replace('<div id="root"></div>', loadingSpinner);

// 3. Inject Global CSS for React Native Web Layout (Minimal)
const styleFix = `
<style>
  html, body {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden; /* Let RN handle scrolling */
    background-color: white;
  }
  #root {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
  }
</style>
`;
html = html.replace('</head>', styleFix + '</head>');

// 4. Inject cache busting for scripts
html = html.replace(/(src=".*\/_expo\/static\/js\/web\/.*?)(")/g, '$1?v=' + Date.now() + '$2');

// 5. SPA Redirect Handling for GitHub Pages
// This solves the issue where refreshing a sub-route causes a 404
const spaRedirectScript = `
<script type="text/javascript">
  // Single Page Apps for GitHub Pages
  // MIT License
  // https://github.com/rafgraph/spa-github-pages
  (function(l) {
    if (l.search[1] === '/' ) {
      var decoded = l.search.slice(1).split('&').map(function(s) { 
        return s.replace(/~and~/g, '&') 
      }).join('?');
      window.history.replaceState(null, null,
          l.pathname.slice(0, -1) + decoded + l.hash
      );
    }
  }(window.location))
</script>
`;
html = html.replace('<head>', '<head>' + spaRedirectScript);

fs.writeFileSync(indexPath, html);
console.log('Post-export processing complete: Injected base tag, error handler, loading UI, CSS fixes, and SPA redirect script.');

// 6. Generate a smart 404.html for SPA redirection
const notFoundHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
    <script>
      // Checks if the URL contains the repo name (subdirectory)
      // For username.github.io, set to 0. For repo-name, set to 1.
      var pathSegmentsToKeep = 1;
      
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?p=/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&q=' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body>
  </body>
</html>`;

const notFoundPath = path.join(distPath, '404.html');
fs.writeFileSync(notFoundPath, notFoundHtml);
console.log('Generated smart 404.html for SPA routing.');
