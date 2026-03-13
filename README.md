# Tidi — Personal Finance App

> AI-powered personal finance manager with voice recording, invoice scanning, credit analysis, and multilingual support. Built as a Progressive Web App (PWA).

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Groq](https://img.shields.io/badge/Groq-Whisper%20%2B%20LLaMA-F55036)](https://groq.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Branch Strategy](#branch-strategy)
- [PWA Support](#pwa-support)
- [Contributing](#contributing)

---

## Overview

Tidi is a mobile-first personal finance PWA targeted at Colombian users. It allows recording transactions by voice, scanning invoices with AI, chatting with a financial advisor bot, and simulating a credit score — all from a clean, dark-mode interface installable on any device.

---

## Features

| Feature | Description |
|---|---|
| **Voice Transactions** | Press and hold to record audio — Groq Whisper transcribes and parses the transaction automatically |
| **Invoice Scanner** | Upload or photograph a receipt — LLaMA vision extracts amount, category, and title |
| **AI Chatbot** | Financial assistant powered by LLaMA 3 that answers questions about your spending |
| **Crediturbo** | Simulates bank account connection and calculates a personalized credit limit (premium) |
| **Currency Conversion** | Automatically converts USD, EUR, or any foreign currency to COP using a live exchange rate API |
| **Google OAuth** | Sign in with Google or link a Google account to an existing email/password account |
| **Language Switcher** | Full EN / ES UI toggle persisted in `localStorage` — no page reload required |
| **Freemium Paywall** | 15 free AI-assisted transactions; premium unlocks unlimited voice, camera, and Crediturbo |
| **PWA** | Installable on iOS and Android, with a service worker for offline support |
| **Dark / Light Mode** | Theme preference saved in `localStorage` |

---

## Tech Stack

### Backend
- **Node.js 22** + **Express 5**
- **Supabase** (PostgreSQL) — transactions stored as JSONB per user
- **Groq SDK** — Whisper for audio transcription, LLaMA 3 for AI analysis and chatbot
- **Passport.js** — Google OAuth 2.0 + session management
- **JWT** (`jsonwebtoken`) — stateless auth tokens
- **Multer** — multipart file handling for audio and image uploads
- **bcrypt** — password hashing

### Frontend
- **Bootstrap 5.3** + **Bootstrap Icons**
- **SweetAlert2** — modal dialogs
- **Vanilla JS** — no framework; modular per-page scripts
- **Custom i18n** — lightweight EN/ES translation system via `data-i18n` attributes

### Infrastructure
- **Supabase** — hosted PostgreSQL database
- **Session file store** — server-side sessions on disk
- **express-sslify** — enforces HTTPS in production

---

## Project Structure

```
TID-/
├── server.js                   # App entry point — Express setup, routes, session config
├── sw.js                       # PWA Service Worker (asset caching, offline fallback)
│
├── db/
│   └── queries.js              # Supabase query helpers
│
├── src/
│   ├── config/
│   │   └── passport.js         # Google OAuth strategy configuration
│   ├── controllers/
│   │   └── middlewares/
│   │       └── authMiddleware.js  # JWT verification middleware
│   ├── routes/
│   │   ├── api.js              # All /api/* endpoints (transactions, transcribe, chatbot, credit)
│   │   └── auth.js             # Auth routes (/auth/register, /auth/login, /auth/google/*)
│   └── services/
│       └── groqSpeech.js       # Groq Whisper transcription + LLaMA invoice parsing
│
├── public/
│   ├── manifest.json           # PWA manifest (icons, theme color, display mode)
│   ├── css/
│   │   └── dashboard.css       # Global styles, CSS variables, dark/light theme
│   ├── js/
│   │   ├── auth.js             # Token helpers: getToken(), getUser(), requireAuth(), logout()
│   │   ├── i18n.js             # Translation dictionary + t() + applyLanguage()
│   │   ├── dashboard.js        # Dashboard logic: voice recording, invoice scan, balance
│   │   ├── transactions.js     # Transaction list, filters, delete
│   │   ├── crediTurbo.js       # Crediturbo bank connection + credit simulation
│   │   ├── config.js           # Profile editing, language toggle, Google link
│   │   └── pwa-handler.js      # Service worker registration + install prompt
│   ├── views/
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── dashboard.html
│   │   ├── transactions.html
│   │   ├── crediturbo.html
│   │   ├── chatbot.html
│   │   └── config.html
│   └── assets/
│       └── icons/              # PWA icons (192px, 512px, apple-touch-icon)
│
├── uploads/                    # Temporary storage for audio/image files before processing
├── sessions/                   # Server-side session files
└── data/
    └── voice_records.json      # Local backup of voice transaction records
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (22 recommended)
- A [Supabase](https://supabase.com/) project with a `voice_records` table
- A [Groq](https://console.groq.com/) API key
- A Google Cloud project with OAuth 2.0 credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/TIDI-APP/TID-.git
cd TID-

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
# → Fill in the required values (see Environment Variables section)

# Start the server
npm start
```

The server starts on `http://localhost:3000` by default.

---

## Environment Variables

Create a `.env` file in the project root with the following keys:

```env
# Server
PORT=3000
SESSION_SECRET=your_session_secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key

# Authentication
JWT_SECRET=your_jwt_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback

# AI (Groq)
GROQ_API_KEY=your_groq_api_key

# Exchange Rate API (currency conversion to COP)
EXCHANGE_API_KEY=your_exchange_rate_api_key

# App base URL (used for OAuth redirects)
BASE_URL=https://your-domain.com
```

> **Never commit `.env` to version control.** It is listed in `.gitignore`.

---

## API Reference

All protected routes require the header:
```
Authorization: Bearer <jwt_token>
```

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register with email + password |
| `POST` | `/auth/login` | Login, returns JWT |
| `GET` | `/auth/google` | Initiate Google OAuth flow |
| `GET` | `/auth/google/callback` | Google OAuth callback |
| `GET` | `/auth/google/link` | Link Google account to existing user |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/transactions` | Get all transactions for the current user |
| `POST` | `/api/transactions` | Create a new transaction manually |
| `DELETE` | `/api/transactions/:id` | Delete a transaction by ID |

### AI Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/transcribe` | Upload audio → Whisper transcription → saved transaction |
| `POST` | `/api/scan-invoice` | Upload image → LLaMA vision → saved transaction |
| `POST` | `/api/chat` | Send message to the financial AI chatbot |

### Profile & Credit

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/profile` | Get current user profile |
| `PATCH` | `/api/profile` | Update first/last name |
| `GET` | `/api/calcular-credito` | Calculate simulated credit limit (premium) |

---

## Branch Strategy

```
feature/* ──► develop ──► qa ──► prod
```

| Branch | Purpose |
|--------|---------|
| `feature/*` | Individual feature development |
| `develop` | Integration branch — tested before QA |
| `qa` | Staging environment for QA testing |
| `prod` | Production-ready code — deployed to live server |

All merges use `--no-ff` to preserve merge history.

---

## PWA Support

Tidi is fully installable as a Progressive Web App:

- **`public/manifest.json`** — defines app name, icons, theme color, and `standalone` display mode
- **`sw.js`** — caches static assets on install; serves from cache on fetch with network fallback
- **`public/js/pwa-handler.js`** — registers the service worker and handles the `beforeinstallprompt` event

To install on mobile: open the app in Chrome or Safari and use "Add to Home Screen".

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes following conventional commits
4. Push and open a Pull Request against `develop`

---

## License

ISC © [TIDI APP](https://github.com/TIDI-APP)
