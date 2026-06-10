# SPDX-FileCopyrightText: Copyright (c) 2019-2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

import json
from jupyterlab_nvdashboard.apps.utils import CustomWebSocketHandler
import time

from cuda.core import system


gpus = list(system.Device.get_all_devices())
try:
    nvlink = gpus[0].get_nvlink(0)
    nvlink_ver = nvlink.version
    max_links = nvlink.max_links
    links = [
        getattr(system.FieldId, f"NVML_FI_DEV_NVLINK_SPEED_MBPS_L{i}")
        for i in range(max_links)
        if hasattr(system.FieldId, f"NVML_FI_DEV_NVLINK_SPEED_MBPS_L{i}")
    ]

    bandwidth = [gpu.get_field_values(links) for gpu in gpus]

    # Maximum bandwidth is bidirectional, divide by 2 for separate RX & TX
    max_bw = max(sum(i.value for i in bw) * 1024**2 for bw in bandwidth) / 2
except (IndexError, system.NotSupportedError):
    nvlink_ver = None
    max_bw = []
try:
    pci_gen = gpus[0].pci_info.max_link_generation
except (IndexError, system.NotSupportedError):
    pci_gen = None


class GPUUtilizationWebSocketHandler(CustomWebSocketHandler):
    def send_data(self):
        gpu_utilization = [gpu.utilization.gpu for gpu in gpus]
        self.write_message(json.dumps({"gpu_utilization": gpu_utilization}))


class GPUUsageWebSocketHandler(CustomWebSocketHandler):
    def send_data(self):
        memory_usage = [device.memory_info.used for device in gpus]

        total_memory = [device.memory_info.total for device in gpus]

        self.write_message(json.dumps({"memory_usage": memory_usage, "total_memory": total_memory}))


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
        memory_list = [device.memory_info.total / (1024 * 1024) for device in gpus]
        gpu_mem_sum = sum(memory_list)

        for device in gpus:
            gpu = device.utilization.gpu
            mem = device.memory_info.used
            stats["gpu_utilization_total"] += gpu
            stats["gpu_memory_total"] += mem / (1024 * 1024)

            if pci_gen is not None:
                tx = device.pci_info.tx_throughput * 1024
                rx = device.pci_info.rx_throughput * 1024
                stats["rx_total"] += rx
                stats["tx_total"] += tx
            stats["gpu_utilization_individual"].append(gpu)
            stats["gpu_memory_individual"].append(mem)

        stats["gpu_utilization_total"] /= len(gpus)
        stats["gpu_memory_total"] = round((stats["gpu_memory_total"] / gpu_mem_sum) * 100, 2)
        self.write_message(json.dumps(stats))


class NVLinkThroughputWebSocketHandler(CustomWebSocketHandler):
    prev_throughput = None

    def send_data(self):
        if max_links == 0:
            self.write_message(
                json.dumps(
                    {
                        "nvlink_rx": [0] * len(gpus),
                        "nvlink_tx": [0] * len(gpus),
                        "max_rxtx_bw": 0,
                    }
                )
            )
            return

        throughput = [
            device.get_field_values(
                [(system.FieldId.DEV_NVLINK_THROUGHPUT_DATA_RX, scope_id) for scope_id in range(max_links)]
                + [(system.FieldId.DEV_NVLINK_THROUGHPUT_DATA_TX, scope_id) for scope_id in range(max_links)],
            )
            for device in gpus
        ]

        # Check if previous throughput is available
        if self.prev_throughput is not None:
            # Calculate the change since the last request
            throughput_change = [
                [throughput[i][j].value - self.prev_throughput[i][j].value for j in range(len(throughput[i]))]
                for i in range(len(throughput))
            ]
        else:
            # If no previous throughput is available, set change to zero
            throughput_change = [[0] * len(throughput[i]) for i in range(len(throughput))]

        # Store the current throughput for the next request
        self.prev_throughput = throughput

        # Send the change in throughput as part of the response
        self.write_message(
            json.dumps(
                {
                    "nvlink_rx": [sum(throughput_change[i][:max_links]) * 1024 for i in range(len(throughput_change))],
                    "nvlink_tx": [sum(throughput_change[i][max_links:]) * 1024 for i in range(len(throughput_change))],
                    "max_rxtx_bw": max_bw,
                }
            )
        )


class PCIStatsWebSocketHandler(CustomWebSocketHandler):
    def send_data(self):
        # Use device-0 to get "upper bound"
        pci_width = gpus[0].pci_info.max_link_width
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

        pci_tx = [device.pci_info.tx_throughput * 1024 for device in gpus]
        pci_rx = [device.pci_info.rx_throughput * 1024 for device in gpus]

        stats = {
            "pci_tx": pci_tx,
            "pci_rx": pci_rx,
            "max_rxtx_tp": max_rxtx_tp,
        }

        self.write_message(json.dumps(stats))
