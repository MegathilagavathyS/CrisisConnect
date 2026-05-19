# CrisisConnect

CrisisConnect is a lightweight Express + Vite prototype for collecting and querying geospatial reports during disasters. It includes a React client, an Express server, and an optional ML-based geospatial query helper.

**Quick Start (local)**

Prerequisites:
- Node.js 18+ and npm

Install dependencies:

```bash
npm install
```

Run the full app (server + client):

```bash
npm start
```

Run only the client dev server:

```bash
npm run dev
```

Build production client assets:

```bash
npm run build
```

Environment variables
- `PORT` — port for the server (defaults to `5000`)
- `CO_API_KEY` or `COHERE_API_KEY` — Cohere API key for the chat/AI endpoint

Notes
- On Windows you may see a Git warning: "LF will be replaced by CRLF". This is informational and not an error.
- The server reads `PORT` and will serve both API and client from the same process.

Files of interest
- `server/index.ts` — server entrypoint
- `client/src` — React client source
- `server/routes.ts` — API route definitions

Contributing
- Open a branch, make changes, commit and push. See existing commit workflow in this repository.

License
- MIT


