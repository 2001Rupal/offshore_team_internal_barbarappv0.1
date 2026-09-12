# Barber Booking Platform — Level 1

A production-ready foundation for a multi-tenant barber shop management and appointment booking platform.

**Level 1 Scope**: Enables a Shop Owner to register, log in, create and configure their barber shop profile, manage barbers (create, update, activate/deactivate), manage services (create, update, activate/deactivate), and inspect shop metrics through an intuitive web UI backed by a REST API and MongoDB.

---

## 🏛️ Architecture

```
                    Browser (Web Client)
                             |
                             v
               +---------------------------+
               |    Next.js 14 Frontend    |
               | (React, Tailwind, Query)  |
               +-------------+-------------+
                             |
                   REST APIs / JSON (v1)
                    (Bearer JWT Token)
                             |
                             v
               +---------------------------+
               |       NestJS Backend      |
               |---------------------------|
               | • Auth Module (Argon2/JWT)|
               | • Users Module            |
               | • Shops Module            |
               | • Barbers Module          |
               | • Services Module         |
               | • Swagger Docs (/api/docs)|
               +-------------+-------------+
                             |
                      Mongoose ODM
                             |
                             v
               +---------------------------+
               |          MongoDB          |
               | (Docker or Local Service) |
               +---------------------------+
```

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TanStack React Query, React Hook Form, Lucide Icons.
- **Backend**: NestJS 10, TypeScript, REST API, Swagger/OpenAPI (`/api/docs`), Mongoose, class-validator, class-transformer, Argon2, JWT & Passport.
- **Database**: MongoDB (Local Windows Service, Docker Compose, or MongoDB Atlas).
- **Testing**: Jest (Unit testing), Supertest (Integration and E2E testing).

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js**: v18+ (tested on v22)
- **MongoDB**: Either local MongoDB server running on port 27017 or Docker.

### 2. Database Setup

#### Option A: Local MongoDB (Default)
If MongoDB is installed locally on your machine, it runs on `mongodb://127.0.0.1:27017/barber_booking`.

#### Option B: Docker Compose
```bash
docker compose up -d
```

---

### 3. Backend Setup & Run

```bash
cd backend

# Copy environment variables
cp .env.example .env

# Install dependencies
npm install

# (Optional) Seed demo owner, shop, barbers & services
npm run seed

# Run unit tests
npm test

# Run e2e & authorization isolation tests
npm run test:e2e

# Start development server (Port 3001)
npm run start:dev
```

- **API Base**: `http://localhost:3001/api/v1`
- **Swagger Documentation**: `http://localhost:3001/api/docs`

---

### 4. Frontend Setup & Run

```bash
cd frontend

# Copy environment variables
cp .env.example .env.local

# Install dependencies
npm install

# Start Next.js development server (Port 3000)
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 🧪 Testing & Verification

### Unit Tests
```bash
cd backend
npm test
```
Tests Argon2 password hashing, shop ownership enforcement, barber ownership verification, and service ownership validation.

### E2E Tests (Includes Mandatory Cross-Owner Isolation)
```bash
cd backend
npm run test:e2e
```
Executes:
1. **Full Owner Lifecycle**: Register -> Login -> Create Shop -> Add Barbers -> Add Services -> Update Barber -> Deactivate Service -> Relogin -> Validate persistence.
2. **Multi-Tenant Ownership Isolation**: Verifies that Owner B receives `403 Forbidden` attempting to update or modify Owner A's shop, barbers, or services.

---

## 🔑 Demo Seed Credentials

If you run `npm run seed` in the `backend/` directory:
- **Email**: `owner@example.com`
- **Password**: `change-me`
- **Shop**: "Royal Cuts" (Bhopal)
- **Barbers**: Rahul (5 yrs), Amit (3 yrs), Vikas (2 yrs)
- **Services**: Haircut (₹250), Beard (₹150), Fade (₹300), Haircut+Beard (₹350)
