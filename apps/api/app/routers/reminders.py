from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db.session import get_session
from ..models.reminder import Reminder
from ..models.todo import Todo
from ..schemas.reminder import ReminderCreate, ReminderUpdate, ReminderOut
from ..services.scheduler import add_one_shot

router = APIRouter(prefix="/todos/{todo_id}/reminders", tags=["reminders"])


@router.get("", response_model=list[ReminderOut])
# 功能描述：获取指定任务的提醒列表
# 参数说明：todo_id（任务ID）、db（数据库会话）
# 返回值：提醒列表
def list_reminders(todo_id: int, db: Session = Depends(get_session)):
    return db.execute(select(Reminder).where(Reminder.todo_id == todo_id)).scalars().all()


@router.post("", response_model=ReminderOut, status_code=201)
# 功能描述：为指定任务创建提醒并注册调度
# 参数说明：todo_id（任务ID）、req（创建请求），db（数据库会话）
# 返回值：新建提醒响应体
def create_reminder(todo_id: int, req: ReminderCreate, db: Session = Depends(get_session)):
    if not db.get(Todo, todo_id):
        raise HTTPException(status_code=404, detail="Todo not found")
    r = Reminder(todo_id=todo_id, **req.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    add_one_shot(f"todo:{todo_id}:reminder:{r.id}", r.time)
    return r


@router.put("/{id}", response_model=ReminderOut)
# 功能描述：更新指定提醒
# 参数说明：todo_id（任务ID）、id（提醒ID）、req（更新请求），db（数据库会话）
# 返回值：更新后的提醒响应体
def update_reminder(todo_id: int, id: int, req: ReminderUpdate, db: Session = Depends(get_session)):
    r = db.get(Reminder, id)
    if not r or r.todo_id != todo_id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{id}", status_code=204)
# 功能描述：删除指定提醒
# 参数说明：todo_id（任务ID）、id（提醒ID）、db（数据库会话）
# 返回值：无（204 No Content）
def delete_reminder(todo_id: int, id: int, db: Session = Depends(get_session)):
    r = db.get(Reminder, id)
    if not r or r.todo_id != todo_id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(r)
    db.commit()
    return None
