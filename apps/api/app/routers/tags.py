from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db.session import get_session
from ..models.tag import Tag
from ..models.todo_tag import TodoTag
from ..models.todo import Todo
from ..schemas.tag import TagCreate, TagOut

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[TagOut])
# 功能描述：获取标签列表
# 参数说明：db（数据库会话）
# 返回值：TagOut 列表
def list_tags(db: Session = Depends(get_session)):
    return db.execute(select(Tag).order_by(Tag.name)).scalars().all()


@router.post("", response_model=TagOut, status_code=201)
# 功能描述：创建标签
# 参数说明：req（创建请求），db（数据库会话）
# 返回值：新建标签响应体
def create_tag(req: TagCreate, db: Session = Depends(get_session)):
    existed = db.query(Tag).filter(Tag.name == req.name).first()
    if existed:
        raise HTTPException(status_code=400, detail="Tag already exists")
    tag = Tag(**req.model_dump())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.post("/bind/{todo_id}/{tag_id}", status_code=204)
# 功能描述：为任务绑定标签
# 参数说明：todo_id（任务ID）、tag_id（标签ID），db（数据库会话）
# 返回值：无（204 No Content）
def bind_tag(todo_id: int, tag_id: int, db: Session = Depends(get_session)):
    todo = db.get(Todo, todo_id)
    tag = db.get(Tag, tag_id)
    if not todo or not tag:
        raise HTTPException(status_code=404, detail="Todo or Tag not found")
    existed = db.query(TodoTag).filter(TodoTag.todo_id == todo_id, TodoTag.tag_id == tag_id).first()
    if existed:
        return None
    db.add(TodoTag(todo_id=todo_id, tag_id=tag_id))
    db.commit()
    return None


@router.delete("/bind/{todo_id}/{tag_id}", status_code=204)
def unbind_tag(todo_id: int, tag_id: int, db: Session = Depends(get_session)):
    link = db.query(TodoTag).filter(TodoTag.todo_id == todo_id, TodoTag.tag_id == tag_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Binding not found")
    db.delete(link)
    db.commit()
    return None


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_session)):
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()
    return None
