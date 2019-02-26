"""
Return config on servers to start for bokeh

See https://jupyter-server-proxy.readthedocs.io/en/latest/server-process.html
for more information.
"""
import os
import sys

serverfile = os.path.join(os.path.dirname(__file__), "server.py")


def launch_server():
    return {"command": [sys.executable, serverfile, '{port}']}
