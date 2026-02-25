from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from ..db.session import Base


class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="todo", index=True)
    priority = Column(String(50), default="normal", index=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    list_id = Column(Integer, ForeignKey("lists.id"), nullable=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    scene_template_id = Column(Integer, ForeignKey("scene_templates.id", ondelete="SET NULL"), nullable=True, index=True)
    scene_template_name = Column(String(255), nullable=True)

    list = relationship("List", back_populates="todos")
    owner = relationship("User", back_populates="todos")
    tags = relationship("Tag", secondary="todo_tags", backref="todos", lazy="joined")
