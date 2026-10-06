FROM composer:2.8 AS vendor

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

FROM php:8.3-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && docker-php-ext-install pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=vendor /app/vendor ./vendor
COPY . .

RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chmod -R ug+rw storage bootstrap/cache

EXPOSE 8000
CMD ["sh", "docker/start.sh"]
