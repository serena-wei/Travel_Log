# TravelLog

Personal travel journal — private by default, share when you want.

Portfolio remake of a university studio project as a production-style modular monolith: React + TypeScript frontend, Java 21 / Spring Boot 4 REST API, PostgreSQL, and AWS-ready structure.

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Java 21, Spring Boot 4.1, Spring Web MVC, Spring Security, JPA, Flyway |
| Auth | JWT Bearer (`sub` = user id) |
| Database | PostgreSQL 16 |
| Local infra | Docker Compose |
| CI | GitHub Actions |

## Prerequisites

- JDK 21+
- Node.js 22+ (matches CI)
- Docker Desktop (Compose + Testcontainers)

## Quick start

```bash
# 1. Database
docker compose up -d

# 2. Backend (port 8080)
cd backend
./mvnw spring-boot:run

# 3. Frontend (port 5173)
cd ../frontend
cp ../.env.example .env.local   # optional; defaults already point at localhost:8080
npm install
npm run dev
```

Open http://localhost:5173 — register or sign in, then use **Journeys**. The home footer shows API health `UP` when the backend is running.

If port `5432` is already taken by a local Postgres, stop that service or change the Compose port mapping before starting.

## What works today

### Frontend routes

| Path | Notes |
|------|--------|
| `/` | Marketing home |
| `/register`, `/login` | Auth forms; login lands on `/journeys` |
| `/journeys` | List; open detail, or Edit / Delete |
| `/journeys/new` | Create journey |
| `/journeys/:id` | Read-only journey + events timeline |
| `/journeys/:id/edit` | Edit journey details |
| `/journeys/:journeyId/events/new` | Create event |
| `/journeys/:journeyId/events/:eventId` | Read-only event + photos |
| `/journeys/:journeyId/events/:eventId/edit` | Edit event details |

### API (v1)

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/v1/health` | no |
| `POST` | `/api/v1/auth/register` | no |
| `POST` | `/api/v1/auth/login` | no |
| `GET` | `/api/v1/users/current` | Bearer |
| `GET/POST` | `/api/v1/journeys` | Bearer |
| `GET/PUT/DELETE` | `/api/v1/journeys/{id}` | Bearer (owner only) |
| `GET/POST` | `/api/v1/journeys/{journeyId}/events` | Bearer (journey owner) |
| `GET/PUT/DELETE` | `/api/v1/journeys/{journeyId}/events/{eventId}` | Bearer (journey owner) |
| `POST` | `/api/v1/journeys/{journeyId}/events/{eventId}/photos/presign` | Bearer (journey owner) |
| `POST` | `/api/v1/journeys/{journeyId}/events/{eventId}/photos/{photoId}/presign-replace` | Bearer (journey owner) |
| `DELETE` | `/api/v1/journeys/{journeyId}/events/{eventId}/photos/{photoId}` | Bearer (journey owner) |

Journeys default to `PRIVATE`. Missing or non-owned journeys return `404` with `JOURNEY_NOT_FOUND`. Events include title, description, start/end time, and up to **10 photos** (JPEG/PNG/WebP, 5MB each) via S3 presigned upload. Missing events return `EVENT_NOT_FOUND`. Event edit supports adding, replacing, and deleting photos.

### S3 photos (local)

Export before starting the backend (values from your IAM user / bucket):

```bash
export TRAVELLOG_S3_BUCKET=travellog-photos-serena
export TRAVELLOG_S3_REGION=ap-southeast-2
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
```

Without `TRAVELLOG_S3_BUCKET`, the API still starts and uses a fake storage stub (CI-safe); browser uploads to real S3 need the exports above plus bucket CORS for `http://localhost:5173`.

### Auth examples

Register:

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "Secret123",
    "confirmPassword": "Secret123"
  }'
```

Login:

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "alice",
    "password": "Secret123"
  }'
```

Current user / journeys (replace `TOKEN`):

```bash
curl -s http://localhost:8080/api/v1/users/current \
  -H "Authorization: Bearer TOKEN"

curl -s http://localhost:8080/api/v1/journeys \
  -H "Authorization: Bearer TOKEN"
```

## Tests

```bash
# Backend (requires Docker for Testcontainers; tests are skipped if Docker is unavailable)
cd backend && ./mvnw test

# Frontend
cd frontend && npm test && npm run build
```

Install and start [Docker Desktop](https://www.docker.com/products/docker-desktop/) before running backend tests or `docker compose up`.

## Repository layout

```text
backend/                 Spring Boot modular monolith
  src/main/java/.../user
  src/main/java/.../journey
  src/main/java/.../security
frontend/                React SPA (pages, auth, api client)
docker-compose.yml
.github/workflows/ci.yml
```

## Phase roadmap

1. **Phase 1** — engineering skeleton, health check, CI *(done)*
2. **Phase 2** — JWT auth + journey/event CRUD (API + UI) *(done)*; event photo upload to S3 *(in progress)*
3. **Phase 3** — AWS deploy (RDS, app host), richer tests; photo edit/delete polish
4. **Phase 4** — polish for resume / demo

## License

Private portfolio project unless otherwise stated.
