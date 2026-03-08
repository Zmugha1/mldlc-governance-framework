# MoE-Aware LLM Router for MLDLC

## Mixture of Experts (MoE) Integration

MoE model awareness enables intelligent selection based on task complexity AND model architecture efficiency.

## What is MoE?

| Architecture | Total Params | Active Params | VRAM | Compute/Token |
|-------------|--------------|---------------|------|---------------|
| Dense 27B | 27B | 27B | 24GB | 27B ops |
| **MoE 35B-A3B** | 35B | **3B** | 20GB | **3B ops** |
| **MoE 397B-A17B** | 397B | **17B** | 100GB | **17B ops** |

MoE models like `qwen3.5:35b-a3b` have 35B total parameters but only activate 3B per token:
- LLM-level intelligence
- SLM-level compute cost
- Faster than dense 27B (9x less compute)

## Hardware Profiles

| Profile | Hardware | VRAM | Recommended Models |
|---------|----------|------|-------------------|
| Solo Practice | Desktop (16GB RAM) | 8GB | qwen3.5:0.8b, qwen3.5:4b, phi3:mini |
| Micro-Team | Workstation + RTX 4090 | 24GB | qwen3.5:9b, **qwen3.5:35b-a3b (MoE)** |
| Small Firm | Edge server | 48GB | qwen3.5:72b, qwen3.5:27b |
| Scaling | Multi-node/cloud | 100GB+ | qwen3.5:397b-a17b (MoE) |

## Installation

```bash
# Pull models
ollama pull phi3:mini
ollama pull nomic-embed-text
ollama pull qwen3.5:35b-a3b   # MoE (if 20GB+ VRAM)
```

```bash
cp .env.airgapped.example .env.airgapped
# Edit: HARDWARE_PROFILE=micro_team, AVAILABLE_VRAM_GB=24
```

## Usage

```python
from src.llm.llm_router import get_router

router = get_router()
response = router.chat([{"role": "user", "content": "Hello!"}])  # -> phi3:mini
response = router.chat([{"role": "user", "content": "Review this HIPAA compliance clause"}])  # -> qwen3.5:35b-a3b (MoE)
```

## Files

| File | Purpose |
|------|---------|
| `src/llm/llm_router.py` | MoE-aware router |
| `app/components/hardware_profile_selector.py` | UI for deployment profiles |
| `.env.airgapped.example` | Configuration template |
