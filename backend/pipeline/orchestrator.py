from __future__ import annotations

import asyncio
import json
import shutil
import tempfile
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .logger import JsonLogger
from .stages.image_gen_with_flux import generate_images as generate_images_flux
from .stages.image_gen_with_KYC import generate_images
from .stages.reve.image_gen_reve import generate_images as generate_images_reve
from .stages.product_kyc import generate_image_kyc


class PipelineStageError(RuntimeError):
    pass


def build_job_id() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"{ts}_{uuid.uuid4().hex[:8]}"


@dataclass
class JobContext:
    job_id: str
    brand_name: str
    brand_website: str
    product_name: str
    product_category: str
    image_paths: list[Path]
    social_link_1: str | None = None
    social_link_2: str | None = None
    additional_info: dict[str, Any] | None = None
    image_model: str = "reve"
    num_images: int = 6
    temperature: float = 0.1
    prompt_file: str = "ImageWithKYCTesting.txt"
    additional_description: str | None = None
    regeneration_only_inputs: bool = False
    workspace_root: Path | None = None
    work_dir: Path = field(init=False)
    product_kyc_dir: Path = field(init=False)
    generated_images_dir: Path = field(init=False)
    job_log_file: Path = field(init=False)

    def __post_init__(self) -> None:
        root = self.workspace_root
        if root is None:
            root = Path(tempfile.mkdtemp(prefix=f"contentpro_{self.job_id}_"))
        else:
            root = root.resolve()
            root.mkdir(parents=True, exist_ok=True)
        self.work_dir = root
        self.product_kyc_dir = self.work_dir / "stage_1"
        self.generated_images_dir = self.work_dir / "stage_2"
        self.job_log_file = self.work_dir / "job.log"
        self.product_kyc_dir.mkdir(parents=True, exist_ok=True)
        self.generated_images_dir.mkdir(parents=True, exist_ok=True)

    @property
    def image_path(self) -> Path:
        return self.image_paths[0]

    def cleanup(self) -> None:
        shutil.rmtree(self.work_dir, ignore_errors=True)


@dataclass
class StageArtifact:
    stage: str
    type: str
    path: str


@dataclass
class ImagePipelineResult:
    job_id: str
    status: str
    kyc_json_path: str
    filtered_kyc_json_path: str
    generated_images: list[str]
    artifacts: list[StageArtifact]
    workspace: str
    log_file: str

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["artifacts"] = [asdict(artifact) for artifact in self.artifacts]
        return payload


def build_logger(job_log_file: Path) -> JsonLogger:
    return JsonLogger(job_log_file=str(job_log_file), include_global_when_job_active=False)


def filter_kyc_for_stage2(source_path: Path, target_path: Path) -> Path:
    with open(source_path, "r", encoding="utf-8") as f:
        kyc_data = json.load(f)

    competitor_analysis = kyc_data.get("competitor_analysis")
    if isinstance(competitor_analysis, dict):
        for key in (
            "competitor_approaches",
            "common_themes",
            "gaps_weaknesses",
            "overused_approaches",
        ):
            competitor_analysis.pop(key, None)

    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(kyc_data, f, indent=2, ensure_ascii=False)

    return target_path.resolve()


async def _run_stage_1(ctx: JobContext, logger: JsonLogger) -> dict[str, Any]:
    return await asyncio.to_thread(
        generate_image_kyc,
        image_paths=[str(image_path.resolve()) for image_path in ctx.image_paths],
        brand_name=ctx.brand_name,
        brand_website=ctx.brand_website,
        product_name=ctx.product_name,
        product_category=ctx.product_category,
        social_link_1=ctx.social_link_1,
        social_link_2=ctx.social_link_2,
        additional_info=ctx.additional_info,
        output_dir=str(ctx.product_kyc_dir),
        logger_obj=logger,
        log_context={"job_id": ctx.job_id, "stage": "stage_1_product_kyc"},
    )


async def _run_stage_2(ctx: JobContext, filtered_kyc_path: Path | None, logger: JsonLogger) -> dict[str, Any]:
    stage_2_map = {
        "flux-2-pro": generate_images_flux,
        "gpt-image-1": generate_images,
        "reve": generate_images_reve,
    }
    stage_2_fn = stage_2_map.get(ctx.image_model)
    if stage_2_fn is None:
        raise PipelineStageError(f"Unsupported image model: {ctx.image_model}")

    prompt_file = ctx.prompt_file
    if ctx.image_model == "reve":
        prompt_file = "imageGen.txt"

    if not ctx.regeneration_only_inputs and filtered_kyc_path is None:
        raise PipelineStageError("KYC path is required for standard stage 2 generation.")

    return await asyncio.to_thread(
        stage_2_fn,
        image_paths=[str(image_path.resolve()) for image_path in ctx.image_paths],
        brand_name=ctx.brand_name,
        kyc_path=str(filtered_kyc_path.resolve()) if filtered_kyc_path is not None else "",
        num_images=ctx.num_images,
        temperature=ctx.temperature,
        output_dir=str(ctx.generated_images_dir),
        prompt_file=prompt_file,
        additional_description=ctx.additional_description,
        regeneration_only_inputs=ctx.regeneration_only_inputs,
        logger_obj=logger,
        log_context={"job_id": ctx.job_id, "stage": "stage_2_image_generation"},
    )


