from pydantic import BaseModel
from datetime import datetime

# 功能描述：提醒请求与响应数据模型
# 参数说明：time（时间）、repeat_rule（重复规则）、channel（通知通道）、enabled（启用）
# 返回值：Pydantic 模型用于请求与响应体验证
class ReminderCreate(BaseModel):
    time: datetime
    repeat_rule: str | None = None
    channel: str = "inapp"
    enabled: bool = True


class ReminderUpdate(BaseModel):
    time: datetime | None = None
    repeat_rule: str | None = None
    channel: str | None = None
    enabled: bool | None = None


class ReminderOut(BaseModel):
    id: int
    todo_id: int
    time: datetime
    repeat_rule: str | None
    channel: str
    enabled: bool

    class Config:
        from_attributes = True
