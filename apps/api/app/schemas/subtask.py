from pydantic import BaseModel

# 功能描述：子任务请求与响应数据模型
# 参数说明：title（标题）、done（完成状态）、order（排序）
# 返回值：Pydantic 模型用于请求与响应体验证
class SubtaskCreate(BaseModel):
    title: str
    done: bool = False
    order: int = 0


class SubtaskUpdate(BaseModel):
    title: str | None = None
    done: bool | None = None
    order: int | None = None


class SubtaskOut(BaseModel):
    id: int
    parent_todo_id: int
    title: str
    done: bool
    order: int

    class Config:
        from_attributes = True
