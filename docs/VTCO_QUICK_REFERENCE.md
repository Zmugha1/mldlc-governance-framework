# VTCO Quick Reference (Job Task Analysis)

## When asked "What is VTCO?"

> *"VTCO comes from Job Task Analysis in instructional design. I adapted it for ML governance:*
>
> - **V**erb: The action—Are we training? Deploying? Monitoring?
> - **T**ask: The ML operation—Classification? Feature engineering?
> - **C**onstraint: The guardrails—4/5ths rule? Latency limits? No PII?
> - **O**utcome: The deliverable—Not 'improve accuracy' but 'Model artifact with AUC ≥0.85 and SHAP explainability'
>
> *Before any code is written, we define the VTCO. This determines which Zone (Challenger/Contender/Champion) and which Gate (0-6) the work belongs to. It's how I ensure governance without slowing down experimentation."*

## Verb → Zone Mapping

| Verb | Zone |
|------|------|
| Experiment, Define, Ingest, Engineer | CHALLENGER |
| Train, Evaluate, Validate | CONTENDER |
| Deploy, Monitor, Audit | CHAMPION |

## Verb → Gate Mapping

| Verb | Target Gate |
|------|-------------|
| Define | 0 |
| Ingest | 1 |
| Engineer | 2 |
| Train | 3 |
| Evaluate, Validate | 4 |
| Deploy, Monitor | 5 |
| Audit | 6 |
