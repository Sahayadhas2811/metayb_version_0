# Metayb

Metayb is a full-stack distributor ordering and warehouse workflow for consumer-goods manufacturers. It lets distributors place orders, the backend validates stock and credit rules, and the UI shows catalogue, orders, and dashboard status in real time.

## Local run steps

Prerequisite: PostgreSQL is running locally and the database `metayb` exists.

1. `cd backend && npm install`
2. `cd ../ui/ui && npm install`
3. `cd ../backend && npm run setup-db`
4. `cd ../backend && npm run dev`
5. `cd ../ui/ui && npm run dev`

Then open:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000/api/health

## Project structure

- `backend/` — Express API + PostgreSQL business logic
- `ui/ui/` — Vite + React frontend
- `backend/sql/schema.sql` — database schema and seed data

## Stack

- React + Vite
- Express.js
- PostgreSQL
- pg driver
