from bokeh.server.server import Server
from bokeh.plotting import figure, ColumnDataSource

import random
import time


def lineplot(doc):
    fig = figure(title="Line plot!", sizing_mode="stretch_both", x_axis_type="datetime")
    source = ColumnDataSource({"x": [], "y": []})
    fig.line(source=source, x="x", y="y")

    doc.title = "Hello, world!"
    doc.add_root(fig)

    y = 0

    def cb():
        nonlocal y
        now = time.time() * 1000  # bokeh measures in ms
        y += random.random() - 0.5

        source.stream({"x": [now], "y": [y]}, 100)

    doc.add_periodic_callback(cb, 100)


routes = {"/": lineplot}


if __name__ == "__main__":
    from tornado.ioloop import IOLoop

    server = Server(routes, port=5000)
    server.start()

    IOLoop.current().start()
