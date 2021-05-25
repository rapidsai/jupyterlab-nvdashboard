"""
Return config on servers to start for bokeh
See https://jupyter-server-proxy.readthedocs.io/en/latest/server-process.html
for more information.
"""
import os
import sys

serverfile = os.path.join(os.path.dirname(__file__), "server.py")


def launch_server():
    return {"command": [sys.executable, serverfile, "{port}"], "timeout": 20, "launcher_entry": {"enabled": False}}


def _jupyter_labextension_paths():
    return [
        {
            "src": "labextension",
            "dest": "jupyterlab-nvdashboard",
        }
    ]
