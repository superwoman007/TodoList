from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db.session import get_session
from ..models.scene_template import SceneTemplate, SceneTemplateItem
from ..models.todo import Todo
from ..models.user import User
from ..schemas.scene_template import (
    SceneTemplateCreate, SceneTemplateUpdate, SceneTemplateOut,
)
from ..schemas.todo import TodoOut
from ..dependencies import get_optional_user

router = APIRouter(prefix="/scene-templates", tags=["scene-templates"])


@router.get("", response_model=list[SceneTemplateOut])
def list_templates(
    db: Session = Depends(get_session),
    user: User | None = Depends(get_optional_user),
):
    """列出当前用户的所有场景模版"""
    stmt = select(SceneTemplate)
    if user:
        stmt = stmt.where(SceneTemplate.owner_id == user.id)
    stmt = stmt.order_by(SceneTemplate.created_at.desc())
    return db.execute(stmt).scalars().all()


@router.post("", response_model=SceneTemplateOut, status_code=201)
def create_template(
    req: SceneTemplateCreate,
    db: Session = Depends(get_session),
    user: User | None = Depends(get_optional_user),
):
    """创建场景模版"""
    tpl = SceneTemplate(
        name=req.name,
        icon=req.icon,
        description=req.description,
        owner_id=user.id if user else None,
    )
    for idx, item_data in enumerate(req.items):
        tpl.items.append(SceneTemplateItem(
            title=item_data.title,
            description=item_data.description,
            priority=item_data.priority,
            order=item_data.order or idx,
        ))
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.get("/{template_id}", response_model=SceneTemplateOut)
def get_template(template_id: int, db: Session = Depends(get_session)):
    """获取单个场景模版详情"""
    tpl = db.get(SceneTemplate, template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tpl


@router.put("/{template_id}", response_model=SceneTemplateOut)
def update_template(
    template_id: int,
    req: SceneTemplateUpdate,
    db: Session = Depends(get_session),
):
    """更新场景模版（含检查项全量替换）"""
    tpl = db.get(SceneTemplate, template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if req.name is not None:
        tpl.name = req.name
    if req.icon is not None:
        tpl.icon = req.icon
    if req.description is not None:
        tpl.description = req.description
    if req.items is not None:
        # 全量替换检查项
        tpl.items.clear()
        db.flush()
        for idx, item_data in enumerate(req.items):
            tpl.items.append(SceneTemplateItem(
                title=item_data.title,
                description=item_data.description,
                priority=item_data.priority,
                order=item_data.order or idx,
            ))
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_session)):
    """删除场景模版"""
    tpl = db.get(SceneTemplate, template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(tpl)
    db.commit()
    return None


@router.post("/{template_id}/apply", response_model=list[TodoOut], status_code=201)
def apply_template(
    template_id: int,
    db: Session = Depends(get_session),
    user: User | None = Depends(get_optional_user),
):
    """从场景模版一键创建待办事项"""
    tpl = db.get(SceneTemplate, template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    created = []
    for item in tpl.items:
        todo = Todo(
            title=item.title,
            description=item.description,
            status="todo",
            priority=item.priority,
            order=item.order,
            owner_id=user.id if user else None,
            scene_template_id=tpl.id,
            scene_template_name=tpl.name,
        )
        db.add(todo)
        created.append(todo)
    db.commit()
    for t in created:
        db.refresh(t)
    return created
