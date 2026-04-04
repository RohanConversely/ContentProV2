#!/usr/bin/env python3
import argparse
import asyncio
import logging
import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from playwright.async_api import Browser, BrowserContext, Error, Page, async_playwright

SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
FLOW_URL = "https://labs.google/fx/tools/flow"
DEFAULT_INPUT_DIR = Path("pipeline/reve/sample_bathmats")
DEFAULT_BASE_PROMPT_FILE = Path("pipeline/reve/bathmats_prompt2.txt")
DEFAULT_OUTPUT_ROOT = Path("pipeline/reve/flow_downloads")
GENERATION_ROUNDS_PER_IMAGE = 2

EMAIL_SELECTORS = [
    "input[type='email']",
    "input[name='identifier']",
    "input[autocomplete='username']",
]
PASSWORD_SELECTORS = [
    "input[type='password']",
    "input[name='Passwd']",
    "input[autocomplete='current-password']",
]
SUBMIT_SELECTORS = [
    "button:has-text('Next')",
    "button:has-text('Sign in')",
    "button:has-text('Login')",
    "button:has-text('Continue')",
    "button[type='submit']",
]
PROMPT_SELECTORS = [
    "textarea",
    "[contenteditable='true']",
    "div[role='textbox']",
]
UPLOAD_SELECTORS = [
    "input[type='file']",
]
GENERATE_SELECTORS = [
    "button:has-text('Generate')",
    "button:has-text('Run')",
    "button:has-text('Create')",
]
DOWNLOAD_SELECTORS = [
    "button:has-text('Download')",
    "[aria-label*='Download']",
    "[title*='Download']",
]

IMAGE_MODE_SELECTORS = [
    "button:has-text('Image')",
    "[role='tab']:has-text('Image')",
    "[aria-label*='Image mode']",
]
ASPECT_RATIO_MENU_SELECTORS = [
    "button:has-text('Aspect')",
    "[aria-label*='Aspect']",
    "[data-testid*='aspect']",
]
ASPECT_RATIO_1_1_SELECTORS = [
    "button:has-text('1:1')",
    "[role='option']:has-text('1:1')",
    "[role='radio']:has-text('1:1')",
]
IMAGE_COUNT_MENU_SELECTORS = [
    "button:has-text('Images')",
    "button:has-text('Image count')",
    "[aria-label*='Number of images']",
    "[data-testid*='image-count']",
]
IMAGE_COUNT_1_SELECTORS = [
    "button:has-text('1 image')",
    "[role='option']:has-text('1')",
    "[role='radio']:has-text('1')",
]
MODEL_MENU_SELECTORS = [
    "button:has-text('Model')",
    "[aria-label*='Model']",
    "[data-testid*='model']",
]
MODEL_NANOBANANA_PRO_SELECTORS = [
    "button:has-text('nanobanana pro')",
    "[role='option']:has-text('nanobanana pro')",
    "[role='menuitem']:has-text('nanobanana pro')",
]


class FlowAutomationError(RuntimeError):
    pass


def _setup_logger() -> logging.Logger:
    log_dir = Path("pipeline/storage/logs")
    log_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"flow_direct_{stamp}.log"

    logger = logging.getLogger("flow_direct")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    logger.propagate = False
    logger.info("Log file: %s", log_file.resolve())
    return logger


def _read_prompt(path: Path, label: str) -> str:
    if not path.exists():
        raise FlowAutomationError(f"{label} prompt file not found: {path}")

    text = path.read_text(encoding="utf-8").strip()
    if not text:
        raise FlowAutomationError(f"{label} prompt file is empty: {path}")
    return text


def _load_images(input_dir: Path, limit: int | None) -> list[Path]:
    if not input_dir.exists():
        raise FlowAutomationError(f"Input directory not found: {input_dir}")

    images = sorted(
        p for p in input_dir.iterdir() if p.is_file() and p.suffix.lower() in SUPPORTED_IMAGE_EXTS
    )
    if limit is not None:
        images = images[: max(limit, 0)]

    if not images:
        raise FlowAutomationError(f"No supported input images found in: {input_dir}")
    return images


async def _first_visible(page: Page, selectors: list[str], timeout_ms: int = 3000):
    for selector in selectors:
        locator = page.locator(selector).first
        try:
            await locator.wait_for(state="visible", timeout=timeout_ms)
            return locator
        except Error:
            continue
    return None


async def _first_attached(page: Page, selectors: list[str], timeout_ms: int = 3000):
    for selector in selectors:
        locator = page.locator(selector).first
        try:
            await locator.wait_for(state="attached", timeout=timeout_ms)
            return locator
        except Error:
            continue
    return None


