"""
Return config on servers to start for bokeh

See https://jupyter-server-proxy.readthedocs.io/en/latest/server-process.html
for more information.
"""
import os

def launch_server():
    return {
        'command': [],
        'environment': {}
    }
