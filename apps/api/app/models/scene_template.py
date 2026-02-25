from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from ..db.session import Base


class SceneTemplate(Base):
    """场景模版：如出差、旅行等预设检查清单"""
    __tablename__ = "scene_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    icon = Column(String(50), default="📋")
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User")
    items = relationship("SceneTemplateItem", back_populates="template", cascade="all, delete-orphan", order_by="SceneTemplateItem.order")


class SceneTemplateItem(Base):
    """场景模版中的检查项"""
    __tablename__ = "scene_template_items"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("scene_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(50), default="normal")
    order = Column(Integer, default=0)

    template = relationship("SceneTemplate", back_populates="items")
