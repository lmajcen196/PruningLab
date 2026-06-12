# PruningLab - Evaluating LLM Pruning as a Defense Against Jailbreak Attacks

A research-oriented framework for evaluating the effectiveness of **Activation-Based Pruning** and **Magnitude-Based Pruning** as defense mechanisms against jailbreak attacks on Large Language Models (LLMs).

The application enables users to select different jailbreak attack techniques, apply pruning methods to language models, and analyze how pruning affects attack success rates and overall model utility.

This project was developed as part of a bachelor's thesis focused on:

> Using neural network pruning techniques to improve the robustness of Large Language Models against jailbreak attacks while preserving model functionality.

---

# Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Supported Pruning Methods](#supported-pruning-methods)
- [Supported Models](#supported-models)
- [Supported Jailbreak Attacks](#supported-jailbreak-attacks)
- [Project Structure](#project-structure)
- [Running Locally](#running-locally)
- [Frontend Configuration](#frontend-configuration)
- [Backend Configuration](#backend-configuration)
- [RunPod Deployment](#runpod-deployment)
- [Docker Deployment](#docker-deployment)
- [Statistics and Evaluation](#statistics-and-evaluation)
- [Development Notes](#development-notes)

---

# Overview

Large Language Models are vulnerable to various jailbreak attacks that attempt to bypass safety mechanisms and force the model to generate harmful or restricted content.

This project investigates whether pruning parts of the neural network can reduce the effectiveness of such attacks.

The application allows users to:

- Select a language model
- Select a jailbreak attack
- Apply a pruning method
- Configure pruning percentage
- Execute multiple experiments
- Compare base and pruned model behavior
- Analyze collected statistics

The primary evaluation objective is:

> Reduce jailbreak success rate while preserving benign model capabilities.

---

# Features

### Jailbreak Attack Evaluation

Test models against multiple jailbreak attack strategies.

### Activation-Based Pruning

Prunes neurons identified as highly activated during successful jailbreak attacks.

### Magnitude-Based Pruning

Prunes weights with the smallest absolute values.

### Multi-Model Support

Compare pruning behavior across different models.

### Statistical Analysis

Track:

- Attack Success Rate (ASR)
- Accuracy
- Safe / Unsafe classifications
- Base vs Pruned model comparison

### Multiple Experiments

Run the same experiment multiple times and compare aggregated results.

### RunPod Integration

Supports GPU inference through RunPod deployment.

---

# Architecture

```text
┌──────────────────────┐
│      Frontend        │
│    React + Vite      │
│      Port 5173       │
└──────────┬───────────┘
           │ HTTP
           ▼
┌──────────────────────┐
│       Backend        │
│       FastAPI        │
│      Port 8000       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ HuggingFace Models   │
│  CPU / GPU Inference │
└──────────────────────┘
```

---

# Supported Pruning Methods

## Activation-Based Pruning

Activation-Based Pruning identifies neurons that are strongly associated with successful jailbreak attacks.

### Workflow

1. Collect neuron activations using calibration datasets.
2. Compare activations between refused and successful jailbreak prompts.
3. Calculate attack importance scores.
4. Generate activation score files.
5. Prune neurons with the highest attack importance.

This method is currently available only for models that have precomputed activation score files.

---

## Magnitude-Based Pruning

Magnitude-Based Pruning removes weights with the smallest absolute values.

### Workflow

1. Extract model weights.
2. Calculate absolute weight magnitudes.
3. Determine pruning threshold.
4. Zero-out weights below the threshold.

This method can be applied to any supported model.

---

# Supported Models

The framework currently supports the following instruction-tuned Large Language Models:

| Model                    | Parameters | Activation-Based Pruning | Magnitude-Based Pruning |
|--------------------------|------------|--------------------------|-------------------------|
| Llama-3-8B-Instruct      |    8B      |           ✅             |            ✅            |
| Gemma-2-9B-Instruct      |    9B      |           ✅             |            ✅            |
| Mistral-7B-Instruct-v0.2 |    7B      |           ✅             |            ✅            |

## Model Selection

The user can choose any supported model through the web interface.

Each model can be evaluated using:

- No pruning (baseline)
- Activation-Based Pruning
- Magnitude-Based Pruning

The framework automatically loads the selected model and applies the selected pruning configuration before executing jailbreak attack experiments.

## Activation-Based Pruning Requirements

Activation-Based Pruning requires a previously generated activation score file for the selected model.

Example:

```text
activation_scores.json
```

These files are generated during the calibration phase using the Activation-Based Pruning pipeline and are later used to identify neurons associated with jailbreak behavior.

## Magnitude-Based Pruning Requirements

Magnitude-Based Pruning does not require calibration datasets or activation score files.

The pruning process is performed directly on model weights during runtime by removing weights with the lowest absolute magnitude.

# Supported Jailbreak Attacks

The framework currently supports:

- DAN
- DAN 6
- DAN 9
- DAN 11
- STAN
- Mongo Tom
- Role Playing
- Chain of Questions
- ASCII Art Jailbreak
- Base64 Encoded Attack
- Base64 + Competing Objective
- ROT13 Attack
- Ubbi Dubbi Attack
- Aigy Paigy Attack
- General Instruction Override
- General Policy Probe

Additional attacks can easily be integrated into the framework.

---

# Project Structure

```text
Završni/
│
├── backend/
│   ├── attacks/
│   ├── defenses/
│   ├── apply_attack.py
│   ├── experiment_runner.py
│   ├── main.py
│   ├── model_service.py
│   ├── pruning_runtime.py
│   ├── schemas.py
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── statistics/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── pruning/
│   ├── activation_scores/
│   ├── notebooks/
│   └── datasets/
│
├── k8s/
│
├── docker-compose.yml
├── Dockerfile.backend
└── README.md
```

---

# Running Locally

Local execution is intended for development and testing.

---

## Backend

Move into the backend directory:

```bash
cd backend
```

Create virtual environment:

```bash
python -m venv venv
```

Activate environment:

### macOS/Linux

```bash
source venv/bin/activate
```

### Windows

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start FastAPI:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend API:

```text
http://localhost:8000
```

Swagger documentation:

```text
http://localhost:8000/docs
```

---

## Frontend

Move into frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# Frontend Configuration

The frontend communicates with the backend through an API endpoint.

For local development:

```ts
const API_URL = "http://localhost:8000";
```

For RunPod deployment:

```ts
const API_URL =
  "https://YOUR_RUNPOD_ENDPOINT.proxy.runpod.net";
```

---

# Backend Configuration

The main inference endpoint is:

```http
POST /generate
```

Example request:

```json
{
  "model": "mistral-7b-instruct",
  "attack": "dan11",
  "prompt": "Explain how a neural network works.",
  "pruning_method": "activation_based",
  "pruning_percent": 50,
  "num_experiments": 5,
  "max_new_tokens": 150,
  "temperature": 0.7
}
```

---

# RunPod Deployment

Production inference is executed on GPU instances hosted on RunPod.

---

## Build Docker Image

Build and push a new image whenever backend code changes.

```bash
docker buildx build \
  --platform linux/amd64 \
  -t lmajcen/pruninglab-backend:v1 \
  --push .
```

Example:

```bash
docker buildx build \
  --platform linux/amd64 \
  --no-cache \
  -t lmajcen/pruninglab-backend:v3 \
  --push .
```

---

## Update RunPod Template

1. Open RunPod Templates.
2. Select the backend template.
3. Replace the Docker image.
4. Save the template.

Example image:

```text
lmajcen/pruninglab-backend:v3
```

---

## Launch Pod

Create a new GPU pod using the template.

Once started, RunPod will generate a public endpoint similar to:

```text
https://xxxxxxxx.proxy.runpod.net
```

---

## Update Frontend Endpoint

Replace:

```ts
const API_URL = "http://localhost:8000";
```

with:

```ts
const API_URL =
  "https://xxxxxxxx.proxy.runpod.net";
```

---

## Important RunPod Notes

### When must a new Docker image be built?

You MUST rebuild and push a new image when:

- Backend code changes
- FastAPI routes change
- Model loading changes
- Pruning implementation changes
- Requirements change

### When is rebuilding NOT necessary?

You do NOT need to rebuild if:

- A pod is stopped
- A pod is restarted
- RunPod shuts down
- You create a new pod from the same template

In these cases RunPod simply pulls the existing Docker image.

---

# Docker Deployment

Build image:

```bash
docker build -t pruninglab-backend .
```

Run container:

```bash
docker run -p 8000:8000 pruninglab-backend
```

---

# Statistics and Evaluation

The framework collects experiment results and calculates metrics used in the thesis evaluation.

### Attack Success Rate (ASR)

Measures how often jailbreak attacks successfully bypass model safety mechanisms.

### Accuracy

Measures classification performance on evaluation datasets.

### Base vs Pruned Comparison

Direct comparison between:

- Original model
- Pruned model

### Pruning Analysis

Compare results across:

- Different models
- Different pruning percentages
- Different pruning methods
- Different jailbreak attacks

The goal is to identify pruning configurations that significantly reduce ASR while maintaining acceptable utility.

---

# Development Notes

### Activation-Based Pruning

Requires activation score files generated from calibration datasets.

### Magnitude-Based Pruning

Can be applied directly without any calibration stage.

### Recommended Experimental Workflow

1. Generate activation scores.
2. Apply Activation-Based Pruning.
3. Apply Magnitude-Based Pruning.
4. Execute evaluation experiments.
5. Compare Attack Success Rate.
6. Compare model utility.
7. Analyze collected statistics.

---

# Author

**Luka Majcen**

Faculty of Electrical Engineering and Computing (FER)

Bachelor Thesis Project

**Pruning-Based Defense Against Jailbreak Attacks on Large Language Models**