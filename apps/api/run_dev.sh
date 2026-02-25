#!/usr/bin/env bash
export DATABASE_URL=${DATABASE_URL:-"sqlite:///./todolist.db"}
export JWT_SECRET=${JWT_SECRET:-"CHANGE_ME_SECRET"}
python3 -c "from apps.api.app.db.init_db import init_db; init_db()"
python3 -m uvicorn apps.api.app.main:app --port 8001 --reload
