from sqlalchemy.orm import Session
from .session import Base, engine
from ..models.list import List  # noqa: F401
from ..models.todo import Todo  # noqa: F401
from ..models.user import User  # noqa: F401
from ..models.tag import Tag  # noqa: F401
from ..models.todo_tag import TodoTag  # noqa: F401
from ..models.subtask import Subtask  # noqa: F401
from ..models.reminder import Reminder  # noqa: F401
from ..models.scene_template import SceneTemplate, SceneTemplateItem  # noqa: F401

# 功能描述：初始化数据库（仅用于开发环境），创建所有模型对应的表
# 参数说明：无
# 返回值：无
def init_db() -> None:
    Base.metadata.create_all(bind=engine)
