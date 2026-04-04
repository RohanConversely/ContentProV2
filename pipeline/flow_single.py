#!/usr/bin/env python3
"""
Google Flow Labs image generation automation — single session.
Processes images sequentially from an input directory and saves generated outputs.
"""

import argparse
import asyncio
import logging
import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from playwright.async_api import Error, Page, async_playwright

SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
FLOW_ABOUT_URL = "https://labs.google/flow/about"
FLOW_URL = "https://labs.google/fx/tools/flow"

DEFAULT_INPUT_DIR = Path("pipeline/reve/sample_bathmats")
DEFAULT_PROMPT_FILE = Path("pipeline/reve/bathmats_prompt2.txt")
DEFAULT_OUTPUT_ROOT = Path("pipeline/reve/flow_downloads")


# Login
EMAIL_SELECTORS = ["input[type='email']", "input[name='identifier']", "input[autocomplete='username']"]
PASSWORD_SELECTORS = ["input[type='password']", "input[name='Passwd']", "input[autocomplete='current-password']"]
SUBMIT_SELECTORS = [
    "button:has-text('Next')", "button:has-text('Sign in')",
    "button:has-text('Login')", "button:has-text('Continue')", "button[type='submit']",
]

# Prompt input
PROMPT_SELECTORS = ["textarea", "[contenteditable='true']", "div[role='textbox']"]

# Entry points
CREATE_WITH_FLOW_SELECTORS = [
    "a:has-text('Create with Flow')",
    "button:has-text('Create with Flow')",
    "[role='button']:has-text('Create with Flow')",
]
NEW_PROJECT_SELECTORS = [
    "button:has-text('+ New project')",
    "button:has-text('New project')",
    "[role='button']:has-text('New project')",
]
SETTINGS_TRIGGER_SELECTORS = [
    "button:has-text('Nano Banana')",
    "button:has-text('nanobanana')",
    "button:has-text('x4')",
    "button:has-text('x3')",
    "button:has-text('x2')",
    "button:has-text('x1')",
    "[aria-label*='settings']",
]

# Image upload
UPLOAD_SELECTORS = ["input[type='file']"]

# Generate
GENERATE_SELECTORS = ["button:has-text('Generate')", "button:has-text('Run')", "button:has-text('Create')"]

# Download
DOWNLOAD_SELECTORS = ["button:has-text('Download')", "[aria-label*='Download']", "[title*='Download']"]

# Image mode (tab)
IMAGE_MODE_SELECTORS = ["button:has-text('Image')", "[role='tab']:has-text('Image')", "[aria-label*='Image mode']"]

# Aspect ratio
ASPECT_MENU_SELECTORS = ["button:has-text('Aspect')", "[aria-label*='Aspect']", "[data-testid*='aspect']"]
ASPECT_1_1_SELECTORS = ["button:has-text('1:1')", "[role='option']:has-text('1:1')", "[role='radio']:has-text('1:1')"]

# Image count
COUNT_MENU_SELECTORS = ["button:has-text('Images')", "button:has-text('Image count')", "[aria-label*='Number of images']"]
COUNT_1_SELECTORS = ["button:has-text('x1')", "[role='tab']:has-text('x1')", "button:has-text('1 image')", "[role='option']:has-text('1')", "[role='radio']:has-text('1')"]

# Model
MODEL_MENU_SELECTORS = ["button:has-text('Model')", "[aria-label*='Model']", "[data-testid*='model']"]
MODEL_NANOBANANA_SELECTORS = [
    "button:has-text('nanobanana pro')", "[role='option']:has-text('nanobanana pro')",
    "[role='menuitem']:has-text('nanobanana pro')",
]


# -------------------------------------------------------------------------- #
# Helpers
# -------------------------------------------------------------------------- #

class FlowError(RuntimeError):
    pass


