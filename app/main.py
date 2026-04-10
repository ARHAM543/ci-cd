import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes import router

app = FastAPI(title="Azure FastAPI CI/CD App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"message": "Backend Running \ud83d\ude80"}

# Serve the Vite Frontend (only if dist built)
if os.path.isdir("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
else:
    @app.get("/")
    def home():
        return {"message": "Frontend not built yet. Run 'npm run build' inside the frontend directory, or use Vite dev server."}
