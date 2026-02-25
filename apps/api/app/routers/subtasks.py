from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db.session import get_session
from ..models.subtask import Subtask
from ..models.todo import Todo
from ..schemas.subtask import SubtaskCreate, SubtaskUpdate, SubtaskOut

router = APIRouter(prefix="/todos/{todo_id}/subtasks", tags=["subtasks"])


@router.get("", response_model=list[SubtaskOut])
# 功能描述：获取指定任务的子任务列表
# 参数说明：todo_id（任务ID）、db（数据库会话）
# 返回值：子任务列表
def list_subtasks(todo_id: int, db: Session = Depends(get_session)):
    return db.execute(select(Subtask).where(Subtask.parent_todo_id == todo_id).order_by(Subtask.order)).scalars().all()


@router.post("", response_model=SubtaskOut, status_code=201)
# 功能描述：为指定任务创建子任务
# 参数说明：todo_id（任务ID）、req（创建请求），db（数据库会话）
# 返回值：新建子任务响应体
def create_subtask(todo_id: int, req: SubtaskCreate, db: Session = Depends(get_session)):
    if not db.get(Todo, todo_id):
        raise HTTPException(status_code=404, detail="Todo not found")
    st = Subtask(parent_todo_id=todo_id, **req.model_dump())
    db.add(st)
    db.commit()
    db.refresh(st)
    return st


@router.put("/{id}", response_model=SubtaskOut)
# 功能描述：更新指定子任务
# 参数说明：todo_id（任务ID）、id（子任务ID）、req（更新请求），db（数据库会话）
# 返回值：更新后的子任务响应体
def update_subtask(todo_id: int, id: int, req: SubtaskUpdate, db: Session = Depends(get_session)):
    st = db.get(Subtask, id)
    if not st or st.parent_todo_id != todo_id:
        raise HTTPException(status_code=404, detail="Subtask not found")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(st, k, v)
    db.add(st)
    db.commit()
    db.refresh(st)
    return st


@router.delete("/{id}", status_code=204)
# 功能描述：删除指定子任务
# 参数说明：todo_id（任务ID）、id（子任务ID）、db（数据库会话）
# 返回值：无（204 No Content）
def delete_subtask(todo_id: int, id: int, db: Session = Depends(get_session)):
    st = db.get(Subtask, id)
    if not st or st.parent_todo_id != todo_id:
        raise HTTPException(status_code=404, detail="Subtask not found")
    db.delete(st)
    db.commit()
    return None
