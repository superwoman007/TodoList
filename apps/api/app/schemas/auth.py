from pydantic import BaseModel, EmailStr, Field

# 功能描述：登录与注册请求数据模型
# 参数说明：email（邮箱）、password（密码）
# 返回值：Pydantic 模型用于请求体验证
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# 功能描述：令牌响应数据模型
# 参数说明：access_token（访问令牌）、token_type（令牌类型）
# 返回值：Pydantic 模型用于响应体
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
