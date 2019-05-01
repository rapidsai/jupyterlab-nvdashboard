from bokeh.server.server import Server
from bokeh.plotting import figure, ColumnDataSource
from bokeh.models import DataRange1d, NumeralTickFormatter
from bokeh.layouts import column
from bokeh.models.mappers import LinearColorMapper
from tornado import web

import psutil
import sys
import time

def cpu(doc):
    fig = figure(title="CPU Utilization [%]", sizing_mode="stretch_both", y_range=[0, 100])

    cpu = psutil.cpu_percent(percpu=True)
    left = list(range(len(cpu)))
    right = [l + 0.8 for l in left]

    source = ColumnDataSource({"left": left, "right": right, "cpu": cpu})
    #colors = ["#000003", "#410967", "#932567", "#DC5039"] #, "#FBA40A", "#FCFEA4"]
    colors = ['#440154', '#404387', '#29788E', '#22A784', '#79D151']
    mapper = LinearColorMapper(palette=colors, low=0, high=100)

    fig.quad(
        source=source, left="left", right="right", bottom=0, top="cpu", color={"field": "cpu", "transform": mapper}
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

try:
    from pynvml.nvml import *

    nvml_init()
    ngpus = nvmlDeviceGetCount()
    gpu_handles = [ nvmlDeviceGetHandleByIndex(i) for i in range(ngpus) ]

    def gpu(doc):
        fig = figure(title="GPU Usage", sizing_mode="stretch_both", y_range=[0, 100])

        gpu = [ nvmlDeviceGetUtilizationRates( gpu_handles[i] ).gpu+1 for i in range(ngpus) ]
        left = list(range(len(gpu)))
        right = [l + 0.8 for l in left]
        source = ColumnDataSource({"left": left, "right": right, "gpu": gpu})
        #colors = ["#000003", "#410967", "#932567", "#DC5039"] #, "#FBA40A", "#FCFEA4"]
        colors = ['#440154', '#404387', '#29788E', '#22A784', '#79D151']
        mapper = LinearColorMapper(palette=colors, low=0, high=100)

        fig.quad(
            source=source, left="left", right="right", bottom=0, top="gpu", color={"field": "gpu", "transform": mapper}
        )

        doc.title = "GPU Utilization [%]"
        doc.add_root(fig)

        def cb():
            source.data.update({"gpu": [ nvmlDeviceGetUtilizationRates( gpu_handles[i] ).gpu+0.1 for i in range(ngpus) ]})

        doc.add_periodic_callback(cb, 200)

    def pci(doc):

        tx_fig = figure(title="TX Bytes [KB]", sizing_mode="stretch_both", y_range=[0, 10000])
        pci_tx = [ nvmlDeviceGetPcieThroughput( gpu_handles[i] , NVML_PCIE_UTIL_TX_BYTES ) for i in range(ngpus) ]
        left = list(range(len(pci_tx)))
        right = [l + 0.8 for l in left]
        source = ColumnDataSource({"left": left, "right": right, "pci-tx": pci_tx})
        colors = ["#000003", "#410967", "#932567", "#DC5039"] #, "#FBA40A", "#FCFEA4"]
        mapper = LinearColorMapper(palette=colors, low=0, high=10000)

        tx_fig.quad(
            source=source, left="left", right="right", bottom=0, top="pci-tx", color={"field": "pci-tx", "transform": mapper}
        )

        rx_fig = figure(title="RX Bytes [KB]", sizing_mode="stretch_both", y_range=[0, 10000])
        pci_rx = [ nvmlDeviceGetPcieThroughput( gpu_handles[i] , NVML_PCIE_UTIL_RX_BYTES ) for i in range(ngpus) ]
        left = list(range(len(pci_rx)))
        right = [l + 0.8 for l in left]
        source = ColumnDataSource({"left": left, "right": right, "pci-rx": pci_rx})
        colors = ["#000003", "#410967", "#932567", "#DC5039"] #, "#FBA40A", "#FCFEA4"]
        mapper = LinearColorMapper(palette=colors, low=0, high=10000)

        rx_fig.quad(
            source=source, left="left", right="right", bottom=0, top="pci-rx", color={"field": "pci-rx", "transform": mapper}
        )

        doc.title = "PCI Throughput"
        doc.add_root(
            column(tx_fig, rx_fig, sizing_mode="stretch_both")
        )

        def cb():
            src_dict = {}
            src_dict["pci-rx"] = [ nvmlDeviceGetPcieThroughput( gpu_handles[i] , NVML_PCIE_UTIL_TX_BYTES ) for i in range(ngpus) ]
            src_dict["pci-tx"] = [ nvmlDeviceGetPcieThroughput( gpu_handles[i] , NVML_PCIE_UTIL_RX_BYTES ) for i in range(ngpus) ]
            source.data.update(src_dict)

        doc.add_periodic_callback(cb, 200)

    def gpu_resource_timeline(doc):

        memory_list = [ nvmlDeviceGetMemoryInfo( handle ).total / (1024*1024) for handle in gpu_handles ]
        gpu_mem_max = max( memory_list ) * (1024*1024)
        gpu_mem_sum = sum( memory_list )

        # Shared X Range for all plots
        x_range = DataRange1d(follow="end", follow_interval=20000, range_padding=0)
        y_range = DataRange1d(follow="end", follow_interval=20000, range_padding=0)
        tools = "reset,xpan,xwheel_zoom"

        item_dict = {"time": [], "gpu-total": [], "memory-total": []}
        for i in range(ngpus):
            item_dict["gpu-"+str(i)] = []
            item_dict["memory-"+str(i)] = []

        source = ColumnDataSource( item_dict )
        def _get_color( ind ):
            color_list = [ "blue", "red", "green", "black", "brown", "cyan", \
                           "orange", "pink", "purple", "gold" ]
            return color_list[ ind % len(color_list) ]

        memory_fig = figure(
            title="Memory Utilization",
            sizing_mode="stretch_both",
            x_axis_type="datetime",
            y_range=[0, gpu_mem_max],
            x_range=x_range,
            tools=tools,
        )
        for i in range(ngpus):
            memory_fig.line(source=source, x="time", y="memory-"+str(i), color=_get_color(i), legend="GPU-"+str(i))
        memory_fig.yaxis.formatter = NumeralTickFormatter(format="0.0b")
        memory_fig.legend.location = "top_left"

        gpu_fig = figure(
            title="GPU Utilization [%]",
            sizing_mode="stretch_both",
            x_axis_type="datetime",
            y_range=[0, 100],
            x_range=x_range,
            tools=tools,
        )
        for i in range(ngpus):
            gpu_fig.line(source=source, x="time", y="gpu-"+str(i), color=_get_color(i), legend="GPU-"+str(i))
        gpu_fig.legend.location = "top_left"

        tot_fig = figure(
            title="Total Utilization [%]",
            sizing_mode="stretch_both",
            x_axis_type="datetime",
            y_range=[0, 100],
            x_range=x_range,
            tools=tools,
        )
        tot_fig.line(source=source, x="time", y="gpu-total", color="blue", legend="Total-GPU")
        tot_fig.line(source=source, x="time", y="memory-total", color="red", legend="Total-Memory")
        tot_fig.legend.location = "top_left"

        doc.title = "Resource Timeline"
        doc.add_root(
            column(gpu_fig, memory_fig, tot_fig, sizing_mode="stretch_both")
        )

        last_time = time.time()

        def cb():
            nonlocal last_time
            now = time.time()
            src_dict = {"time": [now * 1000]}
            gpu_tot = 0
            mem_tot = 0
            for i in range(ngpus):
                gpu = nvmlDeviceGetUtilizationRates( gpu_handles[i] ).gpu
                mem = nvmlDeviceGetMemoryInfo( gpu_handles[i] ).used
                gpu_tot += gpu
                mem_tot += mem / (1024*1024)
                src_dict["gpu-"+str(i)] = [gpu]
                src_dict["memory-"+str(i)] = [mem]
            src_dict["gpu-total"] = [gpu_tot / ngpus]
            src_dict["memory-total"] = [(mem_tot/gpu_mem_sum)*100]

            source.stream(
                src_dict,
                1000,
            )

            last_time = now

        doc.add_periodic_callback(cb, 200)
    routes = {
        "/cpu": cpu,
        "/resources": resource_timeline,
        "/gpu": gpu,
        "/gpu_resources": gpu_resource_timeline,
        "/pci": pci,
    }
except:
    routes = {
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
