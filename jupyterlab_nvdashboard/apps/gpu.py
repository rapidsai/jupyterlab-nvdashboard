from bokeh.plotting import figure, ColumnDataSource
from bokeh.models import DataRange1d, NumeralTickFormatter, BasicTicker
from bokeh.layouts import column
from bokeh.models.mappers import LinearColorMapper
from bokeh.palettes import all_palettes

import math
import time

import pynvml

from jupyterlab_nvdashboard.utils import format_bytes

KB = 1e3
MB = KB * KB
GB = MB * KB

try:
    pynvml.nvmlInit()
except pynvml.nvml.NVMLError_LibraryNotFound as error:
    ngpus = 0
    gpu_handles = []
else:
    ngpus = pynvml.nvmlDeviceGetCount()
    gpu_handles = [pynvml.nvmlDeviceGetHandleByIndex(i) for i in range(ngpus)]
    try:
        nvlink_ver = pynvml.nvmlDeviceGetNvLinkVersion(gpu_handles[0], 0)
    except (IndexError, pynvml.nvml.NVMLError_NotSupported):
        nvlink_ver = None
    try:
        pci_gen = pynvml.nvmlDeviceGetMaxPcieLinkGeneration(gpu_handles[0])
    except (IndexError, pynvml.nvml.NVMLError_NotSupported):
        pci_gen = None

def gpu(doc):
    fig = figure(title="GPU Utilization", sizing_mode="stretch_both", x_range=[0, 100])

    def get_utilization():
        return [
            pynvml.nvmlDeviceGetUtilizationRates(gpu_handles[i]).gpu
            for i in range(ngpus)
        ]

    gpu = get_utilization()
    y = list(range(len(gpu)))
    source = ColumnDataSource({"right": y, "gpu": gpu})
    mapper = LinearColorMapper(palette=all_palettes["RdYlBu"][4], low=0, high=100)

    fig.hbar(
        source=source,
        y="right",
        right="gpu",
        height=0.8,
        color={"field": "gpu", "transform": mapper},
    )

    fig.toolbar_location = None

    doc.title = "GPU Utilization [%]"
    doc.add_root(fig)

    def cb():
        source.data.update({"gpu": get_utilization()})

    doc.add_periodic_callback(cb, 200)


def gpu_mem(doc):
    def get_mem():
        return [pynvml.nvmlDeviceGetMemoryInfo(handle).used for handle in gpu_handles]

    def get_total():
        return pynvml.nvmlDeviceGetMemoryInfo(gpu_handles[0]).total

    fig = figure(
        title="GPU Memory", sizing_mode="stretch_both", x_range=[0, get_total()]
    )

    gpu = get_mem()

    y = list(range(len(gpu)))
    source = ColumnDataSource({"right": y, "gpu": gpu})
    mapper = LinearColorMapper(
        palette=all_palettes["RdYlBu"][8], low=0, high=get_total()
    )

    fig.hbar(
        source=source,
        y="right",
        right="gpu",
        height=0.8,
        color={"field": "gpu", "transform": mapper},
    )
    fig.xaxis[0].formatter = NumeralTickFormatter(format="0.0 b")
    fig.xaxis.major_label_orientation = -math.pi / 12

    fig.toolbar_location = None

    doc.title = "GPU Memory"
    doc.add_root(fig)

    def cb():
        mem = get_mem()
        source.data.update({"gpu": mem})
        fig.title.text = "GPU Memory: {}".format(format_bytes(sum(mem)))

    doc.add_periodic_callback(cb, 200)


