from jupyter_server.utils import url_path_join
from . import apps

URL_PATH = "nvdashboard"


def setup_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    handlers = []
    if apps.gpu.ngpus > 0:
        # Prepend the base_url so that it works in a JupyterHub setting
        route_pattern_gpu_util = url_path_join(
            base_url, URL_PATH, "gpu_utilization"
        )
        route_pattern_gpu_usage = url_path_join(
            base_url, URL_PATH, "gpu_usage"
        )
        route_pattern_gpu_resource = url_path_join(
            base_url, URL_PATH, "gpu_resource"
        )
        route_pattern_pci_stats = url_path_join(
            base_url, URL_PATH, "pci_stats"
        )
        route_pattern_nvlink_throughput = url_path_join(
            base_url, URL_PATH, "nvlink_throughput"
        )
        handlers += [
            (route_pattern_gpu_util, apps.gpu.GPUUtilizationWebSocketHandler),
            (route_pattern_gpu_usage, apps.gpu.GPUUsageWebSocketHandler),
            (route_pattern_gpu_resource, apps.gpu.GPUResourceWebSocketHandler),
            (route_pattern_pci_stats, apps.gpu.PCIStatsWebSocketHandler),
            (
                route_pattern_nvlink_throughput,
                apps.gpu.NVLinkThroughputWebSocketHandler,
            ),
        ]

    route_pattern_cpu_resource = url_path_join(
        base_url, URL_PATH, "cpu_resource"
    )

    handlers += [
        (route_pattern_cpu_resource, apps.cpu.CPUResourceWebSocketHandler),
    ]

    web_app.add_handlers(host_pattern, handlers)
