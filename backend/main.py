from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Deping Backend")

# CORS 설정 (프론트엔드에서 호출할 수 있게)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # 나중에 ngrok 주소로 제한 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Deping Backend가 정상적으로 실행 중입니다!",
        "status": "ok"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)