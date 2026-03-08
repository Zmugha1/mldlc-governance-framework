"""
Enhanced LLM Service with Audit and Cost Tracking
"""
from typing import Optional, Dict, Any
import os

# Import our new components
from ..governance.audit_logger import get_audit_logger
from ..monitoring.cost_tracker import get_cost_tracker
from ..governance.hitl_framework import get_hitl_framework, EscalationReason


class LLMService:
    """
    Unified LLM service with governance integration

    Features:
    - Automatic audit logging
    - Cost tracking per request
    - HITL escalation checks
    """

    def __init__(self):
        self.openai_client = None
        if os.getenv("OPENAI_API_KEY"):
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            except ImportError:
                pass

        self.audit = get_audit_logger()
        self.cost_tracker = get_cost_tracker()
        self.hitl = get_hitl_framework()

    def generate(self, prompt: str, model: Optional[str] = None,
                 user_id: str = "anonymous", session_id: str = "default",
                 enable_hitl: bool = True, **kwargs) -> Dict[str, Any]:
        """
        Generate response with full governance tracking

        Args:
            prompt: Input prompt
            model: Model to use (defaults to router selection)
            user_id: User making the request
            session_id: Session identifier
            enable_hitl: Whether to enable HITL checks
            **kwargs: Additional parameters (complexity, risk_score, context)
        """
        # Get model from router if not specified
        if model is None:
            from .llm_router import get_router
            router = get_router()
            complexity = kwargs.get("complexity", "medium")
            model = router.select_model(prompt, complexity)

        # Generate response
        try:
            if model and model.startswith("gpt-") and self.openai_client:
                response = self._call_openai(prompt, model, **kwargs)
            else:
                response = self._call_ollama(prompt, model or "phi3:mini", **kwargs)

            # Calculate actual cost (approximate tokens)
            tokens_in = len(prompt.split()) * 4 // 3  # rough token estimate
            tokens_out = len(response.get("content", "").split()) * 4 // 3

            cost_result = self.cost_tracker.record_usage(
                model_id=model, tokens_in=tokens_in, tokens_out=tokens_out,
                user_id=user_id, session_id=session_id,
                operation_type=kwargs.get("operation_type", "chat")
            )

            # Log to audit trail
            audit_hash = self.audit.log_llm_call(
                user_id=user_id,
                session_id=session_id,
                model_id=model,
                prompt=prompt,
                response=response.get("content", ""),
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                cost=cost_result["cost_usd"]
            )

            # HITL check if enabled
            if enable_hitl and "confidence" in response:
                should_escalate, reasons = self.hitl.should_escalate(
                    confidence_score=response.get("confidence", 0.9),
                    risk_score=kwargs.get("risk_score", 0.5),
                    context=kwargs.get("context")
                )

                if should_escalate:
                    escalation_id = self.hitl.create_escalation(
                        session_id=session_id,
                        user_id=user_id,
                        ai_decision={"content": response["content"], "model": model},
                        confidence_score=response.get("confidence", 0.9),
                        risk_score=kwargs.get("risk_score", 0.5),
                        reasons=reasons,
                        context=kwargs.get("context")
                    )
                    response["escalation_id"] = escalation_id
                    response["requires_review"] = True

            # Add cost info to response
            response["cost_usd"] = cost_result["cost_usd"]
            response["audit_hash"] = audit_hash

            return response

        except Exception as e:
            # Log error to audit
            self.audit.log_event(
                event_type="llm_error",
                user_id=user_id,
                session_id=session_id,
                model_id=model,
                input_data={"prompt": prompt[:500]},
                output_data={"error": str(e)},
                metadata={"exception_type": type(e).__name__}
            )
            raise

    def _call_openai(self, prompt: str, model: str, **kwargs) -> Dict:
        """Call OpenAI API"""
        response = self.openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=kwargs.get("temperature", 0.7),
            max_tokens=kwargs.get("max_tokens", 1000)
        )

        content = response.choices[0].message.content
        return {
            "content": content,
            "model": model,
            "usage": getattr(response.usage, "_previous", {}),
            "confidence": 0.9  # OpenAI doesn't provide logprobs by default
        }

    def _call_ollama(self, prompt: str, model: str, **kwargs) -> Dict:
        """Call Ollama API via router"""
        from .llm_router import get_router
        router = get_router()
        messages = [{"role": "user", "content": prompt}]
        content = router.chat(messages, preferred_model=model, **kwargs)

        return {
            "content": content,
            "model": model,
            "confidence": 0.9  # Ollama doesn't provide confidence
        }


# Singleton
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get or create singleton LLM service"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
