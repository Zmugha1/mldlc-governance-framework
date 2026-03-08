"""
AI Bill of Materials (AIBOM) Generator
Automated compliance documentation for AI systems
"""
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict, field
from datetime import datetime
from pathlib import Path


@dataclass
class AIBOM:
    """AI Bill of Materials - Complete AI system documentation"""
    system_name: str
    version: str
    generated_at: str
    system_description: str
    use_case: str
    risk_tier: str
    training_data: Dict[str, Any] = field(default_factory=dict)
    validation_data: Dict[str, Any] = field(default_factory=dict)
    test_data: Dict[str, Any] = field(default_factory=dict)
    model_architecture: Dict[str, Any] = field(default_factory=dict)
    training_procedure: Dict[str, Any] = field(default_factory=dict)
    performance_metrics: Dict[str, float] = field(default_factory=dict)
    software_dependencies: List[Dict[str, str]] = field(default_factory=list)
    hardware_requirements: Dict[str, Any] = field(default_factory=dict)
    compliance_status: Dict[str, Any] = field(default_factory=dict)
    known_limitations: List[str] = field(default_factory=list)
    ethical_considerations: List[str] = field(default_factory=list)
    deployment_config: Dict[str, Any] = field(default_factory=dict)
    monitoring_setup: Dict[str, Any] = field(default_factory=dict)
    maintenance_schedule: Dict[str, Any] = field(default_factory=dict)


