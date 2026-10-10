export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // China-accessible OpenAI-compatible provider with free models.
  siliconFlowApiKey: process.env.SILICONFLOW_API_KEY ?? "",
  siliconFlowModel: process.env.SILICONFLOW_MODEL ?? "XingChenAGI/Xing4.0-29B",
  // Optional Google AI Studio provider for accounts that can access it.
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",
};
