from fastapi import FastAPI, UploadFile, File
from docling.document_converter import DocumentConverter
import tempfile
import os

app = FastAPI(title="Docling Worker")

converter = DocumentConverter()

@app.post("/parse")
async def parse(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename)[1]

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    result = converter.convert(tmp_path)
    os.unlink(tmp_path)

    return {
        "markdown": result.document.export_to_markdown(),
        "metadata": result.document.metadata,
    }