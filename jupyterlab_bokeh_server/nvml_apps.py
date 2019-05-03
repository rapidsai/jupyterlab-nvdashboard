from bokeh.server.server import Server
from bokeh.plotting import figure, ColumnDataSource
from bokeh.models import DataRange1d, NumeralTickFormatter
from bokeh.layouts import column
from bokeh.models.mappers import LinearColorMapper
from bokeh.palettes import all_palettes
import time

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
    #colors = ['#440154', '#404387', '#29788E', '#22A784', '#79D151']
    mapper = LinearColorMapper(palette=all_palettes['RdYlBu'][4], low=0, high=100)

    fig.quad(
        source=source, left="left", right="right", bottom=0, top="gpu", color={"field": "gpu", "transform": mapper}
    )

    doc.title = "GPU Utilization [%]"
    doc.add_root(fig)

    def cb():
        source.data.update({"gpu": [ nvmlDeviceGetUtilizationRates( gpu_handles[i] ).gpu+0.1 for i in range(ngpus) ]})

    doc.add_periodic_callback(cb, 200)

def pci(doc):

    tx_fig = figure(title="TX Bytes [KB/s]", sizing_mode="stretch_both", y_range=[0, 1000000])
    pci_tx = [ nvmlDeviceGetPcieThroughput( gpu_handles[i] , NVML_PCIE_UTIL_TX_BYTES ) for i in range(ngpus) ]
    left = list(range(len(pci_tx)))
    right = [l + 0.8 for l in left]
    source = ColumnDataSource({"left": left, "right": right, "pci-tx": pci_tx})
    mapper = LinearColorMapper(palette=all_palettes['RdYlBu'][4], low=0, high=1000000)

    tx_fig.quad(
        source=source, left="left", right="right", bottom=0, top="pci-tx", color={"field": "pci-tx", "transform": mapper}
    )

    rx_fig = figure(title="RX Bytes [KB/s]", sizing_mode="stretch_both", y_range=[0, 1000000])
    pci_rx = [ nvmlDeviceGetPcieThroughput( gpu_handles[i] , NVML_PCIE_UTIL_RX_BYTES ) for i in range(ngpus) ]
    left = list(range(len(pci_rx)))
    right = [l + 0.8 for l in left]
    source = ColumnDataSource({"left": left, "right": right, "pci-rx": pci_rx})
    mapper = LinearColorMapper(palette=all_palettes['RdYlBu'][4], low=0, high=1000000)

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
