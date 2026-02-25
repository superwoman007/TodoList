from sqlalchemy import Column, Integer, DateTime, String, Boolean, ForeignKey
from ..db.session import Base

# 功能描述：定义提醒的数据库模型
# 参数说明：无
# 返回值：SQLAlchemy ORM 模型类，用于映射数据库表
class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    todo_id = Column(Integer, ForeignKey("todos.id", ondelete="CASCADE"), nullable=False, index=True)
    time = Column(DateTime, nullable=False)
    repeat_rule = Column(String(64), nullable=True)
    channel = Column(String(32), default="inapp")
    enabled = Column(Boolean, default=True)
