#!/usr/bin/env python3
import sys
import argparse
import json
from factory.deepseek_agent import DeepSeekAgent

def main():
    parser = argparse.ArgumentParser(description="Query DeepSeek AI Agent for Nepali Lyric Auto-Completion.")
    parser.add_argument("--prompt", type=str, required=True, help="Input song lines written so far.")
    parser.add_argument("--lines", type=int, default=4, help="Number of next lines to auto-complete (e.g. 3 or 4).")
    parser.add_argument("--artist", type=str, default="", help="Optional artist style (e.g. Narayan Gopal, Sushant KC).")
    parser.add_argument("--mood", type=str, default="", help="Optional song mood/emotion.")
    parser.add_argument("--json", action="store_true", help="Output results as structured JSON.")

    args = parser.parse_args()

    agent = DeepSeekAgent()
    result = agent.generate_completion(
        current_lines=args.prompt,
        num_lines_to_generate=args.lines,
        artist_hint=args.artist,
        mood_hint=args.mood
    )

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("=" * 60)
        print("🤖 DEEPSEEK AGENTIC NEPALI LYRIC AUTO-COMPLETION")
        print("=" * 60)
        print("\n[INPUT LINES SO FAR]:")
        print(result['input_lines'])
        print("\n[AGENT REASONING SCRATCHPAD]:")
        for step in result['reasoning_steps']:
            print(f" - {step}")
        print(f"\n[AUTO-COMPLETED NEXT {result['num_lines_generated']} LINES]:")
        print(result['generated_lines'])
        print("\n[FULL COMBINED LYRICS]:")
        print(result['full_lyrics'])
        print("=" * 60)

if __name__ == "__main__":
    main()
