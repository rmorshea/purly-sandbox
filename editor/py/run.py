import os
import io
import time
import json
import purly
import asyncio
import contextlib
import traceback
from multiprocessing import Process
from sanic import Sanic, response
from sanic_cors import cross_origin


HERE = os.path.dirname(__file__)
JS_BUILD = os.path.join(HERE, "..", "js", "build")


@contextlib.contextmanager
def output_to_layout(layout):
    with io.StringIO() as buffer, contextlib.redirect_stdout(buffer):
        try:
            yield
        except:
            errors = traceback.format_exc()
        else:
            errors = ""
        finally:
            raw_output = buffer.getvalue() + errors
            if raw_output:
                output = layout.html("pre", layout.html("code", raw_output))
                layout.children.append(output)
                layout.sync()


sandbox = Sanic()
_connection_data = {}


def connection_data(conn):
    if conn not in _connection_data:
        data = _connection_data[conn] = {}
        data["events"] = events()
    else:
        data = _connection_data[conn]
    data["alive"] = time.time()
    return data


def events():
    begin = asyncio.Event()
    begin.set()
    release = asyncio.Event()
    return begin, release


@sandbox.get("/")
async def static(request):
    absolute = os.path.join(JS_BUILD, "index.html")
    return await response.file(absolute)


@sandbox.get("/<path:path>")
async def static(request, path):
    absolute = os.path.join(JS_BUILD, *path.split("/"))
    return await response.file(absolute)


@sandbox.post("/sandbox-exec-<conn>")
@cross_origin(sandbox)
async def to_exe(request, conn):
    layout = purly.Layout(f"ws://nginx:80/state/model/sandbox-{conn}/stream")
    output = purly.Layout(f"ws://nginx:80/state/model/sandbox-output-{conn}/stream")

    data = connection_data(conn)
    begin, release = data["events"]

    release.set()
    await begin.wait()

    release.clear()
    begin.clear()

    loop = asyncio.get_event_loop()

    def _serve():
        if not release.is_set():
            loop.call_soon(_serve)
            with output_to_layout(output):
                layout.sync()
        else:
            layout.children.clear()
            output.children.clear()
            layout.sync()
            output.sync()
            begin.set()

    with output_to_layout(output):
        exec(request.json["code"], {"layout": layout})

    loop.call_soon(_serve)

    return response.json({})


@sandbox.add_task
async def clean_connection():
    while True:
        await asyncio.sleep(300)
        for conn, conn_data in list(_connection_data.items()):
            if time.time() - conn_data["alive"] > 300:
                # clear out connection data after 5 minutes of inactivity
                begin, release = conn_data["events"]
                release.set()
                del _connection_data[conn]


if __name__ == "__main__":
    sandbox.run(host="0.0.0.0", port=8000)