def pci(doc):

    # Use device-0 to get "upper bound"
    pci_width = pynvml.nvmlDeviceGetMaxPcieLinkWidth(gpu_handles[0])
    pci_bw = {
        # Keys = PCIe-Generation, Values = Max PCIe Lane BW (per direction)
        # [Note: Using specs at https://en.wikipedia.org/wiki/PCI_Express]
        1: (250.0 * MB),
        2: (500.0 * MB),
        3: (985.0 * MB),
        4: (1969.0 * MB),
        5: (3938.0 * MB),
        6: (7877.0 * MB),
    }
    # Max PCIe Throughput = BW-per-lane * Width
    max_rxtx_tp = pci_width * pci_bw[pci_gen]

    pci_tx = [
        pynvml.nvmlDeviceGetPcieThroughput(
            gpu_handles[i], pynvml.NVML_PCIE_UTIL_TX_BYTES
        )
        * KB
        for i in range(ngpus)
    ]

    pci_rx = [
        pynvml.nvmlDeviceGetPcieThroughput(
            gpu_handles[i], pynvml.NVML_PCIE_UTIL_RX_BYTES
        )
        * KB
        for i in range(ngpus)
    ]

    left = list(range(ngpus))
    right = [l + 0.8 for l in left]
    source = ColumnDataSource(
        {"left": left, "right": right, "pci-tx": pci_tx, "pci-rx": pci_rx}
    )
    mapper = LinearColorMapper(
        palette=all_palettes["RdYlBu"][4], low=0, high=max_rxtx_tp
    )

    tx_fig = figure(
        title="TX PCIe [B/s]", sizing_mode="stretch_both", y_range=[0, max_rxtx_tp]
    )
    tx_fig.quad(
        source=source,
        left="left",
        right="right",
        bottom=0,
        top="pci-tx",
        color={"field": "pci-tx", "transform": mapper},
    )
    tx_fig.yaxis.formatter = NumeralTickFormatter(format="0.0 b")
    tx_fig.toolbar_location = None

    rx_fig = figure(
        title="RX PCIe [B/s]", sizing_mode="stretch_both", y_range=[0, max_rxtx_tp]
    )
    rx_fig.quad(
        source=source,
        left="left",
        right="right",
        bottom=0,
        top="pci-rx",
        color={"field": "pci-rx", "transform": mapper},
    )
    rx_fig.yaxis.formatter = NumeralTickFormatter(format="0.0 b")
    rx_fig.toolbar_location = None

    doc.title = "PCIe Throughput"
    doc.add_root(column(tx_fig, rx_fig, sizing_mode="stretch_both"))

    def cb():
        src_dict = {}
        src_dict["pci-tx"] = [
            pynvml.nvmlDeviceGetPcieThroughput(
                gpu_handles[i], pynvml.NVML_PCIE_UTIL_TX_BYTES
            )
            * KB
            for i in range(ngpus)
        ]
        src_dict["pci-rx"] = [
            pynvml.nvmlDeviceGetPcieThroughput(
                gpu_handles[i], pynvml.NVML_PCIE_UTIL_RX_BYTES
            )
            * KB
            for i in range(ngpus)
        ]
        source.data.update(src_dict)

    doc.add_periodic_callback(cb, 200)


def _get_nvlink_throughput():
    throughput = [
        pynvml.nvmlDeviceGetFieldValues(
            handle,
            [
                (pynvml.NVML_FI_DEV_NVLINK_THROUGHPUT_DATA_RX, scope_id)
                for scope_id in range(pynvml.NVML_NVLINK_MAX_LINKS)
            ] +
            [
                (pynvml.NVML_FI_DEV_NVLINK_THROUGHPUT_DATA_TX, scope_id)
                for scope_id in range(pynvml.NVML_NVLINK_MAX_LINKS)
            ]
        )
        for handle in gpu_handles
    ]

    # Output is given in KiB, thus multiply by 1024 for result in bytes
    # First `pynvml.NVML_NVLINK_MAX_LINKS` contain RX throughput, last
    # `pynvml.NVML_NVLINK_MAX_LINKS` contain TX
    return {
        "rx": [
            sum(t[i].value.ullVal * 1024
                for i in range(pynvml.NVML_NVLINK_MAX_LINKS))
            for t in throughput
        ],
        "tx": [
            sum(t[pynvml.NVML_NVLINK_MAX_LINKS + i].value.ullVal * 1024
                for i in range(pynvml.NVML_NVLINK_MAX_LINKS))
            for t in throughput
        ],
    }


def _get_max_bandwidth():
    links = [
        getattr(pynvml, f"NVML_FI_DEV_NVLINK_SPEED_MBPS_L{i}")
        for i in range(pynvml.NVML_NVLINK_MAX_LINKS)
    ]

    bandwidth = [
        pynvml.nvmlDeviceGetFieldValues(handle, links)
        for handle in gpu_handles
    ]

    # Maximum bandwidth is bidirectional, divide by two for separate RX and TX
    return max(
        sum(i.value.ullVal for i in bw) * 1024**2
        for bw in bandwidth
    ) / 2