async def _click_first(page: Page, selectors: list[str], timeout_ms: int = 4000) -> bool:
    for selector in selectors:
        locator = page.locator(selector).first
        try:
            await locator.wait_for(state="visible", timeout=timeout_ms)
            await locator.click()
            return True
        except Error:
            continue
    return False


async def _configure_project_settings(page: Page, logger: logging.Logger, session_name: str) -> None:
    image_mode_set = await _click_first(page, IMAGE_MODE_SELECTORS, timeout_ms=6000)
    if not image_mode_set:
        raise FlowAutomationError("Unable to select Image mode")
    await page.wait_for_timeout(400)

    aspect_set = await _click_first(page, ASPECT_RATIO_1_1_SELECTORS, timeout_ms=2500)
    if not aspect_set:
        await _click_first(page, ASPECT_RATIO_MENU_SELECTORS, timeout_ms=4000)
        await page.wait_for_timeout(300)
        aspect_set = await _click_first(page, ASPECT_RATIO_1_1_SELECTORS, timeout_ms=4000)
    if not aspect_set:
        raise FlowAutomationError("Unable to set aspect ratio to 1:1")
    await page.wait_for_timeout(300)

    image_count_set = await _click_first(page, IMAGE_COUNT_1_SELECTORS, timeout_ms=2500)
    if not image_count_set:
        await _click_first(page, IMAGE_COUNT_MENU_SELECTORS, timeout_ms=4000)
        await page.wait_for_timeout(300)
        image_count_set = await _click_first(page, IMAGE_COUNT_1_SELECTORS, timeout_ms=4000)
    if not image_count_set:
        raise FlowAutomationError("Unable to set number of images to 1")
    await page.wait_for_timeout(300)

    model_set = await _click_first(page, MODEL_NANOBANANA_PRO_SELECTORS, timeout_ms=2500)
    if not model_set:
        await _click_first(page, MODEL_MENU_SELECTORS, timeout_ms=4000)
        await page.wait_for_timeout(300)
        model_set = await _click_first(page, MODEL_NANOBANANA_PRO_SELECTORS, timeout_ms=5000)
    if not model_set:
        raise FlowAutomationError("Unable to set model to nanobanana pro")

    logger.info("%s | Project settings configured: image mode, 1:1, 1 image, nanobanana pro", session_name)


async def _fill_prompt(page: Page, prompt: str) -> None:
    prompt_box = await _first_visible(page, PROMPT_SELECTORS, timeout_ms=15000)
    if prompt_box is None:
        raise FlowAutomationError("Prompt input area not found on Flow page")

    tag_name = await prompt_box.evaluate("el => el.tagName.toLowerCase()")
    if tag_name == "textarea":
        await prompt_box.fill(prompt)
    else:
        await prompt_box.click()
        await page.keyboard.press("ControlOrMeta+A")
        await page.keyboard.press("Backspace")
        await prompt_box.type(prompt)


async def _upload_image(page: Page, image_path: Path) -> None:
    upload_input = await _first_attached(page, UPLOAD_SELECTORS, timeout_ms=15000)
    if upload_input is None:
        raise FlowAutomationError("Image upload input not found on Flow page")
    await upload_input.set_input_files(str(image_path.resolve()))


async def _click_generate(page: Page) -> None:
    generate_button = await _first_visible(page, GENERATE_SELECTORS, timeout_ms=15000)
    if generate_button is None:
        raise FlowAutomationError("Generate/Run/Create button not found on Flow page")
    await generate_button.click()


async def _save_download_or_screenshot(
    page: Page,
    output_file: Path,
    logger: logging.Logger,
    session_name: str,
) -> None:
    for selector in DOWNLOAD_SELECTORS:
        button = page.locator(selector).first
        try:
            await button.wait_for(state="visible", timeout=8000)
            async with page.expect_download(timeout=12000) as download_info:
                await button.click()
            download = await download_info.value
            await download.save_as(str(output_file))
            logger.info("%s | Saved download %s", session_name, output_file.resolve())
            return
        except Error:
            continue

    img = page.locator("img").last
    await img.wait_for(state="visible", timeout=10000)
    await img.screenshot(path=str(output_file))
    logger.info("%s | Saved fallback screenshot %s", session_name, output_file.resolve())


