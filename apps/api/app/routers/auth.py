from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.session import get_session
from ..models.user import User
from ..schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from ..services.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
# 功能描述：用户注册并返回访问令牌
# 参数说明：req（注册信息），db（数据库会话）
# 返回值：TokenResponse，包含 bearer 令牌
def register(req: RegisterRequest, db: Session = Depends(get_session)):
    existed = db.query(User).filter(User.email == req.email).first()
    if existed:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=req.email, password_hash=hash_password(req.password), display_name=req.display_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(sub=str(user.id))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
# 功能描述：用户登录并返回访问令牌
# 参数说明：req（登录信息），db（数据库会话）
# 返回值：TokenResponse，包含 bearer 令牌
def login(req: LoginRequest, db: Session = Depends(get_session)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(sub=str(user.id))
    return TokenResponse(access_token=token)
