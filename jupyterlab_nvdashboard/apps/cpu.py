from bokeh.plotting import figure, ColumnDataSource
from bokeh.models import DataRange1d, NumeralTickFormatter
from bokeh.layouts import column
from bokeh.models.mappers import LinearColorMapper
from bokeh.palettes import all_palettes

import psutil
import time


def cpu(doc):
    fig = figure(
        title="CPU Utilization [%]", sizing_mode="stretch_both", y_range=[0, 100]
    )

    cpu = psutil.cpu_percent(percpu=True)
    left = list(range(len(cpu)))
    right = [l + 0.8 for l in left]

    source = ColumnDataSource({"left": left, "right": right, "cpu": cpu})
    mapper = LinearColorMapper(palette=all_palettes["RdYlBu"][4], low=0, high=100)

    fig.quad(
        source=source,
        left="left",
        right="right",
        bottom=0,
        top="cpu",
        color={"field": "cpu", "transform": mapper},
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
    disk_fig.line(source=source, x="time", y="disk-read", color="blue", legend="Read")
    disk_fig.line(source=source, x="time", y="disk-write", color="red", legend="Write")
    disk_fig.yaxis.formatter = NumeralTickFormatter(format="0.0b")
    disk_fig.legend.location = "top_left"

    net_fig = figure(
        title="Network I/O Bandwidth",
        sizing_mode="stretch_both",
        x_axis_type="datetime",
        x_range=x_range,
        tools=tools,
    )
    net_fig.line(source=source, x="time", y="net-read", color="blue", legend="Recv")
    net_fig.line(source=source, x="time", y="net-sent", color="red", legend="Send")
    net_fig.yaxis.formatter = NumeralTickFormatter(format="0.0b")
    net_fig.legend.location = "top_left"

    doc.title = "Resource Timeline"
    doc.add_root(
        column(cpu_fig, memory_fig, disk_fig, net_fig, sizing_mode="stretch_both")
    )

    last_disk_read = psutil.disk_io_counters().read_bytes
    last_disk_write = psutil.disk_io_counters().write_bytes
    last_net_recv = psutil.net_io_counters().bytes_recv
    last_net_sent = psutil.net_io_counters().bytes_sent
    last_time = time.time()

    def cb():
        nonlocal last_disk_read, last_disk_write, last_net_recv, last_net_sent, last_time

        now = time.time()
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
                "time": [now * 1000],  # bokeh measures in ms
                "cpu": [cpu],
                "memory": [mem],
                "disk-read": [(disk_read - last_disk_read) / (now - last_time)],
                "disk-write": [(disk_write - last_disk_write) / (now - last_time)],
                "net-read": [(net_read - last_net_recv) / (now - last_time)],
                "net-sent": [(net_sent - last_net_sent) / (now - last_time)],
            },
            1000,
        )

        last_disk_read = disk_read
        last_disk_write = disk_write
        last_net_recv = net_read
        last_net_sent = net_sent
        last_time = now

    doc.add_periodic_callback(cb, 200)
