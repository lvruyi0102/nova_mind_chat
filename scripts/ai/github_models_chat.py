#!/usr/bin/env python3
"""GitHub Models quickstart chat script.

Usage:
  export GITHUB_TOKEN=...
  python scripts/ai/github_models_chat.py --prompt "What is the capital of France?"
"""

from __future__ import annotations

import argparse
import os
import sys

from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential

DEFAULT_ENDPOINT = "https://models.github.ai/inference"
DEFAULT_MODEL = "openai/gpt-4.1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Call GitHub Models chat completion API.")
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Model ID to use (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--prompt",
        default="What is the capital of France?",
        help="User prompt text.",
    )
    parser.add_argument(
        "--system",
        default="You are a helpful assistant.",
        help="System prompt text.",
    )
    parser.add_argument("--temperature", type=float, default=1.0)
    parser.add_argument("--top-p", type=float, default=1.0)
    parser.add_argument("--max-tokens", type=int, default=512)
    return parser.parse_args()


def resolve_token() -> str:
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GITHUB_MODELS_TOKEN")
    if not token:
        raise RuntimeError(
            "Missing token. Set GITHUB_TOKEN (or GITHUB_MODELS_TOKEN) before running."
        )
    return token


def main() -> int:
    args = parse_args()

    try:
        token = resolve_token()
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    client = ChatCompletionsClient(
        endpoint=DEFAULT_ENDPOINT,
        credential=AzureKeyCredential(token),
    )

    response = client.complete(
        messages=[
            SystemMessage(args.system),
            UserMessage(args.prompt),
        ],
        temperature=args.temperature,
        top_p=args.top_p,
        max_tokens=args.max_tokens,
        model=args.model,
    )

    print(response.choices[0].message.content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
