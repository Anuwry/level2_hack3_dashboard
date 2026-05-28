import argparse
import asyncio
import json
from collections import Counter
from datetime import datetime
from pathlib import Path

import websockets


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = REPO_ROOT / "public" / "data" / "real_sessions" / "session_001"


class ReceiverState:
    def __init__(self):
        self.counts = Counter()


def resolve_output_dir(output_dir):
    path = Path(output_dir).expanduser()
    if path.is_absolute():
        return path
    return REPO_ROOT / path


def safe_filename(name):
    cleaned = Path(str(name)).name.strip()
    return cleaned or f"received_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"


def save_attached_file(event, output_dir):
    filename = (
        event.get("filename")
        or event.get("file_name")
        or (event.get("file") or {}).get("name")
    )
    if not filename:
        return None

    file_dir = output_dir / "incoming_files"
    file_dir.mkdir(parents=True, exist_ok=True)
    file_path = file_dir / safe_filename(filename)

    content = (
        event.get("content")
        or event.get("text")
        or event.get("csv")
        or (event.get("file") or {}).get("content")
    )
    if content is not None:
        file_path.write_text(str(content), encoding="utf-8")
        return file_path

    # Keep the raw event as a sidecar when the file payload is not text.
    file_path.with_suffix(file_path.suffix + ".event.json").write_text(
        json.dumps(event, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return file_path.with_suffix(file_path.suffix + ".event.json")


async def handle_client(websocket, output_dir, state):
    peer = getattr(websocket, "remote_address", None)
    print(f"Q connected peer={peer}", flush=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    jsonl_path = output_dir / "stream_events.jsonl"

    async for message in websocket:
        try:
            event = json.loads(message)
        except json.JSONDecodeError:
            print(f"bad_json={message[:120]}")
            continue

        event_type = event.get("type", "unknown")
        state.counts[event_type] += 1
        event["pc_receive_time"] = datetime.now().isoformat(timespec="milliseconds")
        print(
            f"received type={event_type} count={state.counts[event_type]} "
            f"total={sum(state.counts.values())}",
            flush=True,
        )

        with jsonl_path.open("a", encoding="utf-8") as file_handle:
            file_handle.write(json.dumps(event, separators=(",", ":")) + "\n")

        saved_file = save_attached_file(event, output_dir)
        if saved_file:
            print(f"saved_file={saved_file}", flush=True)

        if event_type == "hit_event":
            row = event.get("row") or {}
            context = event.get("merged_context") or {}
            print(
                "hit_event "
                f"final={row.get('final_class')} "
                f"contact={row.get('contact_class')} "
                f"sweet={row.get('sweet_spot_class')} "
                f"nano_g=({context.get('nano_gx_dps')},{context.get('nano_gy_dps')},{context.get('nano_gz_dps')}) "
                f"q_g=({context.get('q_gx_dps')},{context.get('q_gy_dps')},{context.get('q_gz_dps')})",
                flush=True,
            )
        elif event_type in {"marker", "event"}:
            row = event.get("row") or {}
            print(f"{event_type} label={row.get('label')} row={row}", flush=True)
        elif event_type == "gyro_sample" and state.counts[event_type] % 20 == 0:
            row = event.get("row") or {}
            print(
                "gyro_sample "
                f"seq={row.get('seq')} "
                f"nano_g=({row.get('nano_gx_dps')},{row.get('nano_gy_dps')},{row.get('nano_gz_dps')}) "
                f"q_g=({row.get('q_gx_dps')},{row.get('q_gy_dps')},{row.get('q_gz_dps')})",
                flush=True,
            )


async def main_async(args):
    output_dir = resolve_output_dir(args.output_dir)
    state = ReceiverState()

    async def handler(websocket):
        await handle_client(websocket, output_dir, state)

    async with websockets.serve(handler, args.host, args.port):
        print(f"Listening on ws://{args.host}:{args.port}", flush=True)
        print(f"Saving real session data to {output_dir}", flush=True)
        print(f"Saving JSONL to {output_dir / 'stream_events.jsonl'}", flush=True)
        await asyncio.Future()


def parse_args():
    parser = argparse.ArgumentParser(description="Receive badminton live WebSocket JSON from Arduino Q.")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    return parser.parse_args()


def main():
    asyncio.run(main_async(parse_args()))


if __name__ == "__main__":
    main()
