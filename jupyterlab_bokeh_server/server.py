from bokeh.server.server import Server
from bokeh.models import DataRange1d, NumeralTickFormatter
from bokeh.layouts import column
from bokeh.plotting import figure, ColumnDataSource
from tornado import web

import psutil
import random
import sys
import time


def lineplot(doc):
    fig = figure(title="Line plot!", sizing_mode="stretch_both", x_axis_type="datetime")
    source = ColumnDataSource({"x": [], "y": []})
    fig.line(source=source, x="x", y="y")

    doc.title = "Line Plot!"
    doc.add_root(fig)

    y = 0

    def cb():
        nonlocal y
        now = time.time() * 1000  # bokeh measures in ms
        y += random.random() - 0.5

        source.stream({"x": [now], "y": [y]}, 100)

    doc.add_periodic_callback(cb, 100)


def histogram(doc):
    fig = figure(title="Histogram!", sizing_mode="stretch_both")

    left = [0, 1, 2, 3, 4, 5]
    right = [l + 0.9 for l in left]
    ys = [0 for _ in left]

    source = ColumnDataSource({"left": left, "right": right, "y": [ys]})

    fig.quad(source=source, left="left", right="right", bottom=0, top="y", color="blue")

    doc.title = "Histogram!"
    doc.add_root(fig)

    def cb():
        nonlocal ys

        for i, y in enumerate(ys):
            ys[i] = 0.9 * y + 0.1 * random.random()

        source.data.update({"y": ys})

    doc.add_periodic_callback(cb, 100)


def cpu(doc):
    fig = figure(title="CPU Usage", sizing_mode="stretch_both", y_range=[0, 100])

    cpu = psutil.cpu_percent(percpu=True)
    left = list(range(len(cpu)))
    right = [l + 0.8 for l in left]

    source = ColumnDataSource({"left": left, "right": right, "cpu": cpu})

    fig.quad(
        source=source, left="left", right="right", bottom=0, top="cpu", color="blue"
    )

    doc.title = "CPU Usage"
    doc.add_root(fig)

    def cb():
        source.data.update({"cpu": psutil.cpu_percent(percpu=True)})

    doc.add_periodic_callback(cb, 200)


def resource_timeline(doc):

    # Shared X Range for all plots
    x_range = DataRange1d(follow="end", follow_interval=20000, range_padding=0)
    tools = "reset,xpan,xwheel_zoom"

    source = ColumnDataSource(
        {
            "time": [],
            "memory": [],
            "cpu": [],
            "disk-read": [],
            "disk-write": [],
            "net-read": [],
            "net-sent": [],
        }
    )

    memory_fig = figure(
        title="Memory",
        sizing_mode="stretch_both",
        x_axis_type="datetime",
        y_range=[0, psutil.virtual_memory().total],
        x_range=x_range,
        tools=tools,
    )
    memory_fig.line(source=source, x="time", y="memory")
    memory_fig.yaxis.formatter = NumeralTickFormatter(format="0.0b")

    cpu_fig = figure(
        title="CPU",
        sizing_mode="stretch_both",
        x_axis_type="datetime",
        y_range=[0, 100],
        x_range=x_range,
        tools=tools,
    )
    cpu_fig.line(source=source, x="time", y="cpu")

    disk_fig = figure(
        title="Disk I/O Bandwidth",
        sizing_mode="stretch_both",
        x_axis_type="datetime",
        x_range=x_range,
        tools=tools,
    )
    disk_fig.line(source=source, x="time", y="disk-read", color="blue")
    disk_fig.line(source=source, x="time", y="disk-write", color="red")
    disk_fig.yaxis.formatter = NumeralTickFormatter(format="0.0b")

    net_fig = figure(
        title="Network I/O Bandwidth",
        sizing_mode="stretch_both",
        x_axis_type="datetime",
        x_range=x_range,
        tools=tools,
    )
    net_fig.line(source=source, x="time", y="net-read", color="blue")
    net_fig.line(source=source, x="time", y="net-sent", color="red")
    net_fig.yaxis.formatter = NumeralTickFormatter(format="0.0b")

    doc.title = "Resource Timeline"
    doc.add_root(
        column(memory_fig, cpu_fig, disk_fig, net_fig, sizing_mode="stretch_both")
    )

    last_disk_read = psutil.disk_io_counters().read_bytes
    last_disk_write = psutil.disk_io_counters().write_bytes
    last_net_read = psutil.net_io_counters().bytes_recv
    last_net_sent = psutil.net_io_counters().bytes_sent
    last_time = time.time() * 1000

    def cb():
        nonlocal last_disk_read, last_disk_write, last_net_read, last_net_sent, last_time

        now = time.time() * 1000  # bokeh measures in ms
        cpu = psutil.cpu_percent()
        mem = psutil.virtual_memory().used

        disk = psutil.disk_io_counters()
        disk_read = disk.read_bytes
        disk_write = disk.write_bytes

        net = psutil.net_io_counters()
        net_read = net.bytes_recv
        net_sent = net.bytes_sent

        source.stream(
            {
                "time": [now],
                "cpu": [cpu],
                "memory": [mem],
                "disk-read": [(disk_read - last_disk_read) / (now - last_time)],
                "disk-write": [(disk_write - last_disk_write) / (now - last_time)],
                "net-read": [(net_read - last_net_read) / (now - last_time)],
                "net-sent": [(net_sent - last_net_sent) / (now - last_time)],
            },
            1000,
        )

        last_disk_read = disk_read
        last_disk_write = disk_write
        last_net_read = net_read
        last_net_sent = net_sent
        last_time = now

    doc.add_periodic_callback(cb, 100)


routes = {
    "/line": lineplot,
    "/histogram": histogram,
    "/cpu": cpu,
    "/resources": resource_timeline,
}


class RouteIndex(web.RequestHandler):
    """ A JSON index of all routes present on the Bokeh Server """

    def get(self):
        self.write({route: route.strip("/").title() for route in routes})


if __name__ == "__main__":
    from tornado.ioloop import IOLoop

    server = Server(routes, port=int(sys.argv[1]), allow_websocket_origin=["*"])
    server.start()

    server._tornado.add_handlers(
        r".*", [(server.prefix + "/" + "index.json", RouteIndex, {})]
    )

    IOLoop.current().start()
