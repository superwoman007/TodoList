from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from ..db.session import get_session
from ..models.todo import Todo
from ..models.user import User
from ..schemas.todo import TodoCreate, TodoUpdate, TodoOut
from ..dependencies import get_optional_user

router = APIRouter(prefix="/todos", tags=["todos"])


@router.get("", response_model=list[TodoOut])
def list_todos(
    db: Session = Depends(get_session),
    user: User | None = Depends(get_optional_user),
    query: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    stmt = select(Todo).options(joinedload(Todo.subtasks), joinedload(Todo.tags))
    if user:
        stmt = stmt.where(Todo.owner_id == user.id)
    if query:
        stmt = stmt.where(Todo.title.contains(query))
    if status:
        stmt = stmt.where(Todo.status == status)
    if priority:
        stmt = stmt.where(Todo.priority == priority)
    stmt = stmt.order_by(Todo.order.desc(), Todo.created_at.desc())
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    return db.execute(stmt).scalars().unique().all()


@router.post("", response_model=TodoOut, status_code=201)
def create_todo(
    req: TodoCreate,
    db: Session = Depends(get_session),
    user: User | None = Depends(get_optional_user),
):
    data = req.model_dump()
    if user:
        data["owner_id"] = user.id
    todo = Todo(**data)
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@router.get("/{todo_id}", response_model=TodoOut)
def get_todo(todo_id: int, db: Session = Depends(get_session)):
    stmt = select(Todo).options(joinedload(Todo.subtasks), joinedload(Todo.tags)).where(Todo.id == todo_id)
    todo = db.execute(stmt).scalars().unique().first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@router.put("/{todo_id}", response_model=TodoOut)
def update_todo(todo_id: int, req: TodoUpdate, db: Session = Depends(get_session)):
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(todo, k, v)
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@router.delete("/{todo_id}", status_code=204)
def delete_todo(todo_id: int, db: Session = Depends(get_session)):
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(todo)
    db.commit()
    return None
