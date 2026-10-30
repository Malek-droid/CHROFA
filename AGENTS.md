<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AI Coding Agent Guidelines

## Architecture Overview
Cadence (CHROFA) is a full-stack appointment scheduling SaaS with two primary sub-projects:
- **Frontend**: Root workspace utilizing React 19, TanStack Start (SSR), TanStack Router, and Tailwind CSS v4.
- **Backend**: Express API in `server/` utilizing Node.js, MongoDB/Mongoose, Redis/BullMQ, Nodemailer, and Baileys WhatsApp client.

## Standard Commands
- Install root packages: `npm install`
- Install server packages: `npm install --prefix server`
- Start frontend: `npm run dev`
- Start backend: `npm run server` (or `npm run server:dev` for nodemon)
- Build frontend: `npm run build`
- Run linter: `npm run lint`
- Run backend tests: `npm test --prefix server`

## Project Conventions
- **Environment files**: Root `.env` handles frontend (`VITE_API_BASE_URL`), while `server/.env` handles database, authentication, and external services.
- **Database**: Ensure MongoDB is running locally on port 27017 (`mongodb://127.0.0.1:27017/cadence`).
- **Redis resilience**: The server gracefully boots even if Redis is unreachable; calendar workers will pause automatically without crashing the API.
- **Code style**: Use Prettier with ESLint (`eslint.config.js`). Do not alter Git history on published branches connected to Lovable.
