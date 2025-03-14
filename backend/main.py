# backend/main.py
import os
import uuid
import httpx
from fastapi import FastAPI, UploadFile, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI()

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 允许iframe源地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# RAGFlow配置（通过环境变量配置）
RAGFLOW_API_BASE = os.getenv("RAGFLOW_API_BASE", "http://localhost:9380")
RAGFLOW_API_KEY = os.getenv("ragflow-U3NjQxZmRhZmE4NzExZWY4ZTczMDI0Mm")  # 必须配置
MODEL_NAME = "deepseek-contract-law"

# 文件上传接口
@app.post("/api/upload")
async def upload_file(file: UploadFile):
    try:
        async with httpx.AsyncClient() as client:
            # 1. 上传文件到RAGFlow
            file_content = await file.read()
            upload_res = await client.post(
                f"{RAGFLOW_API_BASE}/documents",
                files={"file": (file.filename, file_content)},
                headers={"Authorization": f"Bearer {RAGFLOW_API_KEY}"},
                timeout=30.0
            )
            upload_res.raise_for_status()
            
            # 2. 返回文档ID
            document_id = upload_res.json()["document_id"]
            return JSONResponse({
                "status": "success",
                "document_id": document_id
            })
            
    except httpx.HTTPStatusError as e:
        return JSONResponse(
            {"status": "error", "detail": f"RAGFlow错误: {e.response.text}"},
            status_code=502
        )
    except Exception as e:
        return JSONResponse(
            {"status": "error", "detail": str(e)},
            status_code=500
        )

# WebSocket问答接口
@app.websocket("/ws/{document_id}")
async def websocket_qa(websocket: WebSocket, document_id: str):
    await websocket.accept()
    try:
        # 创建会话
        async with httpx.AsyncClient() as client:
            # 1. 初始化会话
            session_id = str(uuid.uuid4())
            chat_res = await client.post(
                f"{RAGFLOW_API_BASE}/chats",
                json={"document_id": document_id},
                headers={"Authorization": f"Bearer {RAGFLOW_API_KEY}"}
            )
            chat_res.raise_for_status()
            
            # 2. 处理消息流
            while True:
                question = await websocket.receive_text()
                async with client.stream(
                    "POST",
                    f"{RAGFLOW_API_BASE}/chats/{chat_res.json()['session_id']}/messages",
                    json={"content": question, "stream": True},
                    headers={"Authorization": f"Bearer {RAGFLOW_API_KEY}"},
                    timeout=30.0
                ) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_text():
                        await websocket.send_text(chunk)
                        
    except Exception as e:
        await websocket.send_json({"error": str(e)})
        await websocket.close()

# 健康检查
@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)