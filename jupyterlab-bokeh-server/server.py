from bokeh.server.server import Server
from bokeh.plotting import figure, ColumnDataSource

import random


def lineplot(doc):
    fig = figure(title="Line plot!", sizing_mode="stretch_both")
    source = ColumnDataSource({"x": [], "y": []})
    fig.line(source=source, x="x", y="y")

    doc.title = "Hello, world!"
    doc.add_root(fig)

    old_x = 0
    old_y = 0

    def cb():
        nonlocal old_x, old_y
        old_x += 1
        old_y += random.random() - 0.5

        source.stream({"x": [old_x], "y": [old_y]}, 100)

    doc.add_periodic_callback(cb, 100)


routes = {"/": lineplot}


if __name__ == "__main__":
    server = Server(routes, port=5000)
    server.start()

    from tornado.ioloop import IOLoop

    IOLoop.current().start()
