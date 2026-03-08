"""Intelligent LLM Router with MoE (Mixture of Experts) support.
2026 Best Practice: MoE models provide LLM intelligence at SLM compute cost.
"""
import re
import os
import json
import requests
from typing import List, Dict, Optional, Tuple, Generator
from dataclasses import dataclass, field
from enum import Enum


class TaskComplexity(Enum):
    SIMPLE = 1
    MEDIUM = 2
    COMPLEX = 3


class TaskType(Enum):
    GREETING = "greeting"
    SIMPLE_QA = "simple_qa"
    CODE_EXPLANATION = "code_explanation"
    SUMMARIZATION = "summarization"
    DATA_ANALYSIS = "data_analysis"
    CODE_GENERATION = "code_generation"
    ARCHITECTURE_DESIGN = "architecture_design"
    COMPLEX_REASONING = "complex_reasoning"
    RAG_RETRIEVAL = "rag_retrieval"
    GRAPHRAG_QUERY = "graphrag_query"
    IMAGE_ANALYSIS = "image_analysis"
    LEGAL_COMPLIANCE = "legal_compliance"
    UNKNOWN = "unknown"


@dataclass
class ModelConfig:
    name: str
    total_params: str
    active_params: str
    vram_gb: int
    complexity: TaskComplexity
    is_moe: bool
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    avg_tokens_per_sec: int = 20
    context_window: int = 32768


AVAILABLE_MODELS = {
    "qwen3.5:0.8b": ModelConfig("qwen3.5:0.8b", "0.8B", "0.8B", 4, TaskComplexity.SIMPLE, False,
        ["speed", "ultra_low_resource", "simple_qa", "greeting"], ["complex_reasoning", "long_context"], 80, 32768),
    "qwen3.5:4b": ModelConfig("qwen3.5:4b", "4B", "4B", 8, TaskComplexity.SIMPLE, False,
        ["speed", "low_resource", "simple_qa", "basic_analysis"], ["complex_reasoning", "legal_nuance"], 50, 32768),
    "phi3:mini": ModelConfig("phi3:mini", "3.8B", "3.8B", 4, TaskComplexity.SIMPLE, False,
        ["speed", "low_resource", "simple_qa", "greeting"], ["complex_reasoning", "long_context"], 45, 32768),
    "llama3.2": ModelConfig("llama3.2", "3B", "3B", 4, TaskComplexity.SIMPLE, False,
        ["speed", "general_chat", "code_explanation"], ["complex_code", "math"], 40, 32768),
    "qwen3.5:9b": ModelConfig("qwen3.5:9b", "9B", "9B", 16, TaskComplexity.MEDIUM, False,
        ["reasoning", "analysis", "multilingual", "rag", "compliance"], ["very_long_context"], 30, 32768),
    "deepseek-coder:6.7b": ModelConfig("deepseek-coder:6.7b", "6.7B", "6.7B", 8, TaskComplexity.MEDIUM, False,
        ["code_generation", "technical_writing", "debugging"], ["creative_writing"], 22, 32768),
    "qwen3.5:35b-a3b": ModelConfig("qwen3.5:35b-a3b", "35B", "3B", 20, TaskComplexity.COMPLEX, True,
        ["llm_intelligence", "complex_reasoning", "legal_analysis", "document_review", "compliance"],
        ["requires_20gb_vram"], 35, 32768),
    "qwen3.5:27b": ModelConfig("qwen3.5:27b", "27B", "27B", 24, TaskComplexity.COMPLEX, False,
        ["complex_reasoning", "analysis", "long_context"], ["slower_than_moe", "high_compute"], 15, 32768),
    "qwen3.5:72b": ModelConfig("qwen3.5:72b", "72B", "72B", 48, TaskComplexity.COMPLEX, False,
        ["expert_level", "complex_reasoning", "research"], ["very_slow", "very_high_vram"], 8, 32768),
    "qwen3.5:397b-a17b": ModelConfig("qwen3.5:397b-a17b", "397B", "17B", 100, TaskComplexity.COMPLEX, True,
        ["state_of_the_art", "research_grade", "complex_legal", "multi_document_analysis"],
        ["requires_100gb_vram"], 10, 32768),
    "llava:13b": ModelConfig("llava:13b", "13B", "13B", 16, TaskComplexity.COMPLEX, False,
        ["vision", "image_analysis", "multimodal", "document_ocr"], ["text_only_tasks"], 15, 8192),
    "nomic-embed-text": ModelConfig("nomic-embed-text", "N/A", "N/A", 2, TaskComplexity.SIMPLE, False,
        ["embeddings", "semantic_search", "rag", "fast"], ["not_for_generation"], 100, 8192),
}

