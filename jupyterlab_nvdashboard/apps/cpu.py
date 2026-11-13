# SPDX-FileCopyrightText: Copyright (c) 2019-2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

import json
import psutil
import time
from jupyterlab_nvdashboard.apps.utils import CustomWebSocketHandler


class CPUResourceWebSocketHandler(CustomWebSocketHandler):
    def send_data(self):
        now = time.time()
        disk_io = psutil.disk_io_counters()
        network_io = psutil.net_io_counters()
        stats = {
            "time": now * 1000,
            "cpu_utilization": psutil.cpu_percent(),
            "memory_usage": psutil.virtual_memory().used,
            "disk_read": disk_io.read_bytes if disk_io is not None else 0,
            "disk_write": disk_io.write_bytes if disk_io is not None else 0,
            "network_read": network_io.bytes_recv if network_io is not None else 0,
            "network_write": network_io.bytes_sent if network_io is not None else 0,
        }
        self.write_message(json.dumps(stats))
