# English_Vocabulary_Trainer

Full-stack vocabulary learning application built with a **NestJS** backend and a **Next.js** frontend to demonstrate scalable architecture, algorithm-driven scheduling, and advanced state management. It is designed as a **customizable learning engine** with scheduling logic, performance analytics, and highly flexible exercise configuration.

⚠️ **Status**: Actively under development. Authentication, word management, the full exercise engine, and the web frontend are functional. Analytics and SRS scheduling are in progress.

---

## 🚀 Project Purpose

The goal of this project is to build a production-ready full-stack system that:

- Implements a structured repetition algorithm (SRS-like scheduling)
- Tracks detailed per-word and per-exercise statistics
- Supports advanced filtering and dynamic query composition
- Handles bulk data import (Excel)
- Maintains scalable and modular architecture

This repository reflects real-world full-stack engineering concerns:
- Domain modeling
- State transitions
- Scheduling logic
- Performance tracking
- Query optimization
- Extensibility

---

## 🏗 Architecture Highlights

- Modular, feature-based structure
- Clear separation of concerns (controller → service → data layer)
- JWT guard–based authentication middleware
- Transaction-based pagination (count + data consistency)
- User-scoped data isolation
- Dynamic query builder with composable filters
- Designed for horizontal scaling
- Redis-ready caching layer
- Swagger-based API documentation
- Unit and E2E testing with Jest

---

## 🧠 Core Features

### 1. Word Management
- Folder-based organization
- Custom word lists
- Multi-language support (English–English, English–Native)
- Multiple meanings per word
- Example sentences
- Word types (noun, verb, phrasal verb, etc.)
- Bulk import via Excel

### 2. Learning Engine
- Per-word statistics:
  - Total asked count
  - Correct / incorrect counts
  - Weekly repetition frequency
  - First-added timestamp
- Learning states:
  - ⭐ Star (temporary boost)
  - 🔁 Keep Learning
  - ✅ Learned (excluded from rotation)
- Customizable repetition logic
- Algorithm-driven scheduling

### 3. Exercise System (Engine Architecture)

Supported / planned multiple exercise types:

- Flash Cards  
- Multiple Choice  
- Sentence-based questions  
- True / False  
- Matching  
- Writing  
- Mixed Test Mode  

Each exercise is configurable via structured **Exercise Settings**:
- Language mode (English–English / English–Native / Random)
- Question type
- Answer type
- Time mode
- Option count (4–10)
- Wrong-answer source control
- Word filtering (Level A1–C2, Star, Keep Learning, etc.)
- Multiple-ask ratio (5:1 logic)

This requires dynamic query generation and composable filtering at the backend level.

### 4. Frontend (Web Application)

A **Next.js (App Router)** web client consumes the API and provides the full learning experience:

- JWT authentication (login / register) with a persisted auth store and silent token refresh
- Dashboard layout with **light / dark theme** and **bilingual UI (English / Turkish)**
- Word management: searchable & paginated word list, bulk delete, bulk "add to list"
- Folders & word lists organization, plus an **Excel import** screen
- Exercise setup page: exercise type, language mode, question/answer formats, option count, word filters, wrong-answer source, time mode, mixed Test mode, and reusable **settings presets**
- Interactive exercise players for every type — Flash Cards (graded or browse), Multiple Choice, Writing, True / False, Find in Sentence — plus a standalone **Matching** grid game
- Per-question feedback (correct answer reveal, typo tolerance hints) and an end-of-session results screen

---

## 🔌 Example API Usage

### Authentication

```http
POST /api/v1/auth/login
```
```json
{
  "email": "user@example.com",
  "password": "securePassword"
}
```

Example Response:
```json
{
    "success": true,
    "data": {
        "accessToken": "jwt-access-token"
    }
}
```

### Get Paginated Words (with Filtering)

Below is an example of the implemented **Word CRUD** endpoints, demonstrating:

- JWT-protected routes
- User-scoped data isolation
- Pagination
- Dynamic filtering (level, partOfSpeech, search)
- Case-insensitive search
- Transaction-based count + data retrieval

```http
GET /api/v1/words?page=1&limit=10&level=B2&partOfSpeech=VERB&search=not
Authorization: Bearer <access_token>
```
Description

Returns a paginated list of words belonging only to the authenticated user.
Supports filtering by:

- level (A1–C2)
- partOfSpeech (NOUN, VERB, ADJECTIVE, etc.)
- search (case-insensitive word match)
- page and limit for pagination

