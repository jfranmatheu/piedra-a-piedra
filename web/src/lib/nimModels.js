/**
 * Lista curada de LLMs en NVIDIA NIM (endpoints free / build.nvidia.com).
 * IDs oficiales para integrate.api.nvidia.com/v1/chat/completions
 * Orden: primero los más fiables/rápidos en free tier (menos 504).
 * @see https://docs.api.nvidia.com/nim/reference/llm-apis
 * @see https://build.nvidia.com/models
 */
export const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

export const NIM_MODELS = [
  {
    id: "microsoft/phi-4-mini-instruct",
    label: "Phi-4 Mini",
    vendor: "Microsoft",
    tier: "fast",
    blurb: "Rápido · menos timeouts",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b",
    label: "Nemotron 3 Nano 30B",
    vendor: "NVIDIA",
    tier: "fast",
    blurb: "Ágil y económico",
  },
  {
    id: "deepseek-ai/deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    vendor: "DeepSeek",
    tier: "fast",
    blurb: "Rápido, buen código",
  },
  {
    id: "meta/llama-3.2-3b-instruct",
    label: "Llama 3.2 3B",
    vendor: "Meta",
    tier: "fast",
    blurb: "Muy ligero",
  },
  {
    id: "meta/llama-3.1-8b-instruct",
    label: "Llama 3.1 8B",
    vendor: "Meta",
    tier: "fast",
    blurb: "Equilibrio velocidad",
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    vendor: "Meta",
    tier: "balanced",
    blurb: "Sólido (más lento)",
  },
  {
    id: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    label: "Nemotron Super 49B",
    vendor: "NVIDIA",
    tier: "quality",
    blurb: "Razonamiento fuerte",
  },
  {
    id: "qwen/qwen2.5-coder-32b-instruct",
    label: "Qwen2.5 Coder 32B",
    vendor: "Qwen",
    tier: "balanced",
    blurb: "Texto estructurado",
  },
  {
    id: "mistralai/mistral-nemotron",
    label: "Mistral Nemotron",
    vendor: "Mistral",
    tier: "balanced",
    blurb: "Instrucciones claras",
  },
  {
    id: "meta/llama-3.1-70b-instruct",
    label: "Llama 3.1 70B",
    vendor: "Meta",
    tier: "balanced",
    blurb: "Clásico (puede hacer cola)",
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct",
    label: "Qwen3 Next 80B",
    vendor: "Qwen",
    tier: "quality",
    blurb: "Multilingüe / grande",
  },
  {
    id: "openai/gpt-oss-120b",
    label: "GPT-OSS 120B",
    vendor: "OpenAI",
    tier: "quality",
    blurb: "Grande · más 504",
  },
];

export const DEFAULT_NIM_MODEL = NIM_MODELS[0].id;

export function getNimModel(id) {
  return NIM_MODELS.find((m) => m.id === id) || NIM_MODELS[0];
}
