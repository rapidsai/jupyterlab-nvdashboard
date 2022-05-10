import sys

from bokeh.server.server import Server
from tornado.ioloop import IOLoop
from tornado import web

from jupyterlab_nvdashboard import apps


DEFAULT_PORT = 8000


routes = {
    # "/CPU-Utilization": apps.cpu.cpu,
    "/Machine-Resources": apps.cpu.resource_timeline,
}

if apps.gpu.ngpus > 0:
    routes["/GPU-Utilization"] = apps.gpu.gpu
    routes["/GPU-Memory"] = apps.gpu.gpu_mem
    routes["/GPU-Resources"] = apps.gpu.gpu_resource_timeline
    if apps.gpu.pci_gen is not None:
        routes["/PCIe-Throughput"] = apps.gpu.pci
    if apps.gpu.nvlink_ver is not None:
        routes["/NVLink-Throughput"] = apps.gpu.nvlink
        routes["/NVLink-Timeline"] = apps.gpu.nvlink_timeline

class RouteIndex(web.RequestHandler):
    """ A JSON index of all routes present on the Bokeh Server """

    def get(self):
        self.write({route: route.strip("/").replace("-", " ") for route in routes})


def go():
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    else:
        port = DEFAULT_PORT
    server = Server(routes, port=port, allow_websocket_origin=["*"])
    server.start()

    server._tornado.add_handlers(
        r".*", [(server.prefix + "/" + "index.json", RouteIndex, {})]
    )

    IOLoop.current().start()


if __name__ == "__main__":
    go()
