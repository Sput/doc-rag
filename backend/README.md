# Backend (Python) Business Logic

This folder hosts Python business logic, isolated from the Next.js app.

## Layout
- `src/bizlogic/`: reusable functions and modules
- `scripts/`: small scripts or CLIs for local execution
- `requirements.txt`: Python dependencies (empty for now)

## Quickstart
1. Create a virtualenv:
   - macOS/Linux: `python3 -m venv .venv && source .venv/bin/activate`
   - Windows (PowerShell): `py -m venv .venv; .venv\\Scripts\\Activate.ps1`
2. Install deps: `pip install -r requirements.txt`
3. Run demo: `python scripts/demo.py`

You can import from the `bizlogic` package by running commands from the `backend/` folder or by setting `PYTHONPATH` to include `backend/src`.

## Notes
- Keep this layer pure and decoupled from web concerns (no framework assumptions).
- If you later want to expose this to the Next.js app, consider:
  - Running a small API (e.g., FastAPI) as a separate service; or
  - A queued/job-based interface; or
  - A simple CLI you call from Node (for offline tasks).
