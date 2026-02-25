from pydantic import BaseModel
from datetime import datetime
from .subtask import SubtaskOut
from .tag import TagOut

# 功能描述：任务创建与更新请求数据模型
# 参数说明：title、description、status、priority、due_date、list_id
# 返回值：Pydantic 模型用于请求体验证
class TodoCreate(BaseModel):
    title: str
    description: str | None = None
    status: str = "todo"
    priority: str = "normal"
    due_date: datetime | None = None
    list_id: int | None = None


class TodoUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: datetime | None = None
    list_id: int | None = None
    order: int | None = None


# 功能描述：任务响应数据模型
# 参数说明：任务各字段
# 返回值：Pydantic 模型用于响应体
class TodoOut(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    priority: str
    due_date: datetime | None
    order: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    list_id: int | None
    scene_template_id: int | None = None
    scene_template_name: str | None = None
    subtasks: list[SubtaskOut] = []
    tags: list[TagOut] = []

    class Config:
        from_attributes = True
