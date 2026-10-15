# YatraHub 🪷

Discover and book guided tours across India: the Himalayas, Kerala's backwaters, royal Rajasthan and more.

YatraHub is a full-stack JavaScript app:

| Layer    | Stack                                                                 |
| -------- | --------------------------------------------------------------------- |
| API      | Node.js, Express 5, MongoDB + Mongoose 9, JWT auth (httpOnly cookie)  |
| Frontend | React 19, React Router 7, Axios, Vite 8, Leaflet + OpenStreetMap      |
| Payments | Razorpay Checkout in **INR** (₹)                                    |
| Email    | Nodemailer; email templates written in React (rendered on the server) |

The Express server is a **pure JSON REST API**. There is no server-side templating anymore: every Pug view
was rebuilt as a React component in `client/`.

---

## 1. Prerequisites

- **Node.js 20.19 or newer** (22 LTS recommended) and npm
- **MongoDB**, any one of:
  - Docker: `docker compose up -d` (a `docker-compose.yml` is included), or
  - a local MongoDB install on `mongodb://127.0.0.1:27017`, or
  - a free MongoDB Atlas cluster

## 2. Install dependencies

From the project root (installs the API **and** the React client):

```bash
npm run install:all
```

(That is `npm install` in the root plus `npm install` inside `client/`.)

## 3. Configure environment variables

All settings live in **`config.env`** in the project root. It is pre-filled so the app works locally out of the
box. Review these values:

