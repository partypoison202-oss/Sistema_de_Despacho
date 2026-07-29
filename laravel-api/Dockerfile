FROM php:8.4-cli-alpine

# Instalar dependencias del sistema y librerías de desarrollo para PHP
RUN apk add --no-cache \
    postgresql-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    curl \
    netcat-openbsd

# Configurar e instalar extensiones de PHP requeridas por Laravel y PostgreSQL
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install pdo pdo_pgsql pgsql gd zip bcmath

# Copiar Composer desde la imagen oficial
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Directorio de trabajo
WORKDIR /var/www/html

# Copiar archivos de dependencias e instalar composer
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-scripts --prefer-dist || composer install --no-interaction --prefer-dist

# Copiar resto del código fuente del proyecto
COPY . .

# Permisos para storage y bootstrap/cache
RUN chmod -R 777 storage bootstrap/cache \
 && chmod +x docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/var/www/html/docker-entrypoint.sh"]
