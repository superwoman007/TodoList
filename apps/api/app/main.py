from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db.init_db import init_db
from .routers.auth import router as auth_router
from .routers.todos import router as todos_router
from .routers.tags import router as tags_router
from .routers.subtasks import router as subtasks_router
from .routers.reminders import router as reminders_router
from .routers.scene_templates import router as scene_templates_router


@asynccontextmanager
async def lifespan(application: FastAPI):
    """启动时初始化数据库表，关闭时可做清理。"""
    init_db()
    yield


def create_app() -> FastAPI:
    application = FastAPI(title="TodoList API", version="0.2.0", lifespan=lifespan)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/health")
    def health():
        return {"status": "ok"}

    application.include_router(auth_router)
    application.include_router(todos_router)
    application.include_router(tags_router)
    application.include_router(subtasks_router)
    application.include_router(reminders_router)
    application.include_router(scene_templates_router)

    return application


app = create_app()
