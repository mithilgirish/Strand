from fastapi import APIRouter, UploadFile, File

router = APIRouter()

@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    return {
        "document_id": "doc_stub_123",
        "filename": file.filename,
        "status": "ingested",
        "node_count": 15
    }

@router.get("/documents/{doc_id}")
async def get_document_status(doc_id: str):
    return {
        "document_id": doc_id,
        "status": "processed",
        "node_count": 15,
        "chunks_count": 22
    }