Example Response:
```json
{
  "data": [
    {
      "id": "ckx123abc",
      "word": "notice",
      "level": "B1",
      "partOfSpeech": "VERB",
      "userId": "cku456def",
      "createdAt": "2026-02-10T12:34:56.000Z",
      "updatedAt": "2026-02-10T12:34:56.000Z"
    },
    {
      "id": "ckx789ghi",
      "word": "notify",
      "level": "B2",
      "partOfSpeech": "VERB",
      "userId": "cku456def",
      "createdAt": "2026-02-09T10:21:11.000Z",
      "updatedAt": "2026-02-09T10:21:11.000Z"
    }
  ],
  "meta": {
    "total": 24,
    "page": 1,
    "limit": 10
  }
}
```
This example demonstrates:

- JWT-protected endpoints
- Dynamic filtering logic
- Configurable exercise engine
- Structured session-based workflow

---

## 🛠 Tech Stack

### Backend

- **NestJS** — Modular backend framework
- **PostgreSQL** — Relational database
- **Prisma** — ORM & schema management
- **JWT + bcrypt** — Authentication
- **Redis** — Cache / queue support (planned use)
- **Multer** — File uploads
- **SheetJS (xlsx)** — Excel parsing
- **Swagger** — API documentation
- **Jest** — Testing
- **Socket.IO** — Real-time support (planned use)

### Frontend

- **Next.js (App Router)** — React framework
- **React** — UI library
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **Zustand** — Client state management (persisted store)
- **Axios** — HTTP client
- **React Hook Form + Zod** — Forms & validation

---

## ▶️ Running Locally

### Backend

### 1️⃣ Clone Repository 
```bash
git clone https://github.com/ersinisgor/English_Vocabulary_Trainer.git
cd English_Vocabulary_Trainer/backend/
```
### 2️⃣ Install Dependencies 
```bash
npm install
```
### 3️⃣ Setup Environment Variables
Create your environment file:
```bash
cp .env.example .env
```

Required `.env` Variables
```env
DATABASE_URL=postgresql://user:password@localhost:5432/vocab_db
PORT=3000
NODE_ENV=development

ADMIN_EMAIL=admin@example.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=securePassword

JWT_SECRET=supersecretkey
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

BCRYPT_SALT_ROUNDS=10
```
### 4️⃣ Run Database Migrations
```bash
npx prisma migrate dev
```
### 5️⃣ Seed Initial Admin User

After migrations, create the first admin user:
```bash
npx prisma db seed
```
### 6️⃣ Start Development Server
```bash
npm run start:dev
```

### API will be available at:
```bash
http://localhost:3000
```

### Swagger docs:
```bash
http://localhost:3000/api/docs
```

### Frontend

With the backend running, start the web client in a separate terminal:

### 1️⃣ Install Dependencies
```bash
cd English_Vocabulary_Trainer/frontend/
npm install
```
### 2️⃣ Setup Environment Variables
Point the client at the backend API:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```
### 3️⃣ Start Development Server
```bash
npm run dev
```

### Web app will be available at:
```bash
http://localhost:3001
```

---

## ☁️ Deployment (Vercel + Railway)

- **Backend + PostgreSQL:** Railway (root directory `backend`, config in `backend/railway.json`)
  - Env: `DATABASE_URL` (reference Railway Postgres), `NODE_ENV=production`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`, `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `FRONTEND_URL`
  - Start command runs `prisma migrate deploy` automatically.
- **Frontend:** Vercel (root directory `frontend`)
  - Env: `NEXT_PUBLIC_API_URL=/api/v1`, `BACKEND_URL=https://<your-backend>.up.railway.app`
  - Next.js proxies `/api/v1/*` to the backend, so the refresh cookie stays first-party.

**Live demo:** https://english-vocabulary-trainer-kappa.vercel.app

---

## 🗺 Development Roadmap

- ~~Sprint 0 — Planning & Infrastructure~~ ✅  
- ~~Sprint 1 — Auth + Basic User & Word CRUD & Unit/E2E Tests~~ ✅  
- ~~Sprint 2 — Import & User Word State~~ ✅
- ~~Sprint 3 — Core Exercise Engine (Flash Cards + Multiple Choice) & Frontend~~ ✅
- ~~Sprint 4 — Folders & Word Lists + Advanced Exercise Types (Writing, True/False, Find in Sentence, Matching, Mixed Test) + Filters + Settings Presets~~ ✅
- **Sprint 5 — Analytics & Read Models + SRS Scheduling** 🔄
- **Sprint 6 — Real-Time Improvements**
- **Sprint 7 — Scaling & Reliability**

---

## 📌 Status

Active development.  
Full-stack implementation; analytics & SRS scheduling in progress.

