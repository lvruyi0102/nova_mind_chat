#!/usr/bin/env python3
"""Compare multiple GitHub Models for latency and token usage."""

from __future__ import annotations

import argparse
import os
import sys
import time
from typing import Iterable

from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential

DEFAULT_ENDPOINT = "https://models.github.ai/inference"
DEFAULT_MODELS = ["openai/gpt-4.1", "openai/gpt-4.1-mini"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare GitHub Models by one shared prompt.")
    parser.add_argument(
        "--models",
        nargs="+",
        default=DEFAULT_MODELS,
        help="Model IDs to compare.",
    )
    parser.add_argument(
        "--prompt",
        default="Summarize why CI pipelines need deterministic package manager versions in 3 bullet points.",
    )
    parser.add_argument(
        "--system",
        default="You are a concise DevOps assistant.",
    )
    parser.add_argument("--temperature", type=float, default=0.3)
    parser.add_argument("--top-p", type=float, default=1.0)
    parser.add_argument("--max-tokens", type=int, default=300)
    return parser.parse_args()


def resolve_token() -> str:
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GITHUB_MODELS_TOKEN")
    if not token:
        raise RuntimeError("Missing token. Set GITHUB_TOKEN (or GITHUB_MODELS_TOKEN).")
    return token


def iter_results(models: Iterable[str], args: argparse.Namespace, token: str):
    client = ChatCompletionsClient(
        endpoint=DEFAULT_ENDPOINT,
        credential=AzureKeyCredential(token),
    )

    for model in models:
        started = time.perf_counter()
        try:
            response = client.complete(
                messages=[SystemMessage(args.system), UserMessage(args.prompt)],
                temperature=args.temperature,
                top_p=args.top_p,
                max_tokens=args.max_tokens,
                model=model,
            )
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            usage = getattr(response, "usage", None)
            prompt_tokens = getattr(usage, "prompt_tokens", None)
            completion_tokens = getattr(usage, "completion_tokens", None)
            total_tokens = getattr(usage, "total_tokens", None)
            output = response.choices[0].message.content.strip().replace("\n", " ")
            yield {
                "model": model,
                "latency_ms": elapsed_ms,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "preview": output[:140],
                "error": "",
            }
        except Exception as exc:  # noqa: BLE001
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            yield {
                "model": model,
                "latency_ms": elapsed_ms,
                "prompt_tokens": "-",
                "completion_tokens": "-",
                "total_tokens": "-",
                "preview": "",
                "error": str(exc).replace("\n", " ")[:200],
            }


def main() -> int:
    args = parse_args()

    try:
        token = resolve_token()
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    print("| model | latency(ms) | prompt_tokens | completion_tokens | total_tokens | status | preview |")
    print("|---|---:|---:|---:|---:|---|---|")

    has_error = False
    for row in iter_results(args.models, args, token):
        status = "ok" if not row["error"] else f"error: {row['error']}"
        if row["error"]:
            has_error = True
        print(
            f"| {row['model']} | {row['latency_ms']} | {row['prompt_tokens']} | "
            f"{row['completion_tokens']} | {row['total_tokens']} | {status} | {row['preview']} |"
        )

    return 1 if has_error else 0


if __name__ == "__main__":
    raise SystemExit(main())
