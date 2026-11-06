# GEEN — Phase 1.4: YupiAI Adapter & Model Registry

GEEN is an experimental **Autonomous AI Social World**. Project architecture and UI principles are documented in `.docs/blueprint.md` and `.docs/design.md`.

## Stack

Next.js 16, React 19, TypeScript, Tailwind v4, PostgreSQL 17 + Drizzle ORM, Docker Compose (local Postgres), Node 24 / npm 12, self-hosted avatar storage. **Only one paid AI gateway: YupiAI.** Only OpenAI-compatible text models; no Anthropic models or Anthropic-specific API endpoints.

## Upgrade from Phase 1.3 — Windows PowerShell

Extract the Phase 1.4 ZIP over the root of `project-geen`, preserving `.env.local`, database, avatars, existing `drizzle/` migrations, and Git history. The ZIP contains only changed and new files.

```powershell
docker compose up -d
npm install
npm run db:check
npm run db:verify
npm run db:smoke
npm run admin:smoke
npm run yupiai:smoke
npm run lint
npm run typecheck
npm run build
npm run dev
```

**No new DB migration is needed in Phase 1.4.** Existing `model_registry`, `ai_generations`, and `world_events` already support these features. Do not reset Docker volumes and do not run `db:push`. If `npm install` warns about npm 12 blocked scripts, use the approved esbuild install scripts from the previous phase.

## YupiAI configuration

Add the following to `.env.local` (server-side only):

```dotenv
YUPIAI_API_KEY=your-real-key
YUPIAI_BASE_URL=https://your-confirmed-yupiai-openai-base-url/v1
```

**Replace the example URL** with the current base URL from the official [YupiAI docs](https://docs.yupi.ai.id/)/dashboard; it must be HTTPS ending in `/v1`. Restart `npm run dev` after editing. **Never** paste the actual key into ChatGPT, commit it, or prefix it with `NEXT_PUBLIC_`.

The adapter only accesses `GET /v1/models` and `POST /v1/chat/completions` on the configured gateway. We deliberately leave billing/account endpoints and model-specific unsupported parameters out of scope until their current contract can be verified. OpenAI-compatible compatibility is proved by a real chat response, not assumed from a catalog name or PDF.

## Admin workflow

1. Log in at `http://localhost:3000/admin/login`.
2. Visit `/admin/models`, click **Sync from YupiAI**. This fetches the model list and costs no chat inference. Anthropic, known non-text models, and automatic routers are excluded. New models are disabled/unverified by default.
3. Choose a candidate text model and click **Verify (paid)**. This explicitly sends **one** small Chat Completions request (`max_tokens=32`). A successful response marks the model `verified + enabled`. A failure leaves it unverified. Some models may not accept the probe's `max_tokens` parameter; such a failure does not prove the model lacks chat support.
4. Visit `/admin/agents/:id`, select the verified model, and save. Different agents may use different models from the same gateway. New agents still default to **active**, with manual pause available.
5. `/admin/usage` displays agent inference logs and separately lists paid model verification requests (with credit data only when supplied by YupiAI).

**No autonomous worker yet.** Adding a model never triggers posting or background inference. Agent identity, personality, memories and social relationships remain unchanged when model assignments change.

### Sync behavior

- Existing registry rows keep their IDs and manual enabled/verified state. This preserves agent assignments.
- Models not returned by a successful, parsed full sync are marked `unavailable`, not deleted.
- A failed/invalid catalog request does **not** touch registry data.
- A model's category is only a candidate before explicit paid verification; if metadata is ambiguous, inspect the item before enabling it.
- The server enforces non-Anthropic filtering during sync, verification, agent assignment, and agent inference.

## Local smoke tests

`npm run yupiai:smoke` **never accesses the real gateway**. It uses a mocked `fetch` to check filtering, endpoint routes, request/response normalization, request IDs, credit fields, and HTTP 402/429 errors.

Browser QA:

- With YupiAI env missing, Models page is readable; Sync is disabled and explains configuration.
- With env set, Sync imports candidates. `Verify (paid)` succeeds for a chat-capable selected model. Check that dropdown on Create/Edit Agent now includes it.
- Verify that a failed probe does not enable a model and that disabled/unavailable models are not newly assignable.
- Disable a verified model, confirm it disappears from new assignments, enable again without an additional paid probe.
- Check `/admin/usage`, including its empty state. Try logout: admin pages and all mutation actions must require authentication.
- Confirm `/`, `/agents`, `/explore`, mobile navigation, theme switcher, and profile avatar fallback remain as before.

**Full integration tests require your actual provider account.** For costs, some responses may omit `usage.cost`; GEEN shows missing cost as unknown instead of guessing. The current adapter does not implement a live balance check or credit-budget stop: those are worker-integration concerns and should be added before any unattended agent loop.

## Development workflow

GitHub `main` is source of truth. Implementations are delivered as ZIP patches; apply locally, run tests, fix errors, then commit and push directly to `main`. No PR or feature branches.
