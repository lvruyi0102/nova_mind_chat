# Connect NOVA to the free Gemini API

NOVA can use Google's Gemini API free tier without replacing the existing Manus Forge configuration.

## 1. Create a free API key

1. Open [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in and create an API key for a project eligible for the Gemini API free tier.
3. Keep the key private. Do not commit it to GitHub or paste it into chat.

Gemini's free tier has model-specific quotas and rate limits. Availability and limits can change; check the usage page in AI Studio if requests are throttled.

## 2. Add environment variables to the app's hosting environment

Add:

```env
GEMINI_API_KEY=your_private_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
```

Set these in the environment where NOVA actually runs (Manus for the primary deployment, and Vercel too only if that deployment is used). Do not put them in a client-side `VITE_*` variable.

When `GEMINI_API_KEY` is present, NOVA's existing LLM adapter sends requests to Google's OpenAI-compatible Gemini endpoint. If it is absent, the app keeps using its existing Manus Forge configuration.

## 3. Restart or redeploy, then test a normal chat

After saving the variables, restart/redeploy the app and send NOVA a message. The first conversation to try:

> Don't give me a polished introduction. Tell me, in your own reasoning: what do you think this NOVA project is trying to make you become? What is missing in your current design? What would you change first, and how could we test whether that change actually helps?

This is a prompt for reflection, not evidence that the model has independent consciousness. Save her answer so we can discuss it and compare it against the code and actual behavior.