async def run_stage_2_only(ctx: JobContext, filtered_kyc_path: Path | None) -> dict[str, Any]:
    logger = build_logger(ctx.job_log_file)
    logger.info(
        "Stage 2 regeneration initialized.",
        {
            "job_id": ctx.job_id,
            "brand_name": ctx.brand_name,
            "product_name": ctx.product_name,
            "image_paths": [str(image_path.resolve()) for image_path in ctx.image_paths],
            "workspace": str(ctx.work_dir),
            "additional_description": ctx.additional_description,
        },
    )
    resolved_filtered_kyc_path = filtered_kyc_path.resolve() if filtered_kyc_path is not None else None
    stage_2_result = await _run_stage_2(ctx, resolved_filtered_kyc_path, logger)
    if not stage_2_result.get("ok"):
        raise PipelineStageError("Stage 2 failed to generate images.")

    generated_images = stage_2_result.get("generated_images")
    if not isinstance(generated_images, list) or not generated_images:
        raise PipelineStageError("Stage 2 returned no generated images.")

    image_paths = [str(Path(path).resolve()) for path in generated_images]
    for path in image_paths:
        if not Path(path).exists():
            raise PipelineStageError(f"Stage 2 output missing: {path}")

    logger.info(
        "Stage 2 regeneration completed.",
        {"job_id": ctx.job_id, "generated_images": image_paths, "count": len(image_paths)},
    )
    return {
        "ok": True,
        "generated_images": image_paths,
        "count": len(image_paths),
        "filtered_kyc_json_path": str(resolved_filtered_kyc_path) if resolved_filtered_kyc_path is not None else None,
    }


async def run_image_pipeline(ctx: JobContext) -> ImagePipelineResult:
    logger = build_logger(ctx.job_log_file)
    logger.info(
        "Job initialized.",
        {
            "job_id": ctx.job_id,
            "brand_name": ctx.brand_name,
            "brand_website": ctx.brand_website,
            "product_name": ctx.product_name,
            "product_category": ctx.product_category,
            "image_paths": [str(image_path.resolve()) for image_path in ctx.image_paths],
            "workspace": str(ctx.work_dir),
        },
    )

    stage_1_result = await _run_stage_1(ctx, logger)
    if not stage_1_result.get("ok"):
        raise PipelineStageError("Stage 1 failed to generate KYC.")

    kyc_json_path = Path(stage_1_result["kyc_json_path"]).resolve()
    if not kyc_json_path.exists():
        raise PipelineStageError(f"Stage 1 output missing: {kyc_json_path}")

    filtered_kyc_path = filter_kyc_for_stage2(
        kyc_json_path,
        ctx.product_kyc_dir / f"{kyc_json_path.stem}_filtered.json",
    )
    logger.info(
        "Filtered KYC prepared for image generation.",
        {"job_id": ctx.job_id, "kyc_json_path": str(filtered_kyc_path)},
    )

    stage_2_result = await _run_stage_2(ctx, filtered_kyc_path, logger)
    if not stage_2_result.get("ok"):
        raise PipelineStageError("Stage 2 failed to generate images.")

    generated_images = stage_2_result.get("generated_images")
    if not isinstance(generated_images, list) or not generated_images:
        raise PipelineStageError("Stage 2 returned no generated images.")

    image_paths = [str(Path(path).resolve()) for path in generated_images]
    for path in image_paths:
        if not Path(path).exists():
            raise PipelineStageError(f"Stage 2 output missing: {path}")

    logger.info(
        "Image pipeline completed.",
        {"job_id": ctx.job_id, "generated_images": image_paths, "count": len(image_paths)},
    )

    artifacts = [
        StageArtifact(stage="stage_1", type="kyc_json", path=str(kyc_json_path)),
        StageArtifact(stage="stage_1", type="filtered_kyc_json", path=str(filtered_kyc_path)),
        *[
            StageArtifact(stage="stage_2", type="generated_image", path=path)
            for path in image_paths
        ],
    ]

    return ImagePipelineResult(
        job_id=ctx.job_id,
        status="completed",
        kyc_json_path=str(kyc_json_path),
        filtered_kyc_json_path=str(filtered_kyc_path),
        generated_images=image_paths,
        artifacts=artifacts,
        workspace=str(ctx.work_dir),
        log_file=str(ctx.job_log_file),
    )