def nvlink(doc):
    max_bw = _get_max_bandwidth()

    tx_fig = figure(
        title="TX NVLink [B/s]", sizing_mode="stretch_both", y_range=[0, max_bw]
    )
    tx_fig.yaxis.formatter = NumeralTickFormatter(format="0.0 b")
    nvlink_state = _get_nvlink_throughput()
    nvlink_state["tx-ref"] = nvlink_state["tx"].copy()
    left = list(range(ngpus))
    right = [l + 0.8 for l in left]
    source = ColumnDataSource(
        {
            "left": left,
            "right": right,
            "count-tx": [0.0 for i in range(ngpus)],
            "count-rx": [0.0 for i in range(ngpus)],
        }
    )
    mapper = LinearColorMapper(palette=all_palettes["RdYlBu"][4], low=0, high=max_bw)

    tx_fig.quad(
        source=source,
        left="left",
        right="right",
        bottom=0,
        top="count-tx",
        color={"field": "count-tx", "transform": mapper},
    )
    tx_fig.toolbar_location = None

    rx_fig = figure(
        title="RX NVLink [B/s]", sizing_mode="stretch_both", y_range=[0, max_bw]
    )
    rx_fig.yaxis.formatter = NumeralTickFormatter(format="0.0 b")
    nvlink_state["rx-ref"] = nvlink_state["rx"].copy()

    rx_fig.quad(
        source=source,
        left="left",
        right="right",
        bottom=0,
        top="count-rx",
        color={"field": "count-rx", "transform": mapper},
    )
    rx_fig.toolbar_location = None

    doc.title = "NVLink Utilization Counters"
    doc.add_root(column(tx_fig, rx_fig, sizing_mode="stretch_both"))

    def cb():
        nvlink_state["tx-ref"] = nvlink_state["tx"].copy()
        nvlink_state["rx-ref"] = nvlink_state["rx"].copy()
        src_dict = {}
        nvlink_state.update(_get_nvlink_throughput())
        src_dict["count-tx"] = [
            max(a - b, 0.0) * 5.0
            for (a, b) in zip(nvlink_state["tx"], nvlink_state["tx-ref"])
        ]
        src_dict["count-rx"] = [
            max(a - b, 0.0) * 5.0
            for (a, b) in zip(nvlink_state["rx"], nvlink_state["rx-ref"])
        ]

        source.data.update(src_dict)

    doc.add_periodic_callback(cb, 200)


def nvlink_timeline(doc):

    # X Range
    x_range = DataRange1d(follow="end", follow_interval=20000, range_padding=0)
    tools = "reset,xpan,xwheel_zoom"

    item_dict = {"time": []}
    for i in range(ngpus):
        item_dict["nvlink-tx-" + str(i)] = []
        item_dict["nvlink-rx-" + str(i)] = []

    source = ColumnDataSource(item_dict)

    def _get_color(ind):
        color_list = [
            "blue",
            "red",
            "green",
            "black",
            "brown",
            "cyan",
            "orange",
            "pink",
            "purple",
            "gold",
        ]
        return color_list[ind % len(color_list)]

    tx_fig = figure(
        title="TX NVLink (per Device) [B/s]",
        sizing_mode="stretch_both",
        x_axis_type="datetime",
        x_range=x_range,
        tools=tools,
    )
    rx_fig = figure(
        title="RX NVLink (per Device) [B/s]",
        sizing_mode="stretch_both",
        x_axis_type="datetime",
        x_range=x_range,
        tools=tools,
    )
    for i in range(ngpus):
        tx_fig.line(
            source=source, x="time", y="nvlink-tx-" + str(i), color=_get_color(i)
        )
        rx_fig.line(
            source=source, x="time", y="nvlink-rx-" + str(i), color=_get_color(i)
        )
    tx_fig.yaxis.formatter = NumeralTickFormatter(format="0.0 b")
    rx_fig.yaxis.formatter = NumeralTickFormatter(format="0.0 b")

    doc.title = "NVLink Throughput Timeline"
    doc.add_root(column(tx_fig, rx_fig, sizing_mode="stretch_both"))

    counter = 1
    nvlink_state = _get_nvlink_throughput()
    nvlink_state["tx-ref"] = nvlink_state["tx"].copy()
    nvlink_state["rx-ref"] = nvlink_state["rx"].copy()

    last_time = time.time()

    def cb():
        nonlocal last_time
        nonlocal nvlink_state
        now = time.time()
        src_dict = {"time": [now * 1000]}

        nvlink_state["tx-ref"] = nvlink_state["tx"].copy()
        nvlink_state["rx-ref"] = nvlink_state["rx"].copy()
        nvlink_state.update(_get_nvlink_throughput())
        tx_diff = [
            max(a - b, 0.0) * 5.0
            for (a, b) in zip(nvlink_state["tx"], nvlink_state["tx-ref"])
        ]

        rx_diff = [
            max(a - b, 0.0) * 5.0
            for (a, b) in zip(nvlink_state["rx"], nvlink_state["rx-ref"])
        ]

        for i in range(ngpus):
            src_dict["nvlink-tx-" + str(i)] = [tx_diff[i]]
            src_dict["nvlink-rx-" + str(i)] = [rx_diff[i]]
        source.stream(src_dict, 1000)
        last_time = now

    doc.add_periodic_callback(cb, 200)


