# SPDX-FileCopyrightText: Copyright (c) 2024-2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

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


def test_gpu_resource_handler_without_gpus(mock_handler, handler_args, monkeypatch):
    """With no GPU/driver the handler must not divide by zero."""
    monkeypatch.setattr("jupyterlab_nvdashboard.apps.gpu.gpus", [])
    handler = GPUResourceWebSocketHandler(*handler_args)
    handler.send_data()
    data = json.loads(mock_handler.call_args[0][0])
    assert data["gpu_utilization_total"] == 0
    assert data["gpu_memory_total"] == 0
    assert data["gpu_memory_individual"] == []


def test_pci_stats_handler_without_pci_gen(mock_handler, handler_args, monkeypatch):
    monkeypatch.setattr("jupyterlab_nvdashboard.apps.gpu.pci_gen", None)
    handler = PCIStatsWebSocketHandler(*handler_args)
    handler.send_data()
    mock_handler.assert_not_called()


def test_pci_stats_handler(mock_handler, handler_args):
    from jupyterlab_nvdashboard.apps import gpu

    if gpu.pci_gen is None:
        pytest.skip("PCIe info unavailable (no GPU/driver)")
    handler = PCIStatsWebSocketHandler(*handler_args)
    handler.send_data()
    args, _ = mock_handler.call_args
    data = json.loads(args[0])
    assert "pci_tx" in data
    assert "pci_rx" in data
    assert "max_rxtx_tp" in data


@pytest.mark.parametrize(
    "error_name",
    ["DriverNotLoadedError", "LibraryNotFoundError", "DynamicLibNotFoundError"],
)
def test_gpu_module_imports_when_device_enumeration_fails(error_name):
    """Importing the GPU module must not raise when device enumeration fails."""
    import importlib

    from cuda.core import system
    from cuda.pathfinder import DynamicLibNotFoundError

    import jupyterlab_nvdashboard.apps.gpu as gpu

    if error_name == "DynamicLibNotFoundError":
        error = DynamicLibNotFoundError("libnvidia-ml.so.1")
    else:
        error = getattr(system, error_name)(0)

    class _FailingDevice:
        @staticmethod
        def get_all_devices():
            raise error

    try:
        with patch.object(system, "Device", _FailingDevice):
            reloaded = importlib.reload(gpu)
            assert reloaded.ngpus == 0
            assert reloaded.gpus == []
            assert reloaded.pci_gen is None
            assert reloaded.nvlink_ver is None
            assert reloaded.max_bw == []
    finally:
        importlib.reload(gpu)