| Variable                                        | What it does                                                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                      | `development` (verbose errors, request logging) or `production`                                          |
| `PORT`                                          | API port (default `3000`)                                                                                |
| `DATABASE`                                      | MongoDB URL. Default `mongodb://127.0.0.1:27017/yatrahub`. For Atlas use `...mongodb.net/yatrahub`       |
| `DATABASE_PASSWORD`                             | Replaces `<PASSWORD>` in `DATABASE` (Atlas only)                                                         |
| `JWT_SECRET`                                    | **Change this.** Random string, at least 32 characters. The server refuses to start without it            |
| `JWT_EXPIRES_IN` / `JWT_COOKIE_EXPIRES_IN`      | Token lifetime (`90d`) and cookie lifetime in days (`90`)                                                |
| `EMAIL_FROM`                                    | Sender address, e.g. `hello@yatrahub.in`                                                                 |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USERNAME`, `EMAIL_PASSWORD` | SMTP for development (e.g. Mailtrap). **Leave `EMAIL_HOST` empty** and emails are printed to the server console instead of sent, which is handy for the password-reset link |
| `SENDGRID_USERNAME`, `SENDGRID_PASSWORD`        | SMTP used when `NODE_ENV=production`                                                                     |
| `RAZORPAY_KEY_ID`                               | Razorpay **test** key id (`rzp_test_...`) to enable booking. Optional                                    |
| `RAZORPAY_WEBHOOK_SECRET`                       | Secret for the `payment.captured` webhook (see Payments). Optional                                       |
| `RAZORPAY_KEY_SECRET`                           | Razorpay key secret, used to create orders and verify payments. Optional                                 |

Generate a strong secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 4. Load the demo data (Indian tours)

Make sure MongoDB is running, then:

```bash
npm run import-data     # loads 9 tours, 20 users and 60 reviews
npm run delete-data     # removes them again
```

## 5. Start the API and the React dev server together

```bash
npm run dev
```

This single command uses `concurrently` to start both servers:

| Process | URL                      | What                                        |
| ------- | ------------------------ | ------------------------------------------- |
| `api`   | http://localhost:3000    | Express REST API (auto-restarts via nodemon) |
| `client`| **http://localhost:5173**| React app with hot reload (open this one)   |

Vite proxies `/api`, `/img` and `/css` to the API on port 3000, so there are no CORS or cookie problems.

Prefer two terminals? Run them separately:

```bash
npm run server          # terminal 1: API on :3000
npm run client          # terminal 2: React on :5173
```

### Production-style run (one server)

```bash
npm run build           # builds the React app into client/dist
npm start               # Express serves the API *and* the built React app on http://localhost:3000
npm run start:prod      # same, with NODE_ENV=production
```

> `client/dist` is already built in this download, so `npm start` works right after step 4.

## 6. Demo accounts

All demo accounts use the password **`test1234`**.

| Role       | Email                      |
| ---------- | -------------------------- |
| Admin      | `admin@yatrahub.in`        |
| Lead guide | `karan@example.com`        |
| Guide      | `arjun@example.com`        |
| User       | `priya@example.com`        |

You can also create an account from the **Sign up** page.

---

## Tours included

| Tour                       | Starts in        | Days | Price (per person) |
| -------------------------- | ---------------- | ---- | ------------------ |
| The Himalayan Trek         | Manali           | 5    | ₹24,999            |
| The Andaman Explorer       | Port Blair       | 7    | ₹42,999            |
| The Kashmir Snow Adventure | Srinagar         | 4    | ₹29,999            |
| The Golden Triangle        | New Delhi        | 6    | ₹34,999            |
| Royal Rajasthan            | Jaipur           | 10   | ₹64,999            |
| The Goa Surf Escape        | Panaji           | 5    | ₹19,999            |
| The Kerala Backwaters      | Fort Kochi       | 5    | ₹27,999            |
| The Ladakh Star Gazer      | Leh              | 9    | ₹54,999            |
| The Auli Winter Escape     | Joshimath        | 3    | ₹14,999            |

Every start location and tour stop is stored as GeoJSON (`[longitude, latitude]`) with real coordinates inside India.
Prices are stored in rupees and shown with Indian digit grouping (`₹24,999`, `₹1,24,999`).

> The tour and guide **photos are still the original stock images** (landscapes, portraits) used as placeholders.
> Replace the files in `public/img/tours/` and `public/img/users/` (keeping the same file names, or editing
> `dev-data/data/*.json`) with your own photography.

## Payments (Razorpay, INR)

- `POST /api/v1/bookings/create-order/:tourId` creates a Razorpay order (`currency: 'INR'`, amount in paise, so ₹24,999 is `2499900`).
- The React app opens the Razorpay Checkout pop-up with that order.
- After payment the app calls `POST /api/v1/bookings/verify-payment` with `razorpay_order_id`, `razorpay_payment_id` and
  `razorpay_signature`. The API checks the HMAC-SHA256 signature, re-fetches the order from Razorpay and stores the booking.

**Webhook (recommended):** in Razorpay Dashboard → Developers → Webhooks, add `https://YOUR-DOMAIN/webhook-checkout`,
enable the `payment.captured` event and set a secret, then put the same secret in `RAZORPAY_WEBHOOK_SECRET`. This records the
booking even if the user closes the browser right after paying. For local testing expose your port with a tunnel such as ngrok.

After a booking is saved, a confirmation email (tour, dates, amount, payment and order IDs) is sent to the user. It uses the
same SMTP settings as the other emails; with no SMTP configured it is printed to the console. `APP_URL` sets the link in it.

Test locally with Razorpay test keys. Test card: `4111 1111 1111 1111`, any future expiry and any CVV (use any OTP, or
`success@razorpay` for UPI). Without the keys, the booking button shows a "payments are not configured" message.

## REST API overview

Base URL: `/api/v1`. Responses are JSON: `{ "status": "success", "data": { ... } }`, or `{ "status": "fail", "message": "..." }`.

| Area     | Endpoints                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Tours    | `GET /tours` (supports `?price[lte]=30000&sort=-ratingsAverage&fields=name,price&page=1&limit=5`), `GET /tours/top-5-cheap`, `GET /tours/slug/:slug`, `GET /tours/:id`, `GET /tours/tour-stats`, `GET /tours/monthly-plan/:year` (staff), `POST/PATCH/DELETE /tours` (admin, lead-guide) |
| Auth     | `POST /users/signup`, `POST /users/login`, `GET /users/logout`, `GET /users/isLoggedIn`, `POST /users/forgotPassword`, `PATCH /users/resetPassword/:token` |
| Account  | `GET /users/me`, `PATCH /users/updateMe` (name, email, photo upload), `PATCH /users/updateMyPassword`, `DELETE /users/deleteMe`        |
| Reviews  | `GET/POST /tours/:tourId/reviews`, `GET/PATCH/DELETE /reviews/:id`                                                                  |
| Bookings | `GET /bookings/my-tours`, `POST /bookings/create-order/:tourId`, `POST /bookings/verify-payment`, `GET /bookings/my-bookings`, admin CRUD on `/bookings`                                       |

A Postman collection is included: `yatrahub-postman-collection.json`.

## React app

| Route                     | Page                                       |
| ------------------------- | ------------------------------------------ |
| `/`                       | Overview: all tours                        |
| `/tour/:slug`             | Tour details, map, reviews, booking button |
| `/login`, `/signup`       | Authentication                             |
| `/forgot-password`, `/reset-password/:token` | Password recovery       |
| `/me`                     | Account settings and password change (login required) |
| `/my-tours`               | Booked tours (login required)              |

The map uses Leaflet with OpenStreetMap tiles, so no API token is needed (it replaces Mapbox).

## Project structure

```
yatrahub/
├── app.js, server.js          Express app and entry point
├── config.env                 Environment variables
├── controllers/ models/ routes/ utils/
│   └── utils/emailTemplates.js   Welcome / password-reset emails (React)
│   └── utils/sanitize.js         NoSQL-injection + XSS + parameter-pollution protection (Express 5 safe)
├── dev-data/data/             Seed data (tours, users, reviews) + import script
├── public/                    Static files: css, logos, tour and user images
├── client/                    React front-end (Vite)
│   └── src/ (pages, components, context, api.js)
└── docker-compose.yml         Optional local MongoDB
```

---

## What changed from the original "Natours" project

**Frontend (Pug → React).** All `.pug` templates and the view controller/routes were removed. The Express app only
returns JSON; unknown non-API GET requests return the built React `index.html` so client-side routes work on refresh.

**Dependencies (all at their latest stable major at the time of writing).**
Express 4→5, Mongoose 5→9, Helmet 3→8, express-rate-limit 3→8, jsonwebtoken 8→9, bcryptjs 2→3, dotenv 7→18,
Sharp 0.22→0.35, Multer 1→2, Nodemailer 6→10, html-to-text 5→10, React 19, Vite 8.
`parcel-bundler`, `body-parser`, `pug`, `xss-clean`, `express-mongo-sanitize`, `hpp` and `@babel/polyfill` were removed.

**Breaking changes handled**

- Mongoose: removed the deprecated `useNewUrlParser`, `useCreateIndex`, `useFindAndModify` options; hooks are `async`
  (no `next()` callbacks); `returnDocument: 'after'` replaces `new: true`; fixed `Date.now()` schema defaults that were
  evaluated once at startup; fixed the `require:` typo in the booking model; awaited the review rating hook so a failure
  can't crash the process.
- Express 5: wildcard routes use `/{*splat}`; `req.query` is read-only, so the `top-5-cheap` alias now replaces it
  and the query parser (`qs`, extended) is configured explicitly.
- `express-mongo-sanitize`, `xss-clean` and `hpp` break on Express 5, so they were replaced by `utils/sanitize.js`
  (same protections, using the `xss` package).
- JWT: tokens are signed and verified with an explicit `HS256` algorithm list (blocks `alg: none` tokens), the secret
  must be at least 32 characters, and the cookie is `httpOnly` + `SameSite=Lax` (+ `Secure` over HTTPS).
- Errors: Mongoose cast/validation/duplicate errors and JWT errors are mapped to friendly 4xx responses in every
  environment; stack traces are only returned in development.
- Email: Pug templates became React components; nodemailer's `jsonTransport` is used when no SMTP is configured.

**Rebrand.** "Natours" is now "YatraHub" everywhere: package names, default database (`yatrahub`), page titles,
emails and sender, footer, Postman collection, Docker volume and new lotus-themed logos and favicon (`public/img`).

## Troubleshooting

- **`Could not connect to MongoDB`**: start MongoDB (`docker compose up -d`) or fix `DATABASE` in `config.env`.
- **`JWT_SECRET is missing or too short`**: set a value of 32+ characters in `config.env`.
- **Port 3000 or 5173 already in use**: change `PORT` in `config.env` (and the proxy target in `client/vite.config.js`).
- **Blank page at http://localhost:3000**: run `npm run build` first, or use http://localhost:5173 with `npm run dev`.
- **Map shows no tiles**: the browser needs internet access to `tile.openstreetmap.org`.
