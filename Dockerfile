# Minimal Dockerfile for smoke testing on Render (Web service only)
# - Builds Vite assets (Node 20)
# - Serves Laravel via Apache (PHP 8.2)
# - Includes pdo_pgsql, zip, and common PHP extensions
# NOTE: This image does NOT include raster2pgsql/psql. Use a production Dockerfile later for ingestion jobs.

# ---------- Stage 1: Frontend build ----------
FROM node:20-bullseye-slim AS nodebuild
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
# Avoid failing dependency postinstall scripts during smoke test
ENV NPM_CONFIG_FUND=false \
   NPM_CONFIG_AUDIT=false \
   NPM_CONFIG_IGNORE_SCRIPTS=true
RUN npm ci || npm i

# Copy source required for Vite build
COPY . .

# Build assets (outputs to public/build via laravel-vite-plugin)
RUN npm run build

# ---------- Stage 2: PHP + Apache ----------
FROM php:8.2-apache-bookworm

# System packages and PHP extensions
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    git \
    unzip \
    libpq-dev \
 && docker-php-ext-install pdo_pgsql pgsql \
 && docker-php-ext-enable opcache \
 && rm -rf /var/lib/apt/lists/*

# Enable Apache modules and set DocumentRoot to public/
RUN a2enmod rewrite headers \
 && sed -ri 's!DocumentRoot /var/www/html!DocumentRoot /var/www/html/public!g' /etc/apache2/sites-available/000-default.conf \
 && sed -ri 's!<Directory /var/www/>!<Directory /var/www/html/public/>!g' /etc/apache2/apache2.conf \
 && sed -ri 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf

WORKDIR /var/www/html

# Install Composer (from official image)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Leverage build cache for composer deps
COPY composer.json composer.lock* ./
# Skip composer scripts during build to avoid running artisan before code is copied
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --optimize-autoloader --no-scripts

# Copy application source
COPY . .

# Bring in built frontend assets
COPY --from=nodebuild /app/public/build /var/www/html/public/build
# Copy GeoPackage assets directly from node_modules (postinstall may be skipped)
COPY --from=nodebuild /app/node_modules/@ngageoint/geopackage/dist/geopackage.min.js /var/www/html/public/geopackage.min.js
COPY --from=nodebuild /app/node_modules/@ngageoint/geopackage/dist/sql-wasm.wasm /var/www/html/public/sql-wasm.wasm

# Ensure writable dirs
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Startup script to run migrations on container start (for Render Free, no Pre-Deploy)
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Expose 80 (default for Apache)
EXPOSE 80

# Default command: run migrations then start Apache
CMD ["start.sh"]
