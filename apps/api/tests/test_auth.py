import pytest
from fastapi.testclient import TestClient
from apps.api.app.main import app
from apps.api.app.db.init_db import init_db

# 功能描述：验证注册与登录接口的基本行为
# 参数说明：无
# 返回值：断言接口返回结构与状态码正确
client = TestClient(app)
init_db()


def test_register_and_login():
    email = "user@example.com"
    password = "secret123"
    r1 = client.post("/auth/register", json={"email": email, "password": password})
    assert r1.status_code in (200, 201)
    token = r1.json().get("access_token")
    assert token

    r2 = client.post("/auth/login", json={"email": email, "password": password})
    assert r2.status_code == 200
    assert r2.json().get("access_token")
