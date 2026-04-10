from fastapi import APIRouter

router = APIRouter()

notes = []

@router.get("/notes")
def get_notes():
    return notes

@router.post("/notes")
def add_note(note: dict):
    notes.append(note)
    return {"status": "added"}
