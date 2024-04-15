import json
from jupyterlab_nvdashboard.apps.utils import CustomWebSocketHandler
import pynvml
import time

try:
    pynvml.nvmlInit()
except pynvml.nvml.NVMLError_LibraryNotFound:
    ngpus = 0
    gpu_handles = []
else:
    ngpus = pynvml.nvmlDeviceGetCount()
    gpu_handles = [pynvml.nvmlDeviceGetHandleByIndex(i) for i in range(ngpus)]
    try:
        nvlink_ver = pynvml.nvmlDeviceGetNvLinkVersion(gpu_handles[0], 0)
        links = [
            getattr(pynvml, f"NVML_FI_DEV_NVLINK_SPEED_MBPS_L{i}", "")
            for i in range(pynvml.NVML_NVLINK_MAX_LINKS)
            if hasattr(pynvml, f"NVML_FI_DEV_NVLINK_SPEED_MBPS_L{i}")
        ]

        bandwidth = [
            pynvml.nvmlDeviceGetFieldValues(handle, links)
            for handle in gpu_handles
        ]

        # Maximum bandwidth is bidirectional, divide by 2 for separate RX & TX
        max_bw = (
            max(
                sum(i.value.ullVal for i in bw) * 1024**2 for bw in bandwidth
            )
            / 2
        )
    except (IndexError, pynvml.nvml.NVMLError_NotSupported):
        nvlink_ver = None
        max_bw = []
    try:
        pci_gen = pynvml.nvmlDeviceGetMaxPcieLinkGeneration(gpu_handles[0])
    except (IndexError, pynvml.nvml.NVMLError_NotSupported):
        pci_gen = None


class GPUUtilizationWebSocketHandler(CustomWebSocketHandler):
    def send_data(self):
        gpu_utilization = [
            pynvml.nvmlDeviceGetUtilizationRates(gpu_handles[i]).gpu
            for i in range(ngpus)
        ]
        self.write_message(json.dumps({"gpu_utilization": gpu_utilization}))


class GPUUsageWebSocketHandler(CustomWebSocketHandler):
    def send_data(self):
        memory_usage = [
            pynvml.nvmlDeviceGetMemoryInfo(handle).used
            for handle in gpu_handles
        ]

        total_memory = [
            pynvml.nvmlDeviceGetMemoryInfo(handle).total
            for handle in gpu_handles
        ]

        self.write_message(
            json.dumps(
                {"memory_usage": memory_usage, "total_memory": total_memory}
            )
        )


class GPUResourceWebSocketHandler(CustomWebSocketHandler):
    def send_data(self):
        now = time.time()
        stats = {
            "time": now * 1000,
            "gpu_utilization_total": 0,
            "gpu_memory_total": 0,
            "rx_total": 0,
            "tx_total": 0,
            "gpu_memory_individual": [],
            "gpu_utilization_individual": [],
        }
        memory_list = [
            pynvml.nvmlDeviceGetMemoryInfo(handle).total / (1024 * 1024)
            for handle in gpu_handles
        ]
        gpu_mem_sum = sum(memory_list)

        for i in range(ngpus):
            gpu = pynvml.nvmlDeviceGetUtilizationRates(gpu_handles[i]).gpu
            mem = pynvml.nvmlDeviceGetMemoryInfo(gpu_handles[i]).used
            stats["gpu_utilization_total"] += gpu
            stats["gpu_memory_total"] += mem / (1024 * 1024)

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
                stats["rx_total"] += rx
                stats["tx_total"] += tx
            stats["gpu_utilization_individual"].append(gpu)
            stats["gpu_memory_individual"].append(mem)

        stats["gpu_utilization_total"] /= ngpus
        stats["gpu_memory_total"] = round(
            (stats["gpu_memory_total"] / gpu_mem_sum) * 100, 2
        )
        self.write_message(json.dumps(stats))


class NVLinkThroughputWebSocketHandler(CustomWebSocketHandler):
    prev_throughput = None

    def send_data(self):
        throughput = [
            pynvml.nvmlDeviceGetFieldValues(
                handle,
                [
                    (pynvml.NVML_FI_DEV_NVLINK_THROUGHPUT_DATA_RX, scope_id)
                    for scope_id in range(pynvml.NVML_NVLINK_MAX_LINKS)
                ]
                + [
                    (pynvml.NVML_FI_DEV_NVLINK_THROUGHPUT_DATA_TX, scope_id)
                    for scope_id in range(pynvml.NVML_NVLINK_MAX_LINKS)
                ],
            )
            for handle in gpu_handles
        ]

        # Check if previous throughput is available
        if self.prev_throughput is not None:
            # Calculate the change since the last request
            throughput_change = [
                [
                    throughput[i][j].value.ullVal
                    - self.prev_throughput[i][j].value.ullVal
                    for j in range(len(throughput[i]))
                ]
                for i in range(len(throughput))
            ]
        else:
            # If no previous throughput is available, set change to zero
            throughput_change = [
                [0] * len(throughput[i]) for i in range(len(throughput))
            ]

        # Store the current throughput for the next request
        self.prev_throughput = throughput

        # Send the change in throughput as part of the response
        self.write_message(
            json.dumps(
                {
                    "nvlink_rx": [
                        sum(
                            throughput_change[i][
                                : pynvml.NVML_NVLINK_MAX_LINKS
                            ]
                        )
                        * 1024
                        for i in range(len(throughput_change))
                    ],
                    "nvlink_tx": [
                        sum(
                            throughput_change[i][
                                pynvml.NVML_NVLINK_MAX_LINKS :
                            ]
                        )
                        * 1024
                        for i in range(len(throughput_change))
                    ],
                    "max_rxtx_bw": max_bw,
                }
            )
        )


class PCIStatsWebSocketHandler(CustomWebSocketHandler):
    def send_data(self):
        # Use device-0 to get "upper bound"
        pci_width = pynvml.nvmlDeviceGetMaxPcieLinkWidth(gpu_handles[0])
        pci_bw = {
            # Keys = PCIe-Generation, Values = Max PCIe Lane BW (per direction)
            # [Note: Using specs at https://en.wikipedia.org/wiki/PCI_Express]
            1: (250.0 * 1024 * 1024),
            2: (500.0 * 1024 * 1024),
            3: (985.0 * 1024 * 1024),
            4: (1969.0 * 1024 * 1024),
            5: (3938.0 * 1024 * 1024),
            6: (7877.0 * 1024 * 1024),
        }
        # Max PCIe Throughput = BW-per-lane * Width
        max_rxtx_tp = pci_width * pci_bw[pci_gen]

        pci_tx = [
            pynvml.nvmlDeviceGetPcieThroughput(
                gpu_handles[i], pynvml.NVML_PCIE_UTIL_TX_BYTES
            )
            * 1024
            for i in range(ngpus)
        ]

        pci_rx = [
            pynvml.nvmlDeviceGetPcieThroughput(
                gpu_handles[i], pynvml.NVML_PCIE_UTIL_RX_BYTES
            )
            * 1024
            for i in range(ngpus)
        ]

        stats = {
            "pci_tx": pci_tx,
            "pci_rx": pci_rx,
            "max_rxtx_tp": max_rxtx_tp,
        }

        self.write_message(json.dumps(stats))
