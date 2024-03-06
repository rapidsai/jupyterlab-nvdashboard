import json
import pytest
import websockets

URL_PATH = "ws://localhost:8888/nvdashboard"


@pytest.mark.asyncio
async def test_gpu_utilization_handler():
    async with websockets.connect(f"{URL_PATH}/gpu_utilization") as websocket:
        # Receive the initial status message
        status_message = await websocket.recv()
        status_data = json.loads(status_message)
        assert status_data.get("status") == "connected"

        # Receive the actual data message
        response = await websocket.recv()
        data = json.loads(response)
        assert "gpu_utilization" in data


@pytest.mark.asyncio
async def test_gpu_usage_handler():
    async with websockets.connect(f"{URL_PATH}/gpu_usage") as websocket:
        # Receive the initial status message
        status_message = await websocket.recv()
        status_data = json.loads(status_message)
        assert status_data.get("status") == "connected"

        response = await websocket.recv()
        data = json.loads(response)
        assert "memory_usage" in data
        assert "total_memory" in data


@pytest.mark.asyncio
async def test_gpu_resource_handler():
    async with websockets.connect(f"{URL_PATH}/gpu_resource") as websocket:
        # Receive the initial status message
        status_message = await websocket.recv()
        status_data = json.loads(status_message)
        assert status_data.get("status") == "connected"

        response = await websocket.recv()
        data = json.loads(response)
        assert "time" in data
        assert "gpu_utilization_total" in data
        assert "gpu_memory_total" in data
        assert "rx_total" in data
        assert "tx_total" in data
        assert "gpu_memory_individual" in data
        assert "gpu_utilization_individual" in data


@pytest.mark.asyncio
async def test_pci_stats_handler():
    async with websockets.connect(f"{URL_PATH}/pci_stats") as websocket:
        # Receive the initial status message
        status_message = await websocket.recv()
        status_data = json.loads(status_message)
        assert status_data.get("status") == "connected"

        response = await websocket.recv()
        data = json.loads(response)
        assert "pci_tx" in data
        assert "pci_rx" in data
        assert "max_rxtx_tp" in data


@pytest.mark.asyncio
async def test_nvlink_throughput_handler():
    async with websockets.connect(
        f"{URL_PATH}/nvlink_throughput"
    ) as websocket:
        # Receive the initial status message
        status_message = await websocket.recv()
        status_data = json.loads(status_message)
        assert status_data.get("status") == "connected"

        response = await websocket.recv()
        data = json.loads(response)
        assert "nvlink_rx" in data
        assert "nvlink_tx" in data
        assert "max_rxtx_bw" in data


@pytest.mark.asyncio
async def test_cpu_handlers():
    async with websockets.connect(f"{URL_PATH}/cpu_resource") as websocket:
        # Receive the initial status message
        status_message = await websocket.recv()
        status_data = json.loads(status_message)
        assert status_data.get("status") == "connected"

        response = await websocket.recv()
        data = json.loads(response)
        assert "time" in data
        assert "cpu_utilization" in data
        assert "memory_usage" in data
        assert "disk_read" in data
        assert "disk_write" in data
        assert "network_read" in data
        assert "network_write" in data
