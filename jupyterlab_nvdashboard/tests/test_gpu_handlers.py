import json
import pytest
from unittest.mock import MagicMock, patch

from jupyterlab_nvdashboard.apps.gpu import (
    GPUUtilizationWebSocketHandler,
    GPUUsageWebSocketHandler,
    GPUResourceWebSocketHandler,
    NVLinkThroughputWebSocketHandler,
    PCIStatsWebSocketHandler,
)


@pytest.fixture
def mock_handler(monkeypatch):
    mock = MagicMock()
    monkeypatch.setattr(
        "jupyterlab_nvdashboard.apps.gpu.CustomWebSocketHandler.write_message",
        mock,
    )
    return mock


@pytest.fixture
def handler_args():
    with patch("tornado.web.Application") as mock_application, patch(
        "tornado.httputil.HTTPServerRequest"
    ) as mock_request:
        yield mock_application, mock_request


def test_gpu_utilization_handler(mock_handler, handler_args):
    handler = GPUUtilizationWebSocketHandler(*handler_args)
    handler.send_data()
    args, _ = mock_handler.call_args
    data = json.loads(args[0])
    assert "gpu_utilization" in data


def test_gpu_usage_handler(mock_handler, handler_args):
    handler = GPUUsageWebSocketHandler(*handler_args)
    handler.send_data()
    args, _ = mock_handler.call_args
    data = json.loads(args[0])
    assert "memory_usage" in data
    assert "total_memory" in data


def test_gpu_resource_handler(mock_handler, handler_args):
    handler = GPUResourceWebSocketHandler(*handler_args)
    handler.send_data()
    args, _ = mock_handler.call_args
    data = json.loads(args[0])
    assert "time" in data
    assert "gpu_utilization_total" in data
    assert "gpu_memory_total" in data
    assert "rx_total" in data
    assert "tx_total" in data
    assert "gpu_memory_individual" in data
    assert "gpu_utilization_individual" in data


def test_nvlink_throughput_handler(mock_handler, handler_args):
    handler = NVLinkThroughputWebSocketHandler(*handler_args)
    handler.send_data()
    args, _ = mock_handler.call_args
    data = json.loads(args[0])
    assert "nvlink_rx" in data
    assert "nvlink_tx" in data
    assert "max_rxtx_bw" in data


def test_pci_stats_handler(mock_handler, handler_args):
    handler = PCIStatsWebSocketHandler(*handler_args)
    handler.send_data()
    args, _ = mock_handler.call_args
    data = json.loads(args[0])
    assert "pci_tx" in data
    assert "pci_rx" in data
    assert "max_rxtx_tp" in data
