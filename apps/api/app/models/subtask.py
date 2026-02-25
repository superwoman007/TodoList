from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from ..db.session import Base

# 功能描述：定义子任务的数据库模型
# 参数说明：无
# 返回值：SQLAlchemy ORM 模型类，用于映射数据库表
class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(Integer, primary_key=True, index=True)
    parent_todo_id = Column(Integer, ForeignKey("todos.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    done = Column(Boolean, default=False)
    order = Column(Integer, default=0)

    # 关系：父任务
    parent = relationship("Todo", backref="subtasks")
