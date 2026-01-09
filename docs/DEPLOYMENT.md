# 🚀 Deployment Guide

Complete guide for deploying Phong 360 Viewer to production environments.

---

## Table of Contents

1. [Quick Deployment Checklist](#quick-deployment-checklist)
2. [Directory Structure](#directory-structure)
3. [Static Hosting (Recommended)](#static-hosting-recommended)
4. [Traditional Web Servers](#traditional-web-servers)
5. [WordPress Deployment](#wordpress-deployment)
6. [CDN Configuration](#cdn-configuration)
7. [Performance Optimization](#performance-optimization)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Quick Deployment Checklist

Before deploying to production:

- [ ] Build your image library (if using Layer 3)
- [ ] Optimize images (use multiple resolutions: 8K, 4K, 2K)
- [ ] Test on multiple devices/browsers
- [ ] Configure CORS headers (if images on different domain)
- [ ] Enable gzip/brotli compression
- [ ] Set up proper cache headers
- [ ] Test loading times
- [ ] Verify WebGL support detection
- [ ] Check mobile responsiveness

---

## Directory Structure

### Minimal Deployment (Layer 1 Only)

```
your-website/
├── index.html
├── my-360-image.jpg
└── js/
    └── phong-360-viewer-core.js
```

### Full Deployment (All Layers + Library)

```
your-website/
├── index.html
├── core/
│   └── phong-360-viewer-core.js
├── extensions/
│   ├── phong-360-multi-image.js
│   └── phong-360-library-ui.js
├── css/
│   └── styles.css
├── library/
│   ├── library.json
│   ├── _thumbnails/
│   │   ├── image1-thumb.jpg
│   │   └── image2-thumb.jpg
│   ├── _Q50/  (2K images - 2048×1024)
│   │   ├── image1.jpg
│   │   └── image2.jpg
│   ├── _Q75/  (4K images - 4096×2048)
│   │   ├── image1.jpg
│   │   └── image2.jpg
│   └── _Q100/ (8K images - 8192×4096)
│       ├── image1.jpg
│       └── image2.jpg
└── images/
    └── phong-logo.png
```

---

## Static Hosting (Recommended)

The viewer works perfectly on static hosting platforms. No server-side code required!

### Netlify

**Best for**: Simple drag-and-drop deployment

1. **Prepare your files**:
   ```bash
   # Clone the repo
   git clone https://github.com/ansonphong/360-VIEWER.git my-360-site
   cd my-360-site

   # Add your images to library/ folder
   # Build library
   cd library
   python build_library.py
   cd ..
   ```

2. **Deploy**:
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop your folder
   - Done!

3. **Custom Domain** (Optional):
   - Go to Domain settings
   - Add your custom domain
   - Update DNS records

4. **Configure Headers** (`netlify.toml`):
   ```toml
   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "SAMEORIGIN"
       X-XSS-Protection = "1; mode=block"
       X-Content-Type-Options = "nosniff"

   [[headers]]
     for = "/*.jpg"
     [headers.values]
       Cache-Control = "public, max-age=31536000, immutable"

   [[headers]]
     for = "/*.js"
     [headers.values]
       Cache-Control = "public, max-age=31536000, immutable"

   [[headers]]
     for = "/library.json"
     [headers.values]
       Cache-Control = "public, max-age=3600"
   ```

### Vercel

**Best for**: Git-based deployment with automatic updates

1. **Connect Git Repository**:
   ```bash
   # Push your code to GitHub
   git init
   git add .
   git commit -m "Initial deployment"
   git remote add origin https://github.com/yourusername/360-viewer.git
   git push -u origin main
   ```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Click Deploy
   - Vercel auto-detects static site
   - Done!

3. **Configure** (`vercel.json`):
   ```json
   {
     "headers": [
       {
         "source": "/(.*).jpg",
         "headers": [
           {
             "key": "Cache-Control",
             "value": "public, max-age=31536000, immutable"
           }
         ]
       },
       {
         "source": "/(.*).js",
         "headers": [
           {
             "key": "Cache-Control",
             "value": "public, max-age=31536000, immutable"
           }
         ]
       }
     ]
   }
   ```

### GitHub Pages

**Best for**: Free hosting with GitHub

1. **Prepare Repository**:
   ```bash
   git init
   git add .
   git commit -m "Deploy 360 viewer"
   git branch -M main
   git remote add origin https://github.com/yourusername/360-viewer.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to repository Settings
   - Scroll to Pages section
   - Source: Deploy from branch
   - Branch: `main`, folder: `/ (root)`
   - Save

3. **Access Your Site**:
   - URL: `https://yourusername.github.io/360-viewer/`
   - Custom domain: Add CNAME file

### Cloudflare Pages

**Best for**: Global CDN with automatic optimization

1. **Deploy**:
   - Go to [pages.cloudflare.com](https://pages.cloudflare.com)
   - Connect your Git repository
   - Build settings: None (static site)
   - Deploy

2. **Automatic Benefits**:
   - Global CDN
   - Automatic SSL
   - DDoS protection
   - Image optimization (optional)

---

## Traditional Web Servers

### Nginx Configuration

**Best for**: High-performance production servers

1. **Basic Configuration** (`/etc/nginx/sites-available/360-viewer`):
   ```nginx
   server {
       listen 80;
       server_name 360.yourdomain.com;

       root /var/www/360-viewer;
       index index.html;

       # Gzip compression
       gzip on;
       gzip_vary on;
       gzip_min_length 1024;
       gzip_types text/plain text/css text/xml text/javascript
                  application/javascript application/json image/svg+xml;

       # Cache static assets
       location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }

       # Cache library.json for 1 hour
       location = /library/library.json {
           expires 1h;
           add_header Cache-Control "public";
       }

       # CORS headers (if needed)
       location ~* \.(jpg|jpeg|png)$ {
           add_header Access-Control-Allow-Origin "*";
           add_header Access-Control-Allow-Methods "GET, OPTIONS";
           add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept";
       }

       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;

       # SPA fallback (if needed)
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

2. **Enable Site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/360-viewer /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d 360.yourdomain.com
   ```

### Apache Configuration

**Best for**: Shared hosting, traditional setups

1. **VirtualHost Configuration** (`/etc/apache2/sites-available/360-viewer.conf`):
   ```apache
   <VirtualHost *:80>
       ServerName 360.yourdomain.com
       DocumentRoot /var/www/360-viewer

       <Directory /var/www/360-viewer>
           Options -Indexes +FollowSymLinks
           AllowOverride All
           Require all granted
       </Directory>

       # Enable compression
       <IfModule mod_deflate.c>
           AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
       </IfModule>

       # Cache control
       <IfModule mod_expires.c>
           ExpiresActive On
           ExpiresByType image/jpg "access plus 1 year"
           ExpiresByType image/jpeg "access plus 1 year"
           ExpiresByType image/png "access plus 1 year"
           ExpiresByType text/css "access plus 1 year"
           ExpiresByType application/javascript "access plus 1 year"
           ExpiresByType application/json "access plus 1 hour"
       </IfModule>

       ErrorLog ${APACHE_LOG_DIR}/360-viewer-error.log
       CustomLog ${APACHE_LOG_DIR}/360-viewer-access.log combined
   </VirtualHost>
   ```

2. **.htaccess** (Alternative - place in root directory):
   ```apache
   # Enable compression
   <IfModule mod_deflate.c>
       AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
   </IfModule>

   # Browser caching
   <IfModule mod_expires.c>
       ExpiresActive On
       ExpiresByType image/jpg "access plus 1 year"
       ExpiresByType image/jpeg "access plus 1 year"
       ExpiresByType image/png "access plus 1 year"
       ExpiresByType text/css "access plus 1 year"
       ExpiresByType text/javascript "access plus 1 year"
       ExpiresByType application/javascript "access plus 1 year"
   </IfModule>

   # CORS (if needed)
   <IfModule mod_headers.c>
       <FilesMatch "\.(jpg|jpeg|png)$">
           Header set Access-Control-Allow-Origin "*"
       </FilesMatch>
   </IfModule>

   # Security headers
   <IfModule mod_headers.c>
       Header set X-Frame-Options "SAMEORIGIN"
       Header set X-Content-Type-Options "nosniff"
       Header set X-XSS-Protection "1; mode=block"
   </IfModule>
   ```

3. **Enable Modules & Site**:
   ```bash
   sudo a2enmod rewrite expires headers deflate
   sudo a2ensite 360-viewer
   sudo systemctl reload apache2
   ```

---

## WordPress Deployment

See [WORDPRESS-INTEGRATION-PLAN.md](WORDPRESS-INTEGRATION-PLAN.md) for complete guide.

**Quick Steps:**

1. **Add to Theme**:
   ```
   wp-content/themes/your-theme/
   └── assets/
       └── 360-viewer/
           ├── core/
           ├── extensions/
           └── css/
   ```

2. **Enqueue Scripts** (`functions.php`):
   ```php
   function enqueue_360_viewer() {
       wp_enqueue_script('threejs',
           'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
           array(), 'r128', true);

       wp_enqueue_script('phong-360-core',
           get_template_directory_uri() . '/assets/360-viewer/core/phong-360-viewer-core.js',
           array('threejs'), '3.0.0', true);

       wp_enqueue_style('phong-360-css',
           get_template_directory_uri() . '/assets/360-viewer/css/styles.css',
           array(), '3.0.0');
   }
   add_action('wp_enqueue_scripts', 'enqueue_360_viewer');
   ```

3. **Use in Templates**:
   ```php
   <div id="viewer-360" style="width: 100%; height: 70vh;"></div>

   <script>
   new Phong360ViewerCore({
       containerId: 'viewer-360',
       imageUrl: '<?php echo wp_get_attachment_url(get_post_thumbnail_id()); ?>'
   });
   </script>
   ```

---

## CDN Configuration

### Using a CDN for Images

**Best Practice**: Serve large 360° images from a CDN for faster loading worldwide.

1. **Upload Images to CDN**:
   - AWS CloudFront
   - Cloudflare R2
   - Bunny CDN
   - DigitalOcean Spaces

2. **Update Image Paths**:
   ```javascript
   // In your library.json or code
   const CDN_URL = 'https://cdn.yourdomain.com/360-images/';

   const multi = new Phong360MultiImage({
       core: core,
       baseUrl: CDN_URL,
       images: [/* ... */]
   });
   ```

3. **Configure CDN Cache**:
   - Images: Cache for 1 year (immutable)
   - library.json: Cache for 1 hour
   - JS/CSS: Cache for 1 year with versioning

### CloudFlare Setup

1. **Add Site to Cloudflare**
2. **Update DNS**
3. **Configure Page Rules**:
   ```
   *360.yourdomain.com/*.jpg
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 year

   *360.yourdomain.com/library.json
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 hour
   ```

4. **Enable Auto Minify**:
   - CSS ✓
   - JavaScript ✓
   - HTML ✓

---

## Performance Optimization

### 1. Image Optimization

**Before Deployment:**
```bash
# Use the library builder (automatically optimizes)
cd library
python build_library.py

# Or manually with imagemagick
mogrify -strip -quality 85 -resize 4096x2048 *.jpg
```

**Best Practices:**
- 8K (8192×4096): Desktop with good connection
- 4K (4096×2048): Desktop default
- 2K (2048×1024): Mobile default
- Thumbnails (512×256): Library preview
- Use JPG quality 85% (best size/quality ratio)
- Strip EXIF data

### 2. Enable Compression

**Nginx:**
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/javascript application/javascript;
```

**Apache:**
```apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript
</IfModule>
```

### 3. Lazy Loading

For multi-image galleries:
```javascript
const multi = new Phong360MultiImage({
    core: core,
    adaptiveLoading: true,  // ← Automatically selects best resolution
    preloadNext: false      // ← Don't preload until needed
});
```

### 4. Service Worker (Advanced)

Cache the viewer for offline use:

```javascript
// sw.js
const CACHE_NAME = '360-viewer-v1';
const urlsToCache = [
    '/',
    '/core/phong-360-viewer-core.js',
    '/css/styles.css'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
```

---

## Security Best Practices

### 1. Content Security Policy

Add to your HTML `<head>`:
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' https://cdnjs.cloudflare.com 'unsafe-inline';
               img-src 'self' data: https:;
               style-src 'self' 'unsafe-inline';">
```

### 2. CORS Configuration

If images are on a different domain:

**Nginx:**
```nginx
location ~* \.(jpg|jpeg|png)$ {
    add_header Access-Control-Allow-Origin "*";
}
```

**Apache (.htaccess):**
```apache
<FilesMatch "\.(jpg|jpeg|png)$">
    Header set Access-Control-Allow-Origin "*"
</FilesMatch>
```

### 3. Hotlink Protection

Prevent bandwidth theft:

**Nginx:**
```nginx
location ~* \.(jpg|jpeg|png)$ {
    valid_referers none blocked yourdomain.com *.yourdomain.com;
    if ($invalid_referer) {
        return 403;
    }
}
```

**Apache:**
```apache
RewriteEngine on
RewriteCond %{HTTP_REFERER} !^$
RewriteCond %{HTTP_REFERER} !^http(s)?://(www\.)?yourdomain.com [NC]
RewriteRule \.(jpg|jpeg|png)$ - [F]
```

---

## Troubleshooting

### Images Not Loading

**Check:**
1. File paths are correct (case-sensitive on Linux)
2. CORS headers if on different domain
3. File permissions (644 for files, 755 for directories)
4. Browser console for errors (F12)

**Test CORS:**
```bash
curl -I https://yourdomain.com/image.jpg
# Look for: Access-Control-Allow-Origin header
```

### WebGL Not Working

**Solution:**
Add fallback detection:
```javascript
if (!window.WebGLRenderingContext) {
    alert('WebGL not supported. Please use a modern browser.');
}
```

### Slow Loading

**Optimize:**
1. Reduce image sizes (use 4K instead of 8K for most users)
2. Enable CDN
3. Use adaptive loading
4. Check network throttling in DevTools
5. Optimize library.json size

### Mobile Issues

**Check:**
1. Viewport meta tag present
2. Touch events enabled
3. Images sized appropriately (2K for mobile)
4. Test on real devices, not just emulators

---

## Deployment Examples

### Example 1: Personal Portfolio (GitHub Pages)

```bash
git clone https://github.com/ansonphong/360-VIEWER.git my-portfolio
cd my-portfolio
# Add your 360 images
git add .
git commit -m "Deploy portfolio"
git push origin main
# Enable GitHub Pages in repo settings
```

**URL**: `https://username.github.io/my-portfolio/`

### Example 2: Client Site (Netlify)

```bash
# Prepare site
cp -r 360-VIEWER client-site
cd client-site
# Customize, add images
netlify deploy --prod
```

### Example 3: High-Traffic Site (AWS S3 + CloudFront)

```bash
# Build site
cd 360-VIEWER
# Optimize images
cd library && python build_library.py && cd ..

# Upload to S3
aws s3 sync . s3://your-bucket-name/ --acl public-read

# Create CloudFront distribution
# Point to S3 bucket
# Enable gzip compression
# Set cache TTLs
```

---

## Post-Deployment Checklist

After deployment:

- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices (iOS, Android)
- [ ] Check loading times (aim for < 3 seconds)
- [ ] Verify images load correctly
- [ ] Test all controls (mouse, touch, keyboard)
- [ ] Check console for errors
- [ ] Test on slow 3G connection
- [ ] Verify SSL certificate
- [ ] Check SEO meta tags
- [ ] Test accessibility (keyboard navigation)
- [ ] Monitor bandwidth usage

---

## Getting Help

If you encounter deployment issues:

1. Check browser console (F12) for errors
2. Verify file paths and permissions
3. Test CORS with curl
4. Review server logs
5. Open an issue on [GitHub](https://github.com/ansonphong/360-VIEWER/issues)

---

**Version**: 3.0.0
**Last Updated**: January 2026
**See Also**: [QUICKSTART.md](QUICKSTART.md), [WORDPRESS-INTEGRATION-PLAN.md](WORDPRESS-INTEGRATION-PLAN.md)






