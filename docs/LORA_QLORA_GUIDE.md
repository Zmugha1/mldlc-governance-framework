# LoRA and QLoRA Fine-Tuning Guide
## Sandi Bot — Future Training Roadmap
### Dr. Data Decision Intelligence LLC

---

## What Is LoRA

LoRA = Low-Rank Adaptation.

A full model like qwen2.5:7b has 7 billion
parameters. Fine-tuning all of them requires
massive compute and memory.

LoRA instead adds small adapter matrices
alongside the existing weights:

```
Original weight matrix W (frozen):
  7,000,000,000 parameters — never changed

LoRA adapter matrices A and B (trainable):
  ~1,000,000 parameters — only these update

During inference:
  output = W·x + (A·B)·x·scaling_factor
```

Result: 99.9% less memory than full fine-tuning.
Quality: Within 1-3% of full fine-tuning.

---

## What Is QLoRA

QLoRA = Quantized LoRA.

Takes LoRA further:
- Base model loaded in 4-bit quantization
- LoRA adapters trained in 16-bit
- Memory usage: ~6GB for 7B model training

This means you can fine-tune qwen2.5:7b
on Sandi's 16GB laptop in theory —
though a dedicated training machine
is strongly recommended.

---

## Why You Would Fine-Tune

Right now qwen2.5:7b is a general model.
It knows nothing about:

- TES franchise coaching methodology
- CLEAR framework
- DISC interpretation for franchise context
- You 2.0 assessment structure
- What "pink flags" mean in this context
- Sandi's specific coaching language

Fine-tuning teaches the model your domain.
After fine-tuning:
- Fewer hallucinations on domain terms
- Better JSON structure compliance
- Understands "C1 to C2 transition" natively
- Extracts TUMAY fields correctly first time

---

## Prerequisites Before Fine-Tuning

Do NOT attempt fine-tuning until:

```
□ 500+ extraction_corrections records
  (you need enough examples to learn from)

□ 100+ confirmed You2 profiles
  (ground truth for training)

□ 50+ Fathom transcripts with corrections
  (domain-specific training data)

□ Dedicated training machine OR
  cloud GPU (A100 40GB recommended)
  (Sandi's laptop is for inference only)

□ Evaluation set held out
  (never train on your test data)
```

Current state (March 2026): 17 clients.
Target for first training run: 100+ clients.
Estimated timeline: Month 6-12 of retainer.

---

## Your Training Data Pipeline

### Step 1 — Export from SQLite to JSONL

```python
# scripts/export_training_data.py

import sqlite3
import json

conn = sqlite3.connect('sandi_bot.db')

# Export You2 extractions as training pairs
cursor = conn.execute('''
  SELECT 
    de.raw_text as input,
    json_object(
      'one_year_vision', y.one_year_vision,
      'top_3_dangers', y.top_3_dangers,
      'top_3_strengths', y.top_3_strengths,
      'top_3_opportunities', y.top_3_opportunities
    ) as output
  FROM document_extractions de
  JOIN client_you2_profiles y 
    ON de.client_id = y.client_id
  WHERE de.document_type = 'you2'
  AND de.extraction_status = 'complete'
''')

with open('training_data/you2_train.jsonl', 'w') as f:
  for row in cursor:
    example = {
      "instruction": "Extract You2 profile fields from this TES coaching assessment document.",
      "input": row['input'][:4000],  # Truncate to context window
      "output": row['output']
    }
    f.write(json.dumps(example) + '\n')

print(f"Exported {cursor.rowcount} training examples")
```

### Step 2 — Apply corrections as preference data

```python
# Export correction pairs as DPO training data
# DPO = Direct Preference Optimization

cursor = conn.execute('''
  SELECT 
    ec.field_name,
    ec.original_value as rejected,
    ec.corrected_value as chosen,
    de.raw_text as prompt
  FROM extraction_corrections ec
  JOIN document_extractions de
    ON ec.client_id = de.client_id
    AND ec.document_type = de.document_type
''')

with open('training_data/corrections_dpo.jsonl', 'w') as f:
  for row in cursor:
    example = {
      "prompt": row['prompt'][:2000],
      "chosen": row['chosen'],
      "rejected": row['rejected']
    }
    f.write(json.dumps(example) + '\n')
```

---

## QLoRA Training Setup

### Hardware Requirements

```
Minimum (slow but works):
  GPU: RTX 3090 24GB VRAM
  RAM: 32GB
  Time: ~4 hours per training run

Recommended:
  GPU: A100 40GB (cloud: ~$3/hour on Lambda)
  RAM: 64GB
  Time: ~45 minutes per training run

Cloud options:
  Lambda Labs:  A100 ~$1.50/hour
  RunPod:       A100 ~$2.00/hour
  Vast.ai:      A100 ~$1.00/hour (variable)

Estimated cost per training run: $5-15
```

### Python Dependencies