def gpu_resource_timeline(doc):

    memory_list = [
        pynvml.nvmlDeviceGetMemoryInfo(handle).total / (1024 * 1024)
        for handle in gpu_handles
    ]
    gpu_mem_max = max(memory_list) * (1024 * 1024)
    gpu_mem_sum = sum(memory_list)

    # Shared X Range for all plots
    x_range = DataRange1d(follow="end", follow_interval=20000, range_padding=0)
    tools = "reset,xpan,xwheel_zoom"

    item_dict = {
        "time": [],
        "gpu-total": [],
        "memory-total": [],
        "rx-total": [],
        "tx-total": [],
    }
    for i in range(ngpus):
        item_dict["gpu-" + str(i)] = []
        item_dict["memory-" + str(i)] = []

    source = ColumnDataSource(item_dict)

    def _get_color(ind):
        color_list = [
            "blue",
            "red",
            "green",
            "black",
            "brown",
            "cyan",
            "orange",
            "pink",
            "purple",
            "gold",
        ]
        return color_list[ind % len(color_list)]

    memory_fig = figure(
        title="Memory Utilization (per Device) [B]",
        sizing_mode="stretch_both",
        x_axis_type="datetime",
        y_range=[0, gpu_mem_max],
        x_range=x_range,
        tools=tools,
    )
    for i in range(ngpus):
        memory_fig.line(
            source=source, x="time", y="memory-" + str(i), color=_get_color(i)
        )
    memory_fig.yaxis.formatter = NumeralTickFormatter(format="0.0 b")

    gpu_fig = figure(
        title="GPU Utilization (per Device) [%]",
        sizing_mode="stretch_both",
        x_axis_type="datetime",
        y_range=[0, 100],
        x_range=x_range,
        tools=tools,
    )
    for i in range(ngpus):
        gpu_fig.line(source=source, x="time", y="gpu-" + str(i), color=_get_color(i))

    tot_fig = figure(
        title="Total Utilization [%]",
        sizing_mode="stretch_both",
        x_axis_type="datetime",
        y_range=[0, 100],
        x_range=x_range,
        tools=tools,
    )
    tot_fig.line(
        source=source, x="time", y="gpu-total", color="blue", legend="Total-GPU"
    )
    tot_fig.line(
        source=source, x="time", y="memory-total", color="red", legend="Total-Memory"
    )
    tot_fig.legend.location = "top_left"

    figures = [gpu_fig, memory_fig, tot_fig]
    if pci_gen is not None:
        pci_fig = figure(
            title="Total PCI Throughput [B/s]",
            sizing_mode="stretch_both",
            x_axis_type="datetime",
            x_range=x_range,
            tools=tools,
        )
        pci_fig.line(source=source, x="time", y="tx-total", color="blue", legend="TX")
        pci_fig.line(source=source, x="time", y="rx-total", color="red", legend="RX")
        pci_fig.yaxis.formatter = NumeralTickFormatter(format="0.0 b")
        pci_fig.legend.location = "top_left"
        figures.append(pci_fig)

    doc.title = "Resource Timeline"
    doc.add_root(
        column(*figures, sizing_mode="stretch_both")
    )

    last_time = time.time()

    def cb():
        nonlocal last_time
        now = time.time()
        src_dict = {"time": [now * 1000]}
        gpu_tot = 0
        mem_tot = 0
        tx_tot = 0
        rx_tot = 0
        for i in range(ngpus):
            gpu = pynvml.nvmlDeviceGetUtilizationRates(gpu_handles[i]).gpu
            mem = pynvml.nvmlDeviceGetMemoryInfo(gpu_handles[i]).used
            gpu_tot += gpu
            mem_tot += mem / (1024 * 1024)
            if pci_gen is not None:
                tx = (
                    pynvml.nvmlDeviceGetPcieThroughput(
                        gpu_handles[i], pynvml.NVML_PCIE_UTIL_TX_BYTES
                    )
                    * 1024
                )
                rx = (
                    pynvml.nvmlDeviceGetPcieThroughput(
                        gpu_handles[i], pynvml.NVML_PCIE_UTIL_RX_BYTES
                    )
                    * 1024
                )
                rx_tot += rx
                tx_tot += tx
            src_dict["gpu-" + str(i)] = [gpu]
            src_dict["memory-" + str(i)] = [mem]
        src_dict["gpu-total"] = [gpu_tot / ngpus]
        src_dict["memory-total"] = [(mem_tot / gpu_mem_sum) * 100]
        src_dict["tx-total"] = [tx_tot]
        src_dict["rx-total"] = [rx_tot]

        source.stream(src_dict, 1000)

        last_time = now

    doc.add_periodic_callback(cb, 200)
