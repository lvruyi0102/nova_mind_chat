export type CapabilityStatus =
  | "researching"
  | "specified"
  | "implemented"
  | "tested"
  | "connected"
  | "production_verified"
  | "blocked_external_permission"
  | "blocked_cost_or_hardware";

export type CapabilityDomain =
  | "foundation_models"
  | "visual_intelligence"
  | "media_creation"
  | "social_publishing"
  | "ads_measurement"
  | "recommendation"
  | "messaging_agents"
  | "spatial_embodied";

export interface CapabilityRecord {
  id: string;
  domain: CapabilityDomain;
  name: string;
  status: CapabilityStatus;
  summary: string;
  dependencies: string[];
  permissionRequirements: string[];
  costClass: "free_local" | "free_tier" | "usage_based" | "hardware_required" | "unknown";
  evidence: string[];
  nextStep: string;
}

export const capabilityRegistry: readonly CapabilityRecord[] = [
  {
    id: "models.provider_gateway",
    domain: "foundation_models",
    name: "Provider-neutral model gateway",
    status: "specified",
    summary: "Route tasks to interchangeable model providers without binding business logic to one vendor.",
    dependencies: ["provider adapters", "secret management", "cost telemetry"],
    permissionRequirements: ["provider credentials where required"],
    costClass: "usage_based",
    evidence: [],
    nextStep: "Audit existing LLM and local-model integrations before introducing another gateway.",
  },
  {
    id: "vision.sam2_segmentation",
    domain: "visual_intelligence",
    name: "SAM 2 image/video segmentation pilot",
    status: "researching",
    summary: "Prompt an object in an image or video and produce masks/tracking artifacts across frames.",
    dependencies: ["SAM 2 runtime", "model checkpoint", "artifact storage", "GPU or tested CPU fallback"],
    permissionRequirements: ["rights to process supplied media"],
    costClass: "hardware_required",
    evidence: ["https://ai.meta.com/research/sam2/", "https://github.com/facebookresearch/sam2"],
    nextStep: "Verify deployment requirements and run a reproducible image plus short-video benchmark.",
  },
  {
    id: "media.moviegen_benchmark",
    domain: "media_creation",
    name: "Movie Gen capability benchmark",
    status: "researching",
    summary: "Use Meta's published research as a benchmark for text-to-video, instruction-based editing, and synchronized audio workflows.",
    dependencies: ["publicly supported generation provider", "media pipeline", "evaluation set"],
    permissionRequirements: ["rights to source images, video, voices, and music"],
    costClass: "unknown",
    evidence: ["https://ai.meta.com/research/movie-gen/"],
    nextStep: "Map each research capability to an actually accessible provider; do not assume Movie Gen weights or API are public.",
  },
  {
    id: "social.official_connectors",
    domain: "social_publishing",
    name: "Official social platform connectors",
    status: "researching",
    summary: "Publish and read permitted account insights through documented platform APIs.",
    dependencies: ["OAuth", "platform app registration", "webhook receiver", "token vault"],
    permissionRequirements: ["account authorization", "approved API scopes"],
    costClass: "unknown",
    evidence: [],
    nextStep: "Inventory the target platforms and verify their current API access requirements.",
  },
  {
    id: "ads.measurement_workspace",
    domain: "ads_measurement",
    name: "Advertising and measurement workspace",
    status: "researching",
    summary: "Manage campaign drafts, creative experiments, conversion events, and ROI reporting.",
    dependencies: ["official ads API", "conversion event ledger", "approval gate"],
    permissionRequirements: ["advertiser authorization", "explicit approval before spend or budget changes"],
    costClass: "usage_based",
    evidence: [],
    nextStep: "Start read-only; verify Marketing API permissions and available account scopes.",
  },
  {
    id: "recommendation.baseline",
    domain: "recommendation",
    name: "Explainable recommendation baseline",
    status: "specified",
    summary: "Build a transparent candidate-ranking baseline with offline evaluation before attempting personalization.",
    dependencies: ["consented event schema", "content/product features", "evaluation dataset"],
    permissionRequirements: ["lawful basis and user consent for personal data processing"],
    costClass: "free_local",
    evidence: ["https://engineering.fb.com/2025/05/21/production-engineering/journey-to-1000-models-scaling-instagrams-recommendation-system/"],
    nextStep: "Define event contracts and baseline metrics such as precision@k and NDCG@k.",
  },
  {
    id: "messaging.approved_agents",
    domain: "messaging_agents",
    name: "Messaging and agent adapters",
    status: "researching",
    summary: "Connect approved messaging channels with opt-in handling, agent handoff, and audit trails.",
    dependencies: ["official messaging API", "consent ledger", "template and rate-limit controls"],
    permissionRequirements: ["recipient opt-in", "platform approval where required"],
    costClass: "unknown",
    evidence: [],
    nextStep: "Choose one channel and verify current official API onboarding requirements.",
  },
  {
    id: "spatial.device_adapters",
    domain: "spatial_embodied",
    name: "Spatial and embodied device adapters",
    status: "researching",
    summary: "Provide a device-neutral interface for camera, audio, spatial context, and avatar experiences.",
    dependencies: ["selected device", "vendor SDK", "privacy controls"],
    permissionRequirements: ["device and sensor permissions"],
    costClass: "hardware_required",
    evidence: [],
    nextStep: "Defer implementation until a target device and SDK are selected.",
  },
] as const;

export function getCapabilityById(id: string): CapabilityRecord | undefined {
  return capabilityRegistry.find((capability) => capability.id === id);
}
