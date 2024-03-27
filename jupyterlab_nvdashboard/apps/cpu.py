import json
import psutil
import time
from jupyterlab_nvdashboard.apps.utils import CustomWebSocketHandler


class CPUResourceWebSocketHandler(CustomWebSocketHandler):
    def send_data(self):
        now = time.time()
        stats = {
            "time": now * 1000,
            "cpu_utilization": psutil.cpu_percent(),
            "memory_usage": psutil.virtual_memory().used,
            "disk_read": psutil.disk_io_counters().read_bytes,
            "disk_write": psutil.disk_io_counters().write_bytes,
            "network_read": psutil.net_io_counters().bytes_recv,
            "network_write": psutil.net_io_counters().bytes_sent,
        }
        self.write_message(json.dumps(stats))
