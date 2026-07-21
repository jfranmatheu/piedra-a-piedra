/**
 * Lista curada de LLMs en NVIDIA NIM (endpoints free / build.nvidia.com).
 * IDs oficiales para integrate.api.nvidia.com/v1/chat/completions
 * Orden: primero los más ligeros (menos 504 en free tier).
 * @see https://docs.api.nvidia.com/nim/reference/llm-apis
 * @see https://build.nvidia.com/models
 */
export const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

export const NIM_MODELS = [
  {
    id: "meta/llama-3.2-3b-instruct",
    label: "Llama 3.2 3B",
    vendor: "Meta",
    tier: "fast",
    blurb: "Muy ligero · menos timeouts",
  },
  {
    id: "nvidia/llama-3.1-nemotron-nano-8b-v1",
    label: "Nemotron Nano 8B",
    vendor: "NVIDIA",
    tier: "fast",
    blurb: "Rápido y eficiente",
  },
  {
    id: "nvidia/nvidia-nemotron-nano-9b-v2",
    label: "Nemotron Nano 9B v2",
    vendor: "NVIDIA",
    tier: "fast",
    blurb: "Nano actualizado",
  },
  {
    id: "google/gemma-7b",
    label: "Gemma 7B",
    vendor: "Google",
    tier: "fast",
    blurb: "Compacto Google",
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    vendor: "Meta",
    tier: "balanced",
    blurb: "Sólido y versátil",
  },
  {
    id: "qwen/qwen3.5-122b-a10b",
    label: "Qwen3.5 122B",
    vendor: "Qwen",
    tier: "quality",
    blurb: "Grande · multilingüe",
  },
  {
    id: "z-ai/glm-5.2",
    label: "GLM 5.2",
    vendor: "Z-AI",
    tier: "quality",
    blurb: "Agéntico / planning",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b",
    label: "Nemotron 3 Ultra 550B",
    vendor: "NVIDIA",
    tier: "quality",
    blurb: "Máxima capacidad · lento",
  },
];

export const DEFAULT_NIM_MODEL = NIM_MODELS[0].id;

export function getNimModel(id) {
  return NIM_MODELS.find((m) => m.id === id) || NIM_MODELS[0];
}
