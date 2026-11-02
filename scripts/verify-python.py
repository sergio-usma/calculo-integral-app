"""Ejecuta TODOS los scripts de Python generados por la app y reporta cuáles fallan.
Uso:  PY_OUT=py-scripts.json npx vitest run scripts/export-python.test.ts && python scripts/verify-python.py py-scripts.json
"""
import json, sys, io, contextlib, traceback

data = json.load(open(sys.argv[1], encoding="utf8"))
bad = 0
for item in data:
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(item["code"], item["id"], "exec"), {"__name__": "__ej__"})
    except Exception as e:
        bad += 1
        print("FALLA", item["id"], type(e).__name__, str(e)[:160])
        tb = traceback.extract_tb(e.__traceback__)
        print("   linea:", tb[-1].lineno, "->", (item["code"].split("\n")[tb[-1].lineno - 1] if tb[-1].lineno <= len(item["code"].split("\n")) else "")[:120].encode("ascii","replace").decode())
print(f"{len(data) - bad}/{len(data)} scripts OK")
sys.exit(1 if bad else 0)
