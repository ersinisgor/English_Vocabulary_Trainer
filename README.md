# English_Vocabulary_Trainer

Backend-focused vocabulary learning engine built with **NestJS** to demonstrate scalable architecture, algorithm-driven scheduling, and advanced state management. It is designed as a **customizable learning engine** with scheduling logic, performance analytics, and highly flexible exercise configuration.

⚠️ **Status**: Actively under development. Core authentication and word management modules are production-ready. Exercise engine and advanced scheduling are in progress.

---

## 🚀 Project Purpose

The goal of this project is to build a production-ready backend system that:

- Implements a structured repetition algorithm (SRS-like scheduling)
- Tracks detailed per-word and per-exercise statistics
- Supports advanced filtering and dynamic query composition
- Handles bulk data import (Excel)
- Maintains scalable and modular architecture

This repository reflects real-world backend engineering concerns:
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
- **Redis** — Cache / queue support
- **Multer** — File uploads
- **exceljs** — Excel parsing
- **Swagger** — API documentation
- **Jest** — Testing
- **Socket.IO** — Real-time support (planned use)

---

## ▶️ Running Locally

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

---

## 🗺 Development Roadmap

- ~~Sprint 0 — Planning & Infrastructure~~ ✅  
- ~~Sprint 1 — Auth + Basic User & Word CRUD & Unit/E2E Tests~~ ✅  
- **Sprint 2 — Import & User Word State** 🔄
- **Sprint 3 — Core Exercise Engine + Minimal SRS Scheduling**
- **Sprint 4 — Advanced Exercise Types + Filters**
- **Sprint 5 — Analytics & Read Models + Frontend Integration**
- **Sprint 6 — Real-Time Improvements**
- **Sprint 7 — Scaling & Reliability**

---

## 📌 Status

Active development.  
Backend-first implementation in progress.

