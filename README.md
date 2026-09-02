# TokTickIT - IT Service Desk

## Description
TokTickIT est une application de gestion de tickets IT. Ce projet contient un frontend React et un backend Express avec PostgreSQL et Prisma.

## Setup & Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL

### Installation
1. Install dependencies:
```bash
   npm install
   cd client && npm install
   cd ../server && npm install
```
2. Setup environment variables:
```bash
   cp .env.example .env
```
3. Run Database Migrations & Seed:
```bash
   npx prisma migrate dev
   npx prisma db seed
```
4. Start Servers:
   - Backend: `npm run dev --prefix server`
   - Frontend: `npm run dev --prefix client`

### Testing
- Run all tests: `npm test`
