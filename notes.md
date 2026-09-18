# Engineering Notes

## 1. Architecture

The application is built as a three-part system: a React front end, an Express API, and a PostgreSQL database. The frontend in `ui/ui` is a Vite application that renders three views: catalogue, orders, and dashboard. It communicates with the backend over REST using `http://localhost:5000/api` and keeps its state in component-level React state rather than storing source-of-truth business rules locally.

The Express backend in `backend/` is the core business-logic layer. It mounts all routes under `/api` and delegates database work to a query module. The database connection is created through the PostgreSQL pool in `backend/config/db.js`, and schema creation is handled via `backend/scripts/setup-db.js` reading `backend/sql/schema.sql`. In practice, all critical validation is enforced server-side: inventory availability is checked before order creation, payment and credit checks happen when creating or updating orders, and loyalty-tier recalculation is centralized in the backend rather than in the browser.

R1–R8 are enforced in different layers. R1 (product and distributor catalog maintenance) and R2 (order creation and validation) are primarily backend business rules. R3 (stock reservation) and R4 (dispatch stock deduction) are enforced in the database logic and API layer because they affect inventory consistency. R5 (loyalty discount and points) is enforced at order creation time in the backend using the distributor’s active tier. R6 (status transitions) is enforced in `updateOrderStatus`. R7 (UI views and order management) is handled in the frontend, and R8 (server-side error responses and approval enforcement) is enforced in the API and query layer.

## 2. Key Decisions

1. Server-side business logic instead of client-side validation. The alternative was to enforce logic in the frontend for immediate UX feedback, but this was rejected because the UI is not the source of truth and could be bypassed. Keeping the checks in Express and SQL ensures consistent rules across all clients.

2. Separate stock and reserved_quantity. The rejected alternative was to treat stock_quantity as the only movement field. This was not viable because reserve-and-dispatch flows need to distinguish available stock from committed stock, especially when orders are pending approval or cancelled.

3. Single transactional update for order status changes. The earlier approach used multiple database clients and caused stale transaction states that could hang or deadlock. The final approach reuses a single `pool.connect()` client in one transaction, with stock, distributor points, and order updates grouped together.

4. Backend-owned loyalty recalculation. The alternative was to compute tier updates in the React layer, which was rejected because loyalty is a business state and must be consistent across all orders and UI screens. The backend updates `distributors.trailing_points` and recalculates `loyalty_tier` whenever it changes.

## 3. Known Defects and Fragility

The application works for the designed scenario, but there are known weaknesses. The first is that dispatch and cancellation updates are intentionally strict and can fail when inventory state has drifted from expected values. This is safer than silently corrupting stock, but it means a malformed or incomplete historical dataset can block transitions. The second issue is that front-end state is not fully normalized with backend response shapes across all endpoints: several responses include both snake_case and camelCase keys. This is functional but can be fragile for future refactors. Third, the app assumes a single local PostgreSQL instance and a fixed `.env` configuration; this is acceptable for a demo but not yet hardened for multi-environment deployment.

## 4. AI Tools and Tooling

The project was developed with a mix of direct editing, backend validation, and runtime verification. VS Code tooling was used for file inspection and code changes. Node and PostgreSQL were used to run the backend and confirm live database behavior. The work also used direct HTTP requests to validate endpoints and confirm the JSON contract from the API.

One AI-generated output was incorrect during debugging: an earlier status-update patch was assumed to be valid because it matched the route contract, but it ignored inventory invariants and caused a real database constraint failure when a dispatch exceeded the available reserved quantity. This was detected by a live API call that returned a database error, not by static inspection alone. The issue was then fixed by adding explicit checks before stock deduction.

The single most useful prompt was a request to diagnose the real endpoint mismatch and verify the actual backend contract with live data. It guided the work toward runtime evidence, which is the strongest way to verify an Express + Postgres app before claiming a fix.