def setup_logger() -> logging.Logger:
    log_dir = Path("pipeline/storage/logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"flow_single_{stamp}.log"

    logger = logging.getLogger("flow_single")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")

    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    logger.addHandler(ch)
    logger.propagate = False
    logger.info("Log file: %s", log_file.resolve())
    return logger


async def _find(
    page: Page, selectors: list[str], state: str = "visible", timeout_ms: int = 4000
):
    """Return first matching locator that is in the given state, or None."""
    for sel in selectors:
        loc = page.locator(sel).first
        try:
            await loc.wait_for(state=state, timeout=timeout_ms)
            return loc
        except Error:
            continue
    return None


async def _click(page: Page, selectors: list[str], timeout_ms: int = 4000) -> bool:
    loc = await _find(page, selectors, "visible", timeout_ms)
    if loc is None:
        return False
    await loc.click()
    return True


def _read(path: Path, label: str) -> str:
    if not path.exists():
        raise FlowError(f"{label} file not found: {path}")
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        raise FlowError(f"{label} file is empty: {path}")
    return text


def _images(input_dir: Path, limit: int | None) -> list[Path]:
    if not input_dir.exists():
        raise FlowError(f"Input directory not found: {input_dir}")
    imgs = sorted(
        p for p in input_dir.iterdir()
        if p.is_file() and p.suffix.lower() in SUPPORTED_IMAGE_EXTS
    )
    if limit is not None:
        imgs = imgs[: max(limit, 0)]
    if not imgs:
        raise FlowError(f"No supported images found in: {input_dir}")
    return imgs


async def login_from_about(page: Page, email: str, password: str, logger: logging.Logger) -> None:
    """Open about page, click Create with Flow, then complete Google login if prompted."""
    await page.goto(FLOW_ABOUT_URL, wait_until="domcontentloaded")
    await page.wait_for_timeout(1500)

    create_btn = await _find(page, CREATE_WITH_FLOW_SELECTORS, "visible", 10000)
    if create_btn is not None:
        await create_btn.click()

    await page.wait_for_timeout(2000)

    email_box = await _find(page, EMAIL_SELECTORS, "visible", 5000)
    if email_box:
        await email_box.fill(email)
        await _click(page, SUBMIT_SELECTORS, 4000)
        await page.wait_for_timeout(1500)

    pwd_box = await _find(page, PASSWORD_SELECTORS, "visible", 5000)
    if pwd_box:
        await pwd_box.fill(password)
        await _click(page, SUBMIT_SELECTORS, 4000)

    await page.wait_for_timeout(4000)
    await page.goto(FLOW_URL, wait_until="domcontentloaded")
    await page.wait_for_timeout(3000)
    logger.info("Login + entry flow completed from about page")


async def open_new_project(page: Page, logger: logging.Logger) -> None:
    # Debug: take screenshot and dump HTML
    await page.screenshot(path="pipeline/storage/logs/debug_flow_page.png")
    logger.info("Saved debug screenshot: pipeline/storage/logs/debug_flow_page.png")
    html = await page.content()
    Path("pipeline/storage/logs/debug_flow_page.html").write_text(html, encoding="utf-8")
    logger.info("Saved debug HTML: pipeline/storage/logs/debug_flow_page.html")

    # Log current URL
    logger.info("Current URL: %s", page.url)

    created = await _click(page, NEW_PROJECT_SELECTORS, 10000)
    if not created:
        raise FlowError("Could not click + New project")

    prompt_box = await _find(page, PROMPT_SELECTORS, "visible", 12000)
    if prompt_box is None:
        raise FlowError("Project editor did not open after clicking + New project")


async def configure_settings(page: Page, logger: logging.Logger) -> None:
    """
    Set: Image mode, 1:1 aspect, 1 image, nanobanana pro model.
    Each setting has a fallback: direct click -> open menu -> click.
    """
    # Debug: take screenshot and dump HTML before settings
    await page.screenshot(path="pipeline/storage/logs/debug_before_settings.png")
    html = await page.content()
    Path("pipeline/storage/logs/debug_before_settings.html").write_text(html, encoding="utf-8")
    logger.info("Saved debug screenshot and HTML before settings")

    # Open the settings panel from the text box controls
    await _click(page, SETTINGS_TRIGGER_SELECTORS, 4000)
    await page.wait_for_timeout(400)

    # Image mode tab
    if not await _click(page, IMAGE_MODE_SELECTORS, 6000):
        raise FlowError("Could not select Image mode")
    await page.wait_for_timeout(400)

    # Aspect ratio 1:1
    set_ = await _click(page, ASPECT_1_1_SELECTORS, 2500)
    if not set_:
        await _click(page, ASPECT_MENU_SELECTORS, 4000)
        await page.wait_for_timeout(300)
        set_ = await _click(page, ASPECT_1_1_SELECTORS, 4000)
    if not set_:
        raise FlowError("Could not set aspect ratio to 1:1")
    await page.wait_for_timeout(300)

    # Debug: take screenshot before image count
    await page.screenshot(path="pipeline/storage/logs/debug_before_image_count.png")
    html = await page.content()
    Path("pipeline/storage/logs/debug_before_image_count.html").write_text(html, encoding="utf-8")
    logger.info("Saved debug screenshot and HTML before image count")

    # Image count = 1
    set_ = await _click(page, COUNT_1_SELECTORS, 2500)
    if not set_:
        await _click(page, COUNT_MENU_SELECTORS, 4000)
        await page.wait_for_timeout(300)
        set_ = await _click(page, COUNT_1_SELECTORS, 4000)
    if not set_:
        raise FlowError("Could not set image count to 1")
    await page.wait_for_timeout(300)

    # Model = nanobanana pro
    set_ = await _click(page, MODEL_NANOBANANA_SELECTORS, 2500)
    if not set_:
        await _click(page, MODEL_MENU_SELECTORS, 4000)
        await page.wait_for_timeout(300)
        set_ = await _click(page, MODEL_NANOBANANA_SELECTORS, 5000)
    if not set_:
        raise FlowError("Could not set model to nanobanana pro")

    logger.info("Settings configured: Image mode, 1:1, 1 image, nanobanana pro")


async def fill_prompt(page: Page, prompt: str) -> None:
    """Type prompt into the text box, using Ctrl+A to replace existing text."""
    box = await _find(page, PROMPT_SELECTORS, "visible", 15000)
    if box is None:
        raise FlowError("Prompt input area not found")

    tag = await box.evaluate("el => el.tagName.toLowerCase()")
    if tag == "textarea":
        await box.fill(prompt)
    else:
        await box.click()
        await page.keyboard.press("ControlOrMeta+A")
        await page.keyboard.press("Backspace")
        await box.type(prompt)


async def upload_image(page: Page, image_path: Path) -> None:
    inp = await _find(page, UPLOAD_SELECTORS, "attached", 15000)
    if inp is None:
        raise FlowError("Image upload input not found")
    await inp.set_input_files(str(image_path.resolve()))


async def click_generate(page: Page) -> None:
    btn = await _find(page, GENERATE_SELECTORS, "visible", 15000)
    if btn is None:
        raise FlowError("Generate/Run/Create button not found")
    await btn.click()


async def save_output(page: Page, output_file: Path, logger: logging.Logger) -> None:
    """Try download button first; fall back to screenshot of last image."""
    for sel in DOWNLOAD_SELECTORS:
        btn = page.locator(sel).first
        try:
            await btn.wait_for(state="visible", timeout=8000)
            async with page.expect_download(timeout=12000) as dl_info:
                await btn.click()
            dl = await dl_info.value
            await dl.save_as(str(output_file))
            logger.info("Saved download: %s", output_file.resolve())
            return
        except Error:
            continue

    # Fallback: screenshot the last img element
    img = page.locator("img").last
    await img.wait_for(state="visible", timeout=10000)
    await img.screenshot(path=str(output_file))
    logger.info("Saved fallback screenshot: %s", output_file.resolve())


async def run_for_image(
    page: Page,
    image_path: Path,
    prompt: str,
    output_dir: Path,
    logger: logging.Logger,
) -> None:
    """One round in existing project: upload -> prompt -> generate -> save."""
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"{image_path.stem}.png"

    logger.info("[%s] Round started", image_path.name)
    await upload_image(page, image_path)
    await page.wait_for_timeout(1000)
    await fill_prompt(page, prompt)
    await click_generate(page)

    await page.wait_for_timeout(12000)
    await save_output(page, output_file, logger)
    logger.info("[%s] Round done -> %s", image_path.name, output_file.resolve())


async def run(
    input_dir: Path,
    prompt_file: Path,
    output_root: Path,
    limit: int | None,
    headless: bool,
) -> None:
    load_dotenv()
    logger = setup_logger()

    email = os.getenv("FLOW_EMAIL")
    password = os.getenv("FLOW_PASSWORD")
    if not email or not password:
        raise FlowError("FLOW_EMAIL / FLOW_PASSWORD not set in environment or .env")

    prompt = _read(prompt_file, "Prompt")
    images = _images(input_dir, limit)
    output_root.mkdir(parents=True, exist_ok=True)

    logger.info("Images to process: %d", len(images))
    logger.info("Output root: %s", output_root.resolve())

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(channel="chrome", headless=headless)
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()

        try:
            await login_from_about(page, email, password, logger)
            await open_new_project(page, logger)
            await configure_settings(page, logger)

            for img_path in images:
                out_dir = output_root / img_path.stem
                try:
                    await run_for_image(page, img_path, prompt, out_dir, logger)
                except FlowError as exc:
                    logger.error("[%s] Failed: %s", img_path.name, exc)
                    continue

        finally:
            await context.close()
            await browser.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Google Flow Labs — single-session image generation.")
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--prompt-file", type=Path, default=DEFAULT_PROMPT_FILE)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--headless", action="store_true")
    args = parser.parse_args()

    try:
        asyncio.run(run(
            args.input_dir, args.prompt_file, args.output_root,
            args.limit, args.headless,
        ))
    except FlowError as exc:
        raise SystemExit(f"FlowError: {exc}") from exc


if __name__ == "__main__":
    main()