```bash
pip install transformers==4.40.0
pip install peft==0.10.0
pip install trl==0.8.6
pip install bitsandbytes==0.43.1
pip install datasets==2.19.0
pip install torch==2.3.0
```

### Training Script

```python
# scripts/train_qlora.py

from transformers import (
  AutoModelForCausalLM,
  AutoTokenizer,
  BitsAndBytesConfig,
  TrainingArguments
)
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer
from datasets import load_dataset
import torch

MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"
OUTPUT_DIR = "./models/sandi-bot-v1"

# 4-bit quantization config
bnb_config = BitsAndBytesConfig(
  load_in_4bit=True,
  bnb_4bit_quant_type="nf4",
  bnb_4bit_compute_dtype=torch.bfloat16,
  bnb_4bit_use_double_quant=True
)

# Load base model in 4-bit
model = AutoModelForCausalLM.from_pretrained(
  MODEL_ID,
  quantization_config=bnb_config,
  device_map="auto"
)

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

# LoRA configuration
lora_config = LoraConfig(
  r=16,              # Rank — higher = more capacity
  lora_alpha=32,     # Scaling factor
  target_modules=[   # Which layers to adapt
    "q_proj",
    "k_proj", 
    "v_proj",
    "o_proj"
  ],
  lora_dropout=0.05,
  bias="none",
  task_type="CAUSAL_LM"
)

# Apply LoRA
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# Output: trainable params: 6,815,744 (0.10%)

# Load your training data
dataset = load_dataset(
  "json",
  data_files={
    "train": "training_data/you2_train.jsonl",
    "test": "training_data/you2_eval.jsonl"
  }
)

# Training arguments
training_args = TrainingArguments(
  output_dir=OUTPUT_DIR,
  num_train_epochs=3,
  per_device_train_batch_size=4,
  gradient_accumulation_steps=4,
  warmup_steps=100,
  learning_rate=2e-4,
  bf16=True,
  logging_steps=10,
  evaluation_strategy="epoch",
  save_strategy="epoch",
  load_best_model_at_end=True
)

# Train
trainer = SFTTrainer(
  model=model,
  train_dataset=dataset["train"],
  eval_dataset=dataset["test"],
  args=training_args,
  tokenizer=tokenizer,
  max_seq_length=2048
)

trainer.train()

# Save LoRA adapter only (small — ~50MB)
model.save_pretrained(f"{OUTPUT_DIR}/adapter")
tokenizer.save_pretrained(f"{OUTPUT_DIR}/adapter")

print("Training complete. Adapter saved.")
```

---

## Deploying Fine-Tuned Model With Ollama

After training, convert adapter to GGUF
and add to Ollama:

```bash
# 1. Merge adapter into base model
python scripts/merge_adapter.py \
  --base Qwen/Qwen2.5-7B-Instruct \
  --adapter ./models/sandi-bot-v1/adapter \
  --output ./models/sandi-bot-v1/merged

# 2. Convert to GGUF format
python llama.cpp/convert.py \
  ./models/sandi-bot-v1/merged \
  --outtype q4_k_m \
  --outfile sandi-bot-v1.gguf

# 3. Create Ollama modelfile
cat > Modelfile << EOF
FROM ./sandi-bot-v1.gguf
SYSTEM "You are a coaching intelligence
assistant for TES franchise coach Sandi Stahl.
You understand DISC profiling, You 2.0
assessments, and the CLEAR coaching framework."
EOF

# 4. Add to Ollama
ollama create sandi-bot-v1 -f Modelfile

# 5. Update documentExtractionService.ts
# const OLLAMA_MODEL = 'sandi-bot-v1';
```

---

## Training Roadmap

```
Month 1-3:   Collect corrections (current)
             Build extraction_corrections table
             Every human review = training signal

Month 4-6:   First evaluation
             Do correction rates justify training?
             Target: 50+ corrections per doc type

Month 6:     First QLoRA run
             Dataset: You2 extractions + corrections
             Model: qwen2.5:7b-instruct-q4_k_m
             Expected improvement: 15-25% accuracy

Month 9:     Second run with Fathom data
             Include DPO preference pairs
             Expected improvement: 25-40% accuracy

Month 12:    Production fine-tuned model
             sandi-bot-v1 replaces qwen2.5:7b
             Deployed via Ollama locally
             Zero cloud dependency maintained

Year 2:      Multi-coach training
             Fred Webster data added
             sandi-bot-v2 trained on 2 coaches
             Generalization across TES network
```

---

## Important Warnings

```
NEVER fine-tune on:
  - Unconfirmed extractions
  - Hallucinated data
  - Data without human review

ALWAYS:
  - Hold out 20% of data for evaluation
  - Compare fine-tuned vs base on eval set
  - Only deploy if improvement is measurable
  - Keep base model as fallback

The governance principle applies to training:
  Human confirms data → data enters training
  Unconfirmed data → never used for training
```

---

Last updated: March 2026
Developer: Dr. Data — Decision Intelligence