HARDWARE_PROFILES = {
    "solo_practice": {"name": "Solo Practice", "hardware": "Standard desktop (16GB RAM)", "vram_gb": 8,
        "concurrent_users": "1-2", "max_customers": "~500", "storage_per_year": "50GB-100GB",
        "recommended_models": ["qwen3.5:0.8b", "qwen3.5:4b", "phi3:mini"]},
    "micro_team": {"name": "Micro-Team (2-5)", "hardware": "Workstation + RTX 4090 (24GB)", "vram_gb": 24,
        "concurrent_users": "3-5", "max_customers": "~2,000", "storage_per_year": "200GB-500GB",
        "recommended_models": ["qwen3.5:9b", "qwen3.5:35b-a3b", "deepseek-coder:6.7b"]},
    "small_firm": {"name": "Small Firm (5-15)", "hardware": "Edge server (64GB RAM + GPU)", "vram_gb": 48,
        "concurrent_users": "8-10", "max_customers": "~10,000", "storage_per_year": "1TB+",
        "recommended_models": ["qwen3.5:72b", "qwen3.5:27b"]},
    "scaling": {"name": "Scaling Point", "hardware": "Multi-node or cloud", "vram_gb": 100,
        "concurrent_users": "20+", "max_customers": "Unlimited", "storage_per_year": "Data lake required",
        "recommended_models": ["qwen3.5:397b-a17b"], "note": "Move to vLLM/TGI for production"},
}


class TaskAnalyzer:
    TASK_KEYWORDS = {
        TaskType.GREETING: ["hello", "hi", "hey", "good morning", "good afternoon"],
        TaskType.CODE_EXPLANATION: ["explain this code", "what does this do", "how does this work", "code review"],
        TaskType.CODE_GENERATION: ["write code", "generate", "create a function", "implement", "build"],
        TaskType.SUMMARIZATION: ["summarize", "summary", "tl;dr", "brief", "condense"],
        TaskType.DATA_ANALYSIS: ["analyze", "statistics", "trend", "pattern", "correlation"],
        TaskType.ARCHITECTURE_DESIGN: ["architecture", "design pattern", "system design", "microservice"],
        TaskType.COMPLEX_REASONING: ["why", "compare", "contrast", "evaluate", "assess", "optimize"],
        TaskType.RAG_RETRIEVAL: ["search", "find", "retrieve", "lookup", "query"],
        TaskType.GRAPHRAG_QUERY: ["relationship", "connection", "graph", "entity", "network"],
        TaskType.IMAGE_ANALYSIS: ["image", "picture", "photo", "diagram", "screenshot"],
        TaskType.LEGAL_COMPLIANCE: ["compliance", "regulation", "hipaa", "gdpr", "legal", "contract",
            "policy", "audit", "risk", "document review", "regulatory"],
    }

    def analyze(self, prompt: str, context: Optional[str] = None) -> Tuple[TaskType, TaskComplexity]:
        prompt_lower = prompt.lower()
        task_type = self._detect_task_type(prompt_lower)
        complexity = self._detect_complexity(prompt, context)
        return self._apply_task_type_complexity(task_type, complexity)

    def _detect_task_type(self, prompt: str) -> TaskType:
        scores = {task: 0 for task in TaskType}
        for task, keywords in self.TASK_KEYWORDS.items():
            for kw in keywords:
                if kw in prompt:
                    scores[task] += 1
        return max(scores, key=scores.get) if max(scores.values()) > 0 else TaskType.UNKNOWN

    def _detect_complexity(self, prompt: str, context: Optional[str] = None) -> TaskComplexity:
        plen, has_code = len(prompt), "```" in prompt or bool(re.search(r"def\s+\w+|class\s+\w+", prompt))
        qcount = prompt.count("?") + prompt.count("1.") + prompt.count("2.")
        if plen < 100 and not has_code and qcount <= 1:
            return TaskComplexity.SIMPLE
        return TaskComplexity.COMPLEX if plen >= 500 or qcount > 3 else TaskComplexity.MEDIUM

    def _apply_task_type_complexity(self, task_type: TaskType, detected: TaskComplexity) -> TaskComplexity:
        overrides = {TaskType.CODE_GENERATION: TaskComplexity.MEDIUM, TaskType.ARCHITECTURE_DESIGN: TaskComplexity.COMPLEX,
            TaskType.COMPLEX_REASONING: TaskComplexity.COMPLEX, TaskType.GRAPHRAG_QUERY: TaskComplexity.COMPLEX,
            TaskType.IMAGE_ANALYSIS: TaskComplexity.COMPLEX, TaskType.LEGAL_COMPLIANCE: TaskComplexity.COMPLEX}
        req = overrides.get(task_type, TaskComplexity.SIMPLE)
        return max(detected, req, key=lambda x: x.value)


