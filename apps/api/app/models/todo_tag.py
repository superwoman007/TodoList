from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from ..db.session import Base

# 功能描述：定义任务与标签的关联表
# 参数说明：无
# 返回值：SQLAlchemy ORM 模型类，用于映射数据库表
class TodoTag(Base):
    __tablename__ = "todo_tags"
    __table_args__ = (UniqueConstraint("todo_id", "tag_id", name="uq_todo_tag"),)

    id = Column(Integer, primary_key=True, index=True)
    todo_id = Column(Integer, ForeignKey("todos.id", ondelete="CASCADE"), nullable=False, index=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False, index=True)