async def _login_if_needed(page: Page, email: str, password: str, logger: logging.Logger, session_name: str) -> None:
    await page.goto(FLOW_URL, wait_until="domcontentloaded")
    await page.wait_for_timeout(2000)

    email_box = await _first_visible(page, EMAIL_SELECTORS, timeout_ms=5000)
    if email_box is not None:
        await email_box.fill(email)
        submit = await _first_visible(page, SUBMIT_SELECTORS, timeout_ms=4000)
        if submit is not None:
            await submit.click()
        await page.wait_for_timeout(1500)

    password_box = await _first_visible(page, PASSWORD_SELECTORS, timeout_ms=5000)
    if password_box is not None:
        await password_box.fill(password)
        submit = await _first_visible(page, SUBMIT_SELECTORS, timeout_ms=4000)
        if submit is not None:
            await submit.click()

    await page.wait_for_timeout(4000)
    await page.goto(FLOW_URL, wait_until="domcontentloaded")
    await page.wait_for_timeout(3000)
    logger.info("%s | Login flow completed", session_name)


def _compose_prompt(base_prompt: str, round_index: int) -> str:
    if round_index == 1:
        return f"{base_prompt}".strip()

    variation_instruction = (
        "Generate another distinct output for the same product with a different composition "
        "and camera framing while preserving strict product fidelity."
    )
    return f"{base_prompt}\n\n{variation_instruction}".strip()


async def _run_for_image(
    page: Page,
    image_path: Path,
    base_prompt: str,
    output_root: Path,
    logger: logging.Logger,
    session_name: str,
) -> None:
    image_output_dir = output_root / image_path.stem / session_name
    image_output_dir.mkdir(parents=True, exist_ok=True)

    for round_index in range(1, GENERATION_ROUNDS_PER_IMAGE + 1):
        prompt = _compose_prompt(base_prompt, round_index)
        output_file = image_output_dir / f"round_{round_index}.png"

        logger.info("%s | %s | Round %d started", session_name, image_path.name, round_index)
        await page.goto(FLOW_URL, wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        await _configure_project_settings(page, logger, session_name)

        await _upload_image(page, image_path)
        await page.wait_for_timeout(1000)
        await _fill_prompt(page, prompt)
        await _click_generate(page)

        await page.wait_for_timeout(12000)
        await _save_download_or_screenshot(page, output_file, logger, session_name)


async def _create_session(browser: Browser, email: str, password: str, logger: logging.Logger, session_name: str):
    context = await browser.new_context(accept_downloads=True)
    page = await context.new_page()
    await _login_if_needed(page, email, password, logger, session_name)
    return context, page


async def _run(
    input_dir: Path,
    base_prompt_file: Path,
    output_root: Path,
    limit: int | None,
    headless: bool,
) -> None:
    load_dotenv()
    logger = _setup_logger()

    email = os.getenv("FLOW_EMAIL")
    password = os.getenv("FLOW_PASSWORD")
    if not email or not password:
        raise FlowAutomationError("FLOW_EMAIL or FLOW_PASSWORD missing in environment/.env")

    base_prompt = _read_prompt(base_prompt_file, "Base")
    images = _load_images(input_dir, limit)

    output_root.mkdir(parents=True, exist_ok=True)

    logger.info("Input images: %d", len(images))
    logger.info("Output root: %s", output_root.resolve())

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(channel="chrome", headless=headless)
        contexts: list[BrowserContext] = []
        pages: list[Page] = []

        try:
            for i in range(2):
                session_name = f"session_{i + 1}"
                context, page = await _create_session(browser, email, password, logger, session_name)
                contexts.append(context)
                pages.append(page)

            for start in range(0, len(images), 2):
                batch = images[start : start + 2]
                tasks = []
                for idx, image_path in enumerate(batch):
                    session_name = f"session_{idx + 1}"
                    tasks.append(
                        _run_for_image(
                            page=pages[idx],
                            image_path=image_path,
                            base_prompt=base_prompt,
                            output_root=output_root,
                            logger=logger,
                            session_name=session_name,
                        )
                    )
                await asyncio.gather(*tasks)

        finally:
            for context in contexts:
                await context.close()
            await browser.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Automate Google Flow image generation in two Chrome sessions.")
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--base-prompt-file", type=Path, default=DEFAULT_BASE_PROMPT_FILE)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--headless", action="store_true")
    args = parser.parse_args()

    try:
        asyncio.run(
            _run(
                input_dir=args.input_dir,
                base_prompt_file=args.base_prompt_file,
                output_root=args.output_root,
                limit=args.limit,
                headless=args.headless,
            )
        )
    except FlowAutomationError as exc:
        raise SystemExit(f"Flow automation failed: {exc}") from exc


if __name__ == "__main__":
    main()
