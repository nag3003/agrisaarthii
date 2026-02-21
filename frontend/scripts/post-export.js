const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist');
const indexPath = path.join(distPath, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('index.html not found in dist');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// 1. Inject Error Handling Script
const errorScript = `
<script>
  window.addEventListener('error', function(e) {
    const root = document.getElementById('root');
    if (!root) return;
    
    // Check if it's a script loading error
    if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
      root.innerHTML = '<div style="padding:20px;color:red;font-family:monospace"><h3>Asset Load Error</h3><p>Failed to load: ' + (e.target.src || e.target.href) + '</p><p>BaseURI: ' + document.baseURI + '</p></div>';
      return;
    }
    
    // Runtime Error
    if (e.message) {
      root.innerHTML += '<div style="padding:20px;color:red;font-family:monospace;border-top:1px solid #ccc"><h3>Runtime Error</h3><p>' + e.message + '</p></div>';
    }
  }, true);
  
</script>
`;

// Insert invalidating text to be sure we are seeing new version
const loadingSpinner = `<div id="root" style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;font-size:18px;font-family:system-ui;">
  <div style="font-size:40px;margin-bottom:20px;">🚜</div>
  <div>Loading Agri... (v2)</div>
  <div style="font-size:12px;color:#666;margin-top:10px;">Initializing...</div>
</div>`;

// Replace root div
html = html.replace('<div id="root"></div>', loadingSpinner);

// Insert error script before closing body
html = html.replace('</body>', errorScript + '</body>');

// Ensure base tag is correct if needed, or rely on bundle paths.
// Since we are using experiments.baseUrl, we don't need to manually fix src paths usually.
// But let's verify if we want to force them.
// html = html.replace(/src="\//g, 'src="/agrisaarthii/'); // Double check we don't double prefix if baseUrl works

// 4. Inject Global CSS for React Native Web Layout
const styleFix = `
<style>
  html, body, #root {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
    display: flex; /* Critical for flex: 1 to work */
    flex-direction: column;
  }
  /* Ensure no scrollbars on body, let RN handle scrolling */
    body {
      overflow: hidden;
      background-color: #8aeebcff; /* Match app background */
    }
  </style>
`;
html = html.replace('</head>', styleFix + '</head>');

// 5. Fix asset paths for GitHub Pages subdirectory
// With baseUrl: '/agrisaarthii' in app.json, paths are already absolute (/agrisaarthii/...)
// We only need to fix favicon if it's not handled correctly
// html = html.replace(/src="\//g, 'src="');
// html = html.replace(/href="\/favicon.ico"/g, 'href="favicon.ico"');

// Inject cache busting for scripts
// html = html.replace(/(src=".*\/_expo\/static\/js\/web\/.*?)(")/g, '$1?v=' + Date.now() + '$2');

// 6. SPA Redirect Handling for GitHub Pages
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
console.log('Post-export processing complete: Injected error handler, loading UI, and SPA redirect script.');

// 7. Generate a smart 404.html for SPA redirection
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
