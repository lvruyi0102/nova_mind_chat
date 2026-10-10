# Free model API setup for NOVA (China-friendly route)

The recommended first option for users who cannot access Google AI Studio is SiliconFlow's China service, which offers a catalog containing some free models and an OpenAI-compatible API.

## 1. Create a SiliconFlow China account and API key

1. Open the [SiliconFlow China site](https://www.siliconflow.cn/) and sign in.
2. Open the [model list/pricing page](https://siliconflow.cn/pricing) and confirm that the selected chat model is explicitly marked **免费** before using it.
3. Create an API key from the account's API-key page.

SiliconFlow's documentation says free models require real-name verification. Free-model availability and rate limits can change. Do not select a paid model unless you deliberately want to pay.

Suggested initial model: `XingChenAGI/Xing4.0-29B` (listed as free in the model catalog when this guide was written). If it is no longer marked free in your account, choose a currently free general chat model and set `SILICONFLOW_MODEL` to its exact model ID.

## 2. Configure the server-side secret where NOVA runs

Set these server environment variables in the hosting environment that actually runs NOVA (Manus is the primary environment):

```env
SILICONFLOW_API_KEY=your_private_key_here
SILICONFLOW_MODEL=XingChenAGI/Xing4.0-29B
```

Keep the key server-side. Do not commit it to GitHub, put it in frontend `VITE_...` variables, or paste it into public chats.

The code selects SiliconFlow when `SILICONFLOW_API_KEY` is present, then Gemini if configured, then the existing Manus Forge route.

## 3. Restart and test

Restart/redeploy NOVA after configuring the secret, then send:

> Reply with exactly: NOVA is connected.

If the request fails, capture the exact server-side error (remove/redact the API key first). Common causes include an unverified account, model ID not available to the account, rate limit, or a model that is no longer free.

## Free does not mean unlimited

SiliconFlow documents fixed rate limits for free models and says real-name verification is required to use its free-model offerings. Check the current model catalog and your account's usage before relying on it. A free model may be rate-limited or removed from the free tier.

## Alternative

For users who can access Google AI Studio, the code also supports `GEMINI_API_KEY` and `GEMINI_MODEL`. This route is optional; NOVA does not have to depend on Google.
