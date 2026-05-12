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

## Native Architecture

`newArchEnabled: false` in `mobile/app.json` is intentional and must stay off.
It applies equally to Expo Go and EAS builds — there is no need to toggle it.

**Do NOT upgrade `react-native-reanimated` to 4.x while new arch is disabled.**
Reanimated 4.x has a hard podspec assertion that aborts `pod install` if new arch
is off. Keep reanimated pinned to `~3.16.x` (current: 3.16.7).

If new arch is ever enabled in future, the following will need re-evaluation:
- reanimated (can then upgrade to 4.x)
- Any packages that polyfill NativeReactNativeFeatureFlags (see metro.config.js)
