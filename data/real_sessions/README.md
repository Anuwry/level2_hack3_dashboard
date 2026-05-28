# Real Session Data

`src/receiver.py` saves incoming WebSocket data under `public/data/real_sessions` by default so the local dashboard can fetch it directly.

Default session folder:

```text
public/data/real_sessions/session_001/
```

Files created by the receiver:

- `stream_events.jsonl` - every incoming JSON event, one event per line.
- `incoming_files/` - attached text or CSV files when an event includes `filename` plus `content`, `text`, or `csv`.

Run:

```powershell
python src\receiver.py
```

Use another folder when needed:

```powershell
python src\receiver.py --output-dir public\data\real_sessions\session_002
```
