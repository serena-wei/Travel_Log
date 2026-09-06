# TravelLog

Personal travel journal — private by default, share when you want.

Portfolio remake of a university studio project as a production-style modular monolith: React + TypeScript frontend, Java 21 / Spring Boot 4 REST API, PostgreSQL, and AWS-ready structure.

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Java 21, Spring Boot 4.1, Spring Web MVC, JPA, Flyway |
| Database | PostgreSQL 16 |
| Local infra | Docker Compose |
| CI | GitHub Actions |

## Prerequisites

- JDK 21+
- Node.js 20+
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

Open http://localhost:5173 — the home page should show API health `UP`.

### Auth (in progress)

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

Health endpoint: `GET http://localhost:8080/api/v1/health`

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
backend/     Spring Boot modular monolith
frontend/    React SPA
docker-compose.yml
.github/workflows/ci.yml
```

Domain packages (`user`, `journey`, `event`, …) are introduced in Phase 2.

## Phase roadmap

1. **Phase 1 (current)** — engineering skeleton, health check, CI
2. **Phase 2** — auth (JWT), RBAC, journeys/events MVP
3. **Phase 3** — AWS (RDS, S3, deploy), richer tests
4. **Phase 4** — polish for resume / demo

## License

Private portfolio project unless otherwise stated.
