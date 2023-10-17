import json
import psutil
import time
import tornado
from jupyter_server.base.handlers import APIHandler


class CPUResourceHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
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
        self.set_header("Content-Type", "application/json")
        self.write(json.dumps(stats))
