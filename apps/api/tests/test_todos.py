import pytest
from fastapi.testclient import TestClient
from apps.api.app.main import app
from apps.api.app.db.init_db import init_db

# 功能描述：验证 Todo 列表、创建与更新删除接口
# 参数说明：无
# 返回值：断言接口返回结构与状态码正确
client = TestClient(app)
init_db()


def test_todo_crud():
    r_create = client.post("/todos", json={"title": "测试任务", "priority": "high"})
    assert r_create.status_code == 201
    todo = r_create.json()

    r_list = client.get("/todos")
    assert r_list.status_code == 200
    assert any(t["id"] == todo["id"] for t in r_list.json())

    r_update = client.put(f"/todos/{todo['id']}", json={"status": "doing"})
    assert r_update.status_code == 200
    assert r_update.json()["status"] == "doing"

    r_delete = client.delete(f"/todos/{todo['id']}")
    assert r_delete.status_code == 204
