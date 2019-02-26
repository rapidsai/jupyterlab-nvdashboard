from bokeh.server.server import Server
from bokeh.plotting import figure, ColumnDataSource
from tornado import web

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

routes = {
    "/line": lineplot,
    "/histogram": histogram,
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
