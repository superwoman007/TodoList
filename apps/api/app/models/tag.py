from sqlalchemy import Column, Integer, String
from ..db.session import Base

# 功能描述：定义标签的数据库模型
# 参数说明：无
# 返回值：SQLAlchemy ORM 模型类，用于映射数据库表
class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), unique=True, index=True, nullable=False)
    color = Column(String(32), nullable=True)
