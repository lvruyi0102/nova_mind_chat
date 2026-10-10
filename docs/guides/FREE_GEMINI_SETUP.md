# Use the free Gemini API tier with NOVA

This option lets NOVA use Google's Gemini API free tier instead of relying on the paid Manus Forge model route. Google controls eligibility, available models, and rate limits; check the current limits in Google AI Studio.

## 1. Create a free API key

1. Open [Google AI Studio API keys](https://aistudio.google.com/app/apikey).
2. Sign in and create an API key for a project that is eligible for the Gemini API free tier.
3. Keep the key private. Never commit it to GitHub or paste it into a public chat.

The default model is `gemini-3.5-flash-lite`, selected as a lightweight model for the free-tier path. If Google changes free-tier availability, set `GEMINI_MODEL` to a currently eligible model listed in the official [Gemini API models page](https://ai.google.dev/gemini-api/docs/models).

## 2. Add the key to the environment where NOVA actually runs

Configure these server-side environment variables in the hosting environment that runs NOVA (Manus is the primary environment; configure Vercel only if NOVA is actually running there):

```env
GEMINI_API_KEY=your_private_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

Do not use a `VITE_...` variable for the key: those variables may be exposed to browser code. Do not put the key in source files or GitHub.

## 3. Restart and test

Restart/redeploy NOVA after adding the variables, then send a short message such as:

> Reply with exactly: NOVA is connected.

If that succeeds, test a normal conversation. The existing Manus Forge route remains the fallback when no Gemini key is configured. When the Gemini key is configured, the adapter selects Gemini instead.

## Important limits

- This is a free-tier API, not unlimited service. Google can enforce per-model request/token quotas or change availability.
- Free-tier terms may allow submitted content to be used to improve Google products; review the current terms before sending private conversations or sensitive data.
- Adding this code to GitHub does not configure the key in Manus by itself. A person with access to the actual hosting environment must add the secret and restart the app.
