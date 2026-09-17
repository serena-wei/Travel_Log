# TravelLog

TravelLog is a full-stack travel journaling app. Travellers keep private journeys and events (with photos), optionally share journeys publicly, and browse other people’s public trips on Explore. Editors and admins get simple role-based dashboards after login.

This repo is a learning / portfolio project: React + TypeScript on the frontend, Java 21 + Spring Boot on the backend, PostgreSQL for data, optional S3 for images, JWT auth, and Flyway migrations.

## Features

- **Auth** — register / login with JWT; roles: `TRAVELLER`, `EDITOR`, `ADMIN`
- **My journeys** — create, edit, delete journeys; optional public visibility; search by title or description
- **Events** — timeline entries under a journey (title, description, happened-at); create / edit / delete
- **Photos** — up to 9 images per event via S3 presigned upload (replace / delete supported)
- **Explore** — browse public journeys (paginated), search by title or description, open read-only detail; cover image = first photo on the journey; owner avatar shown when set
- **Moderation** — editors/admins can hide (or unhide) a public journey so it no longer appears on Explore for travellers
- **Profile** — update display name / password; upload / remove avatar (S3)
- **Dashboard** — post-login home by role (traveller / editor / admin)

Without S3 env vars, the API still runs using a fake object-storage stub (URLs won’t load real images).

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router |
| Backend | Java 21, Spring Boot 3.5, Spring Security, Spring Data JPA |
| Database | PostgreSQL 16 + Flyway |
| Auth | JWT (Bearer), BCrypt passwords |
| Images | AWS S3 (presigned PUT) when configured |
| Tests | Vitest + Testing Library (frontend), JUnit (backend) |

## Quick start (local)

### Prerequisites

- Node.js 20+
- Java 21+
- Docker (for Postgres)

### 1. Postgres

```bash
docker compose up -d
```

Defaults: database / user / password = `travellog` on port `5432`.

### 2. Backend

```bash
cd backend
./mvnw spring-boot:run
```

API: `http://localhost:8080`  
Health: `GET /api/v1/health`

**Optional — real photos / avatars (S3)**  
Copy `.env.example` → `.env` at the repo root, fill in bucket / region / AWS keys, then start the backend with those vars loaded, e.g.:

```bash
set -a && source ../.env && set +a   # from backend/, if .env is at repo root
./mvnw spring-boot:run
```

Required vars when using S3: `TRAVELLOG_S3_BUCKET`, `TRAVELLOG_S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local   # VITE_API_BASE_URL=http://localhost:8080
npm install
npm run dev
```

App: `http://localhost:5173`

### 4. Smoke check

1. Open `/`, register a traveller, land on `/dashboard`
2. Create a journey → add an event → upload photos (needs S3)
3. Mark a journey public → open **Explore** → search / paginate / open detail
4. Update profile name / avatar under **Profile**

## Frontend routes

| Path | Access | Notes |
| --- | --- | --- |
| `/` | Public | Landing |
| `/login`, `/register` | Public | Auth |
| `/dashboard` | Auth | Role-based home |
| `/profile` | Auth | Name + avatar; change password via `/profile/password` |
| `/journeys` | Auth | My journeys (+ search) |
| `/journeys/new`, `/journeys/:id`, `.../edit` | Auth | Journey CRUD |
| `/journeys/:id/events/...` | Auth | Event CRUD + photos |
| `/explore` | Auth | Public journeys (page size 10, `query` search) |
| `/explore/:id`, `/explore/.../events/...` | Auth | Read-only public detail |

Authenticated pages use a shared header (logo, nav, avatar menu). Confirm dialogs are portaled to `document.body` so they aren’t clipped by overflow.

## API overview

Base path: `/api/v1`

| Area | Endpoints (summary) |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /auth/register`, `POST /auth/login` |
| User | `GET /users/current`, `PATCH /users/current`, `PUT /users/current/password`, avatar `POST .../avatar/presign`, `DELETE .../avatar` |
| Journeys (own) | `GET /journeys?query=`, `POST /journeys`, `GET/PUT/DELETE /journeys/{id}` |
| Public journeys | `GET /public/journeys?page=&size=&query=` → `PageResponse` (excludes hidden) |
| Moderation | `POST /moderation/journeys/{id}/hide`, `POST /moderation/journeys/{id}/unhide` (EDITOR/ADMIN only) |
| Events | under `/journeys/{journeyId}/events` |
| Photos | under `.../events/{eventId}/photos` (presign, replace, delete) |

Notes:

- `query` matches **title or description** (case-insensitive). Empty / omitted `query` returns the full list (or page).
- Public list default: `page=0`, `size=10`. Response shape: `content`, `page`, `size`, `totalElements`, `totalPages`.
- Journey responses may include `coverImageUrl`, `ownerAvatarUrl`, and `hidden` (moderation flag; Explore only lists `visibility=PUBLIC` and `hidden=false`).
- Hiding does **not** change the owner’s visibility setting; it only removes the journey from Explore for travellers. Owners still see their own journeys. Editors/admins can still open a hidden public journey.

## Project layout

```text
Travel_Log/
├── backend/                 # Spring Boot API
│   └── src/main/resources/db/migration/   # Flyway V1–V8
├── frontend/                # Vite + React app
├── docker-compose.yml       # Local Postgres
├── .env.example             # Env template (no secrets)
└── README.md
```

## Tests

```bash
# Frontend
cd frontend && npm test

# Backend
cd backend && ./mvnw test
```

## Roadmap

**Done**

- Auth (register / login / JWT / roles)
- Journeys + events CRUD
- Event photos (S3 presign) + journey cover from first photo
- Public Explore (list, detail, pagination, title/description search)
- My journeys search
- Profile (display name + avatar + change password)
- Role dashboards + shared app chrome
- Editor/admin hide (and unhide) public journeys from Explore

**Next**

- Hardening / polish for AWS deploy (RDS, EC2/API, S3, CloudFront, CORS, secrets)
- Optional: richer Explore filters, editor/admin moderation UI beyond the API

## License

Private / personal project — not published as open source unless you add a license later.
