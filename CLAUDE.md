# Vargen-EC Development Notes

## EAS Build Workflow
**Always remind the user to run `git pull origin main` on Replit before running an EAS build.**

```bash
# On Replit shell — run this before every build
git pull origin main
cd mobile && eas build --profile preview --platform ios
```

## Project Structure
- `mobile/` — Expo React Native app (EAS builds)
- `server/` — Express.js backend (runs on Replit)
- `shared/` — Shared types (use `mobile-types.ts` and `mobile-routes.ts` for mobile — no drizzle imports)

## Key URLs
- Backend: set in `mobile/.env` as `EXPO_PUBLIC_API_URL`
- EAS project ID: `481ac436-4f04-451b-8cf6-48aaaf94e24b`

## AI Quoting
- Uses Groq (free tier) with `llama-3.3-70b-versatile`
- Secrets needed in Replit: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`
- Endpoint: `POST /api/quotes/generate`
