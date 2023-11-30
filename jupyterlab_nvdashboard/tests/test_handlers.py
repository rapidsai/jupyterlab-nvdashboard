import json
URL_PATH = "nvdashboard"


async def test_gpu_utilization_handler(jp_fetch):
    response = await jp_fetch(URL_PATH, "gpu_utilization")
    assert response.code == 200
    data = json.loads(response.body.decode())
    assert "gpu_utilization" in data


async def test_gpu_usage_handler(jp_fetch):
    response = await jp_fetch(URL_PATH, "gpu_usage")
    assert response.code == 200
    data = json.loads(response.body.decode())
    assert "memory_usage" in data
    assert "total_memory" in data


async def test_gpu_resource_handler(jp_fetch):
    response = await jp_fetch(URL_PATH, "gpu_resource")
    assert response.code == 200
    data = json.loads(response.body.decode())
    assert "time" in data
    assert "gpu_utilization_total" in data
    assert "gpu_memory_total" in data
    assert "rx_total" in data
    assert "tx_total" in data
    assert "gpu_memory_individual" in data
    assert "gpu_utilization_individual" in data


async def test_pci_stats_handler(jp_fetch):
    response = await jp_fetch(URL_PATH, "pci_stats")
    assert response.code == 200
    data = json.loads(response.body.decode())
    assert "pci_tx" in data
    assert "pci_rx" in data
    assert "max_rxtx_tp" in data


async def test_nvlink_throughput_handler(jp_fetch):
    response = await jp_fetch(URL_PATH, "nvlink_throughput")
    assert response.code == 200
    data = json.loads(response.body.decode())
    assert "nvlink_rx" in data
    assert "nvlink_tx" in data
    assert "max_rxtx_bw" in data


async def test_cpu_handlers(jp_fetch):
    response = await jp_fetch(URL_PATH, "cpu_resource")
    assert response.code == 200
    data = json.loads(response.body.decode())
    assert "time" in data
    assert "cpu_utilization" in data
    assert "memory_usage" in data
    assert "disk_read" in data
    assert "disk_write" in data
    assert "network_read" in data
    assert "network_write" in data
