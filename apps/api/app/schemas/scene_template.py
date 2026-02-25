from pydantic import BaseModel
from datetime import datetime


class SceneTemplateItemCreate(BaseModel):
    title: str
    description: str | None = None
    priority: str = "normal"
    order: int = 0


class SceneTemplateItemOut(BaseModel):
    id: int
    title: str
    description: str | None
    priority: str
    order: int

    class Config:
        from_attributes = True


class SceneTemplateCreate(BaseModel):
    name: str
    icon: str = "📋"
    description: str | None = None
    items: list[SceneTemplateItemCreate] = []


class SceneTemplateUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    description: str | None = None
    items: list[SceneTemplateItemCreate] | None = None


class SceneTemplateOut(BaseModel):
    id: int
    name: str
    icon: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    items: list[SceneTemplateItemOut] = []

    class Config:
        from_attributes = True
