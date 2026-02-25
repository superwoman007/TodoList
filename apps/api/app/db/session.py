from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# 功能描述：初始化数据库连接与会话工厂，提供 ORM 基类
# 参数说明：无（从环境变量读取数据库 URL）
# 返回值：Engine、SessionLocal、Base 基类，用于后续模型与数据库操作
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./todolist.db")

# SQLite 需加 connect_args，Postgres 不需要
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, echo=False, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()

# 功能描述：提供会话获取的上下文管理辅助函数
# 参数说明：无
# 返回值：生成器，产出数据库会话，确保使用后关闭
def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
