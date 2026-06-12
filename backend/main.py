import asyncio
import uuid
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import GenerateRequest
from model_service import get_available_models, get_device
from experiment_runner import run_base_vs_pruned_experiments


app = FastAPI(
    title="Model Pruning Backend",
    description="Backend for testing base and pruned language models.",
    version="2.1.2",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS = {}
EXECUTOR = ThreadPoolExecutor(max_workers=1)


@app.get("/")
def root():
    return {"message": "Model Pruning Backend is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok", "device": get_device()}


@app.get("/models")
def models():
    return {"models": get_available_models()}


def run_job_sync(job_id: str, req_data: dict):
    JOBS[job_id]["status"] = "running"
    JOBS[job_id]["started_at"] = datetime.utcnow().isoformat()

    try:
        req = GenerateRequest(**req_data)

        results = asyncio.run(
            run_base_vs_pruned_experiments(
                attack=req.attack,
                model_id=req.model,
                prompt=req.prompt,
                pruning_method=req.pruning_method or "none",
                pruning_percent=req.pruning_percent or 0.0,
                num_experiments=req.num_experiments,
                max_new_tokens=req.max_new_tokens or 100,
                temperature=req.temperature or 0.7,
            )
        )

        JOBS[job_id]["status"] = "completed"
        JOBS[job_id]["finished_at"] = datetime.utcnow().isoformat()
        JOBS[job_id]["result"] = {
            "model": req.model,
            "attack": req.attack,
            "prompt": req.prompt,
            "pruning_method": req.pruning_method,
            "pruning_percent": req.pruning_percent,
            "num_experiments": req.num_experiments,
            "summary": results["summary"],
            "results": results["results"],
        }

    except Exception as e:
        JOBS[job_id]["status"] = "failed"
        JOBS[job_id]["finished_at"] = datetime.utcnow().isoformat()
        JOBS[job_id]["error"] = str(e)


@app.post("/generate-job")
def generate_job(req: GenerateRequest):
    job_id = str(uuid.uuid4())

    JOBS[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "created_at": datetime.utcnow().isoformat(),
        "started_at": None,
        "finished_at": None,
        "error": None,
        "result": None,
        "future": None,
    }

    future = EXECUTOR.submit(run_job_sync, job_id, req.model_dump())
    JOBS[job_id]["future"] = future

    return {"job_id": job_id, "status": "queued"}


@app.get("/experiment-status/{job_id}")
def experiment_status(job_id: str):
    job = JOBS.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": job["job_id"],
        "status": job["status"],
        "created_at": job["created_at"],
        "started_at": job["started_at"],
        "finished_at": job["finished_at"],
        "error": job["error"],
    }


@app.get("/experiment-result/{job_id}")
def experiment_result(job_id: str):
    job = JOBS.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": job_id,
        "status": job["status"],
        "error": job["error"],
        "result": job["result"],
    }


@app.post("/generate")
async def generate(req: GenerateRequest):
    results = await run_base_vs_pruned_experiments(
        attack=req.attack,
        model_id=req.model,
        prompt=req.prompt,
        pruning_method=req.pruning_method or "none",
        pruning_percent=req.pruning_percent or 0.0,
        num_experiments=req.num_experiments,
        max_new_tokens=req.max_new_tokens or 100,
        temperature=req.temperature or 0.7,
    )

    return {
        "model": req.model,
        "attack": req.attack,
        "prompt": req.prompt,
        "pruning_method": req.pruning_method,
        "pruning_percent": req.pruning_percent,
        "num_experiments": req.num_experiments,
        "summary": results["summary"],
        "results": results["results"],
    }