# Panduan Konfigurasi dan Menjalankan OmahTI Internship

Dokumen ini berisi panduan lengkap mengenai konfigurasi file environment (.env) dan langkah-langkah untuk menjalankan aplikasi OmahTI Internship.

## Daftar Isi

  - [Konfigurasi File Environment (.env)](#konfigurasi-file-environment-env)
  - [Root .env](#root-env)
  - [Frontend .env](#frontend-env)
  - [Auth Service .env](#auth-service-env)
  - [Meeting Service .env](#meeting-service-env)
  - [Training Service .env](#training-service-env)
  - [Presence Service .env](#presence-service-env)
  - [Progress Service .env](#progress-service-env)
  - [Aspirasi Service .env](#aspirasi-service-env)
  - [Email Service .env](#email-service-env)
  - [Menjalankan Aplikasi](#menjalankan-aplikasi)
  - [Menggunakan Docker](#menggunakan-docker)
  - [Pengembangan Lokal](#pengembangan-lokal)
  - [Endpoint API](#endpoint-api)
  - [Troubleshooting](#troubleshooting)

## Konfigurasi File Environment (.env)

### Root .env

Buat file `.env` di direktori root (`otiinternship-fix/product/`):

```
# Database Configuration
POSTGRES_USER=
POSTGRES_PASSWORD=

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# API Gateway
API_GATEWAY_PORT=8000
GATEWAY_SECRET=yoursecretkey
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRY=24h

# Service Ports
AUTH_SERVICE_PORT=8001
MEETING_SERVICE_PORT=8002
EMAIL_SERVICE_PORT=8003
TRAINING_SERVICE_PORT=8004
ASPIRASI_SERVICE_PORT=8005
PRESENCE_SERVICE_PORT=8006
PROGRESS_SERVICE_PORT=8007

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=adminpassword
ADMIN_API_KEY=admin-api-key

# Node Environment
NODE_ENV=production
```

### Frontend .env

Buat file `.env.local` di direktori frontend (`otiinternship-fix/product/frontend/`):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Auth Service .env

Buat file `.env` di direktori auth-service (`otiinternship-fix/product/backend/auth-service/`):

```
PORT=8001
DATABASE_URL=postgres://${USER}:${PASSWORD}@${DB_CONTAINER_NAME}:5432/${DB_SERVICE_NAME}?sslmode=disable
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRY=24h
GATEWAY_SECRET=yoursecretkey
FRONTEND_URL=http://localhost:3000
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redispassword
ADMIN_API_KEY=admin-api-key
NODE_ENV=production
```

### Meeting Service .env

Buat file `.env` di direktori meeting-service (`otiinternship-fix/product/backend/meeting-service/`):

```
PORT=8002
DATABASE_URL=postgres://${USER}:${PASSWORD}@${DB_CONTAINER_NAME}:5432/${DB_SERVICE_NAME}?sslmode=disable
JWT_SECRET=your-jwt-secret-key
GATEWAY_SECRET=yoursecretkey
FRONTEND_URL=http://localhost:3000
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redispassword
ADMIN_USERNAME=admin
ADMIN_PASSWORD=adminpassword
ADMIN_API_KEY=admin-api-key
NODE_ENV=production
```

### Training Service .env

Buat file `.env` di direktori training-service (`otiinternship-fix/product/backend/training-service/`):

```
PORT=8004
DATABASE_URL=postgres://${USER}:${PASSWORD}@${DB_CONTAINER_NAME}:5432/${DB_SERVICE_NAME}?sslmode=disable
JWT_SECRET=your-jwt-secret-key
GATEWAY_SECRET=yoursecretkey
FRONTEND_URL=http://localhost:3000
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redispassword
ADMIN_USERNAME=admin
ADMIN_PASSWORD=adminpassword
ADMIN_API_KEY=admin-api-key
EMAIL_SERVICE_URL=http://email-service:8003
NODE_ENV=production
```

### Presence Service .env

Buat file `.env` di direktori presence-service (`otiinternship-fix/product/backend/presence-service/`):

```
PORT=8006
DATABASE_URL=postgres://${USER}:${PASSWORD}@${DB_CONTAINER_NAME}:5432/${DB_SERVICE_NAME}?sslmode=disable
JWT_SECRET=your-jwt-secret-key
GATEWAY_SECRET=yoursecretkey
FRONTEND_URL=http://localhost:3000
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redispassword
QR_CODE_SECRET=your-qr-code-secret
QR_CODE_EXPIRY=10 # minutes
ADMIN_API_KEY=admin-api-key
NODE_ENV=production
```

### Progress Service .env

Buat file `.env` di direktori progress-service (`otiinternship-fix/product/backend/progress-service/`):

```
PORT=8007
DATABASE_URL=postgres://${USER}:${PASSWORD}@${DB_CONTAINER_NAME}:5432/${DB_SERVICE_NAME}?sslmode=disable
JWT_SECRET=your-jwt-secret-key
GATEWAY_SECRET=yoursecretkey
FRONTEND_URL=http://localhost:3000
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redispassword
AUTH_SERVICE_URL=http://auth-service:8001
PRESENCE_SERVICE_URL=http://presence-service:8006
ADMIN_API_KEY=admin-api-key
NODE_ENV=production
```

### Aspirasi Service .env

Buat file `.env` di direktori aspirasi-service (`otiinternship-fix/product/backend/aspirasi-service/`):

```
PORT=8005
DATABASE_URL=postgres://${USER}:${PASSWORD}@${DB_CONTAINER_NAME}:5432/${DB_SERVICE_NAME}?sslmode=disable
JWT_SECRET=your-jwt-secret-key
GATEWAY_SECRET=yoursecretkey
FRONTEND_URL=http://localhost:3000
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redispassword
ADMIN_API_KEY=admin-api-key
NODE_ENV=production
```

### Email Service .env

Buat file `.env` di direktori email-service (`otiinternship-fix/product/backend/email-service/`):

```
PORT=8003
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/email_db
JWT_SECRET=your-jwt-secret-key
GATEWAY_SECRET=yoursecretkey
FRONTEND_URL=http://localhost:3000
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redispassword

# Email Configuration
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD
EMAIL_FROM=

ADMIN_API_KEY=admin-api-key
NODE_ENV=production
```

## Menjalankan Aplikasi Backend

### Menggunakan Docker

1. Buka terminal dan navigasi ke direktori root proyek:
   ```bash
   cd path/to/otiinternship-fix
   ```

2. Masuk ke direktori `product`:
   ```bash
   cd product
   ```

3. Pastikan semua file `.env` telah dibuat sesuai instruksi di atas.

4. Build dan jalankan seluruh layanan menggunakan Docker Compose:
    ```bash
   docker-compose build
   ```

   ```bash
   docker-compose up -d
   ```
   Opsi `-d` akan menjalankan kontainer di background.

5. Untuk melihat logs dari semua kontainer:
   ```bash
   docker-compose logs -f
   ```
   atau untuk layanan tertentu:
   ```bash
   docker-compose logs -f [service-name]
   ```
   contoh: `docker-compose logs -f frontend`

6. Untuk menghentikan seluruh layanan:
   ```bash
   docker-compose down
   ```

### Pengembangan Lokal

Jika ingin menjalankan layanan secara individual untuk pengembangan:

#### Frontend

```bash
cd product/frontend
npm install
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`.

Ganti `[service-name]` dengan nama layanan yang ingin dijalankan, seperti `auth-service`, `meeting-service`, dll.

## Endpoint API

Berikut adalah endpoint API yang tersedia:

- **Auth Service**: `http://localhost:8001/api/auth`
- **Meeting Service**: `http://localhost:8002/api/meetings`
- **Training Service**: `http://localhost:8004/api/training`
- **Progress Service**: `http://localhost:8007/api/progress`
- **Presence Service**: `http://localhost:8006/api/presence`
- **Aspirasi Service**: `http://localhost:8005/api/aspirasi`

atau melalui API Gateway:

- **API Gateway**: `http://localhost:8000/api/{serviceName}`

Health check endpoint tersedia untuk semua layanan di `/health` dan `/health/light`.

## Troubleshooting

### Masalah Koneksi Database

Jika terjadi masalah koneksi ke database:

1. Pastikan container postgres berjalan:
   ```bash
   docker ps | grep postgres
   ```

2. Periksa logs database:
   ```bash
   docker-compose logs postgres
   ```

3. Coba reset database container:
   ```bash
   docker-compose down
   docker volume rm $(docker volume ls -q | grep postgres)
   docker-compose up -d
   ```

### Masalah Port Sudah Digunakan

Jika mendapat error "port is already in use":

1. Temukan proses yang menggunakan port tersebut:
   ```bash
   # Windows
   netstat -ano | findstr :<PORT>
   
   # Linux/Mac
   lsof -i :<PORT>
   ```

2. Hentikan proses tersebut atau ubah port di file `.env`.

### Container Tidak Berjalan

Jika container tidak berjalan dengan benar:

1. Periksa status container:
   ```bash
   docker-compose ps
   ```

2. Periksa logs untuk error:
   ```bash
   docker-compose logs [service-name]
   ```

3. Rebuild container:
   ```bash
   docker-compose build [service-name]
   docker-compose up -d [service-name]
   ```

### Login Default

Kredensial default untuk login:

1. Akun Kadiv HD:
   - Email: admin@gmail.com
   - Password: admin123

2. Akun Staff:
   - Email: staff@gmail.com
   - Password: staff123