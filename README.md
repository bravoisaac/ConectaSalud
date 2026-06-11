# Salut App

Salut App es una plataforma web y movil para conectar usuarios, profesionales de salud y empresas. El proyecto combina una app Ionic/Angular con una API Laravel protegida con Sanctum.

## Capturas

**Acceso**

| Inicio de sesion | Registro |
| --- | --- |
| ![Pantalla de login](docs/images/login.png) | ![Pantalla de registro](docs/images/registro.png) |

**App autenticada**

| Empleos | Servicios de salud |
| --- | --- |
| ![Pantalla de empleos](docs/images/jobs.jpg) | ![Pantalla de servicios de salud](docs/images/health.jpg) |

| Reservas | Propuestas | Perfil |
| --- | --- | --- |
| ![Pantalla de reservas](docs/images/health-bookings.jpg) | ![Pantalla de propuestas](docs/images/my-proposals.jpg) | ![Pantalla de perfil](docs/images/profile.jpg) |

## Funcionalidades

- Registro e inicio de sesion de usuarios.
- Roles para usuario, profesional de salud, empresa y administrador.
- Perfil personal y perfil profesional de salud.
- Publicacion, busqueda y postulacion a empleos.
- Gestion de servicios de salud y reservas.
- Chat, comentarios, likes, reportes, verificaciones y pagos.
- API REST con autenticacion por Laravel Sanctum.

## Tecnologias

**Frontend**

- Angular 20
- Ionic 8
- TypeScript
- SCSS
- Capacitor

**Backend**

- PHP 8.2+
- Laravel 12
- Laravel Sanctum
- MySQL

## Estructura del proyecto

```text
Salut_app/
+-- Backend/
|   +-- api/                 # API Laravel
+-- Frontend/
|   +-- Modelos/             # Documentacion/modelado
|   +-- salutapp/            # App Ionic + Angular
+-- docs/
|   +-- images/              # Imagenes usadas en este README
+-- tools/
+-- README.md
```

## Instalacion

### 1. Backend

```bash
cd Backend/api
composer install
cp .env.example .env
php artisan key:generate
```

Configura la base de datos en `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=salutapp
DB_USERNAME=root
DB_PASSWORD=
```

Ejecuta migraciones y datos de prueba:

```bash
php artisan migrate
php artisan db:seed
```

Inicia la API:

```bash
php artisan serve
```

Por defecto, la API queda disponible en `http://localhost:8000/api`.

### 2. Frontend

```bash
cd Frontend/salutapp
npm install
npm run start
```

La app Angular queda disponible normalmente en `http://localhost:4200`.

El frontend usa esta URL de API en desarrollo:

```ts
apiBase: 'http://localhost:8000/api'
```

## Rutas principales

**Frontend**

- `/login`
- `/register`
- `/admin`
- `/app/jobs`
- `/app/jobs/new`
- `/app/jobs/:id`
- `/app/health`
- `/app/health-bookings`
- `/app/my-proposals`
- `/app/profile`

**API**

- `POST /api/register`
- `POST /api/login`
- `GET /api/me`
- `POST /api/logout`
- `/api/jobs`
- `/api/job-applications`
- `/api/health/profiles`
- `/api/health/bookings`
- `/api/posts`
- `/api/chats`
- `/api/profile`

## Scripts utiles

Frontend:

```bash
npm run start
npm run build
npm run test
npm run lint
```

Backend:

```bash
php artisan serve
php artisan migrate
php artisan db:seed
php artisan test
```

## Estado

Proyecto en desarrollo activo.

## Autor

Isaac Daniel Bravo Melo  
Ingeniero en Informatica  
Concepcion, Chile  
[isaacbravo1431@gmail.com](mailto:isaacbravo1431@gmail.com)
