from pathlib import Path
from importlib.machinery import SourceFileLoader

# Resolve project root and the path to the app source file
ROOT = Path(__file__).resolve().parents[2]
APP_FILE = ROOT / "docling" / "docling.py"

# Load the local FastAPI app module by file path to avoid conflicts
# with the installed `docling` package name.
_module_name = "_local_docling_app"
module = SourceFileLoader(_module_name, str(APP_FILE)).load_module()  # type: ignore[attr-defined]

# Expose the FastAPI app object for Uvicorn
app = getattr(module, "app")

# Optional: allow running directly via `python main.py` (useful without uvicorn CLI)
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
