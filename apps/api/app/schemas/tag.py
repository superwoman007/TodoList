from pydantic import BaseModel

# 功能描述：标签请求与响应数据模型
# 参数说明：name（名称）、color（颜色）
# 返回值：Pydantic 模型用于请求与响应体验证
class TagCreate(BaseModel):
    name: str
    color: str | None = None


class TagOut(BaseModel):
    id: int
    name: str
    color: str | None

    class Config:
        from_attributes = True