class AIBOMGenerator:
    """
    Generate AI Bill of Materials for client delivery
    Creates comprehensive documentation for compliance
    """

    def __init__(self):
        self.template_dir = Path("templates/aibom")
        self.template_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, system_name: str,
                 model_registry=None,
                 feature_store=None,
                 audit_logger=None,
                 risk_classifier=None,
                 config: Optional[Dict] = None) -> AIBOM:
        """Generate AIBOM for a system"""
        now = datetime.utcnow().isoformat()
        config = config or {}

        model_info = {}
        if model_registry:
            model_info = model_registry.get_model(system_name) or {}

        features = []
        if feature_store:
            features = feature_store.list_features()

        risk_tier = "unknown"
        if risk_classifier and config.get("use_case"):
            assessment = risk_classifier.assess(
                system_name=system_name,
                use_case=config.get("use_case", ""),
                data_types=config.get("data_types", []),
                decision_autonomy=config.get("decision_autonomy", "assisted")
            )
            risk_tier = assessment.risk_tier

        aibom = AIBOM(
            system_name=system_name,
            version=model_info.get("version", config.get("version", "1.0.0")),
            generated_at=now,
            system_description=config.get("description", f"AI system: {system_name}"),
            use_case=config.get("use_case", "General purpose AI system"),
            risk_tier=risk_tier,
            training_data={
                "sources": config.get("training_sources", ["training_data.csv"]),
                "size": config.get("training_size", "unknown"),
                "preprocessing": config.get("preprocessing", "standard scaling, encoding"),
                "license": config.get("data_license", "proprietary"),
                "privacy_measures": config.get("privacy_measures", ["anonymization", "differential_privacy"])
            },
            validation_data={
                "sources": config.get("validation_sources", ["validation_data.csv"]),
                "size": config.get("validation_size", "unknown"),
                "split_method": config.get("validation_split", "stratified 80/20")
            },
            test_data={
                "sources": config.get("test_sources", ["test_data.csv"]),
                "size": config.get("test_size", "unknown"),
                "holdout": config.get("test_holdout", "temporal split")
            },
            model_architecture={
                "type": model_info.get("parameters", {}).get("architecture", config.get("architecture", "unknown")),
                "framework": config.get("framework", "unknown"),
                "parameters": model_info.get("parameters", {}),
                "training_date": model_info.get("created_at", now),
                "features_used": [f["name"] for f in features]
            },
            training_procedure={
                "algorithm": config.get("algorithm", "unknown"),
                "hyperparameters": model_info.get("parameters", {}),
                "compute_resources": config.get("compute", "unknown"),
                "training_duration": config.get("training_duration", "unknown"),
                "early_stopping": config.get("early_stopping", False),
                "regularization": config.get("regularization", ["L2"])
            },
            performance_metrics=model_info.get("metrics", config.get("metrics", {})),
            software_dependencies=config.get("dependencies", [
                {"name": "Python", "version": "3.9+", "license": "PSF"},
                {"name": "scikit-learn", "version": "1.3+", "license": "BSD"},
                {"name": "pandas", "version": "2.0+", "license": "BSD"}
            ]),
            hardware_requirements=config.get("hardware", {
                "cpu": "2+ cores", "memory": "4GB+", "storage": "10GB+", "gpu": "optional (for training)"
            }),
            compliance_status=config.get("compliance", {
                "eu_ai_act": "assessment_pending", "nist_ai_rmf": "partial",
                "iso_42001": "not_assessed", "gdpr": "compliant", "soc2": "not_assessed"
            }),
            known_limitations=config.get("limitations", [
                "Performance may vary on out-of-distribution data",
                "Requires periodic retraining to maintain accuracy",
                "May exhibit bias on underrepresented demographic groups",
                "Not suitable for safety-critical decisions without human oversight"
            ]),
            ethical_considerations=config.get("ethical", [
                "Fairness across demographic groups must be monitored",
                "Transparency in decision-making for affected individuals",
                "Privacy preservation of personal data",
                "Human oversight for high-stakes decisions"
            ]),
            deployment_config=config.get("deployment", {
                "environment": "production", "containerization": "Docker",
                "scaling": "auto-scaling enabled", "regions": ["us-east-1"],
                "backup_strategy": "daily snapshots"
            }),
            monitoring_setup=config.get("monitoring", {
                "drift_detection": "enabled (PSI, KS tests)",
                "performance_monitoring": "enabled (latency, throughput, accuracy)",
                "cost_tracking": "enabled (per-request billing)",
                "audit_logging": "enabled (immutable logs)",
                "alerting": "enabled (email, Slack)"
            }),
            maintenance_schedule=config.get("maintenance", {
                "retraining_frequency": "monthly or on drift detection",
                "model_review": "quarterly performance review",
                "compliance_audit": "annually",
                "security_patches": "as needed"
            })
        )
        return aibom

    def export_json(self, aibom: AIBOM, filepath: str):
        """Export AIBOM to JSON file"""
        with open(filepath, 'w') as f:
            json.dump(asdict(aibom), f, indent=2, default=str)

    def export_markdown(self, aibom: AIBOM, filepath: str):
        """Export AIBOM to Markdown for client delivery"""
        md = f"""# AI Bill of Materials

## {aibom.system_name}

**Version:** {aibom.version}  
**Generated:** {aibom.generated_at}  
**Risk Tier:** {aibom.risk_tier.upper()}

---

## Executive Summary

{aibom.system_description}

**Primary Use Case:** {aibom.use_case}

---

## 1. Data

### 1.1 Training Data

| Property | Value |
|----------|-------|
| Sources | {', '.join(aibom.training_data.get('sources', []))} |
| Size | {aibom.training_data.get('size', 'unknown')} |
| Preprocessing | {aibom.training_data.get('preprocessing', 'none')} |
| License | {aibom.training_data.get('license', 'unknown')} |

### 1.2 Validation Data

| Property | Value |
|----------|-------|
| Sources | {', '.join(aibom.validation_data.get('sources', []))} |
| Size | {aibom.validation_data.get('size', 'unknown')} |
| Split Method | {aibom.validation_data.get('split_method', 'unknown')} |

### 1.3 Test Data

| Property | Value |
|----------|-------|
| Sources | {', '.join(aibom.test_data.get('sources', []))} |
| Size | {aibom.test_data.get('size', 'unknown')} |
| Holdout | {aibom.test_data.get('holdout', 'unknown')} |

---

## 2. Model Architecture

**Type:** {aibom.model_architecture.get('type', 'unknown')}

**Framework:** {aibom.model_architecture.get('framework', 'unknown')}

**Training Date:** {aibom.model_architecture.get('training_date', 'unknown')}

### 2.1 Performance Metrics

| Metric | Value |
|--------|-------|
"""
        for metric, value in aibom.performance_metrics.items():
            md += f"| {metric} | {value} |\n"

        md += """
---

## 3. Dependencies

### 3.1 Software

| Package | Version | License |
|---------|---------|---------|
"""
        for dep in aibom.software_dependencies:
            md += f"| {dep.get('name', 'unknown')} | {dep.get('version', 'unknown')} | {dep.get('license', 'unknown')} |\n"

        md += f"""
### 3.2 Hardware Requirements

| Resource | Requirement |
|----------|-------------|
| CPU | {aibom.hardware_requirements.get('cpu', 'unknown')} |
| Memory | {aibom.hardware_requirements.get('memory', 'unknown')} |
| Storage | {aibom.hardware_requirements.get('storage', 'unknown')} |
| GPU | {aibom.hardware_requirements.get('gpu', 'unknown')} |

---

## 4. Compliance & Governance

### 4.1 Compliance Status

| Standard | Status |
|----------|--------|
"""
        for standard, status in aibom.compliance_status.items():
            md += f"| {standard.upper()} | {status} |\n"

        md += "\n### 4.2 Known Limitations\n\n"
        for limitation in aibom.known_limitations:
            md += f"- {limitation}\n"

        md += "\n### 4.3 Ethical Considerations\n\n"
        for consideration in aibom.ethical_considerations:
            md += f"- {consideration}\n"

        md += f"""
---

## 5. Operations

### 5.1 Deployment Configuration

| Property | Value |
|----------|-------|
| Environment | {aibom.deployment_config.get('environment', 'unknown')} |
| Containerization | {aibom.deployment_config.get('containerization', 'unknown')} |
| Scaling | {aibom.deployment_config.get('scaling', 'unknown')} |
| Regions | {', '.join(aibom.deployment_config.get('regions', []))} |

### 5.2 Monitoring Setup

| Component | Status |
|-----------|--------|
| Drift Detection | {aibom.monitoring_setup.get('drift_detection', 'disabled')} |
| Performance Monitoring | {aibom.monitoring_setup.get('performance_monitoring', 'disabled')} |
| Cost Tracking | {aibom.monitoring_setup.get('cost_tracking', 'disabled')} |
| Audit Logging | {aibom.monitoring_setup.get('audit_logging', 'disabled')} |

### 5.3 Maintenance Schedule

| Activity | Frequency |
|----------|-----------|
| Retraining | {aibom.maintenance_schedule.get('retraining_frequency', 'unknown')} |
| Model Review | {aibom.maintenance_schedule.get('model_review', 'unknown')} |
| Compliance Audit | {aibom.maintenance_schedule.get('compliance_audit', 'unknown')} |

---

## 6. Contact & Support

**DR Data Decision Intelligence**  
Documentation: https://docs.drdata.ai/{aibom.system_name}

---

*This AI Bill of Materials was automatically generated by the MLDLC Framework.*
"""
        with open(filepath, 'w') as f:
            f.write(md)

    def export_pdf(self, aibom: AIBOM, filepath: str):
        """Export AIBOM - creates Markdown, PDF requires pandoc"""
        md_path = filepath.replace('.pdf', '.md')
        self.export_markdown(aibom, md_path)
        print(f"Markdown exported to {md_path}")
        print(f"To convert to PDF: pandoc {md_path} -o {filepath}")


_generator = None


def get_aibom_generator() -> AIBOMGenerator:
    """Get or create AIBOM generator"""
    global _generator
    if _generator is None:
        _generator = AIBOMGenerator()
    return _generator