class LLMRouter:
    def __init__(self, ollama_url: str = "http://localhost:11434", hardware_profile: str = None):
        self.ollama_url = ollama_url
        self.analyzer = TaskAnalyzer()
        self.available_models = self._get_available_models()
        self.system_vram = int(os.getenv("AVAILABLE_VRAM_GB", "8"))
        self.hardware_profile = hardware_profile or self._detect_hardware_profile()

    def _get_available_models(self) -> Dict[str, ModelConfig]:
        try:
            r = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if r.status_code == 200:
                names = [m["name"] for m in r.json().get("models", [])]
                out = {}
                for n in names:
                    if n in AVAILABLE_MODELS:
                        out[n] = AVAILABLE_MODELS[n]
                    else:
                        base = n.split(":")[0]
                        for k, v in AVAILABLE_MODELS.items():
                            if k.startswith(base):
                                out[n] = v
                                break
                return out
        except Exception:
            pass
        return dict(AVAILABLE_MODELS)

    def _detect_hardware_profile(self) -> str:
        v = self.system_vram
        return "scaling" if v >= 100 else "small_firm" if v >= 48 else "micro_team" if v >= 20 else "solo_practice"

    def get_moe_recommendation(self, complexity: TaskComplexity) -> Optional[str]:
        if complexity != TaskComplexity.COMPLEX:
            return None
        moe = [(n, c) for n, c in self.available_models.items() if c.is_moe and c.vram_gb <= self.system_vram]
        return moe[0][0] if moe else None

    def select_model(self, prompt: str, context: Optional[str] = None, preferred_model: Optional[str] = None, prefer_moe: bool = True) -> str:
        if preferred_model and preferred_model in self.available_models and self.available_models[preferred_model].vram_gb <= self.system_vram:
            return preferred_model
        task_type, complexity = self.analyzer.analyze(prompt, context)
        if prefer_moe and complexity == TaskComplexity.COMPLEX:
            moe = self.get_moe_recommendation(complexity)
            if moe:
                return moe
        cands = [(n, c) for n, c in self.available_models.items() if c.complexity == complexity and c.vram_gb <= self.system_vram]
        cands.sort(key=lambda x: x[1].avg_tokens_per_sec, reverse=True)
        return cands[0][0] if cands else next(iter(self.available_models.keys()), "phi3:mini")

    def chat(self, messages: List[Dict[str, str]], preferred_model: Optional[str] = None, **kwargs) -> str:
        last = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        model = self.select_model(last, preferred_model=preferred_model)
        prompt = "\n\n".join([f"{m['role'].title()}: {m['content']}" for m in messages]) + "\n\nAssistant:"
        r = requests.post(f"{self.ollama_url}/api/generate", json={"model": model, "prompt": prompt, "stream": False,
            "options": {"temperature": kwargs.get("temperature", 0.7), "num_predict": kwargs.get("max_tokens", 1024)}})
        r.raise_for_status()
        return r.json()["response"]

    def get_router_info(self) -> Dict:
        p = HARDWARE_PROFILES.get(self.hardware_profile, {})
        return {"ollama_url": self.ollama_url, "available_models": list(self.available_models.keys()),
            "system_vram_gb": self.system_vram, "hardware_profile": self.hardware_profile,
            "hardware_profile_info": p, "routing_enabled": True, "moe_enabled": True}

    def get_hardware_recommendations(self) -> Dict:
        p = HARDWARE_PROFILES.get(self.hardware_profile, {})
        profs = ["solo_practice", "micro_team", "small_firm", "scaling"]
        idx = profs.index(self.hardware_profile) if self.hardware_profile in profs else 0
        return {"current_profile": self.hardware_profile, "current_vram": self.system_vram,
            "recommended_models": p.get("recommended_models", []),
            "next_upgrade": profs[idx + 1] if idx < len(profs) - 1 else None}


def get_router(hardware_profile: str = None) -> LLMRouter:
    return LLMRouter(hardware_profile=hardware_profile)
