# SPDX-FileCopyrightText: Copyright (c) 2024-2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

import json
import pytest
from unittest.mock import MagicMock

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


def test_nvlink_throughput_handler_reports_bytes_per_second(mock_handler, handler_args, monkeypatch):
    module = "jupyterlab_nvdashboard.apps.gpu"
    device = MagicMock()
    device.get_field_values.side_effect = [
        [MagicMock(value=0), MagicMock(value=0)],
        [MagicMock(value=100), MagicMock(value=200)],
    ]
    monkeypatch.setattr(f"{module}.system", MagicMock())
    monkeypatch.setattr(f"{module}.gpus", [device])
    monkeypatch.setattr(f"{module}.max_links", 1)
    monkeypatch.setattr(f"{module}.max_bw", 1000000, raising=False)
    # Two samples taken 100 ms apart
    monkeypatch.setattr(f"{module}.time", MagicMock(monotonic=MagicMock(side_effect=[10.0, 10.1])))

    handler = NVLinkThroughputWebSocketHandler(*handler_args)
    handler.send_data()
    handler.send_data()

    args, _ = mock_handler.call_args
    data = json.loads(args[0])
    # NVML counters are in KiB
    assert data["nvlink_rx"] == [pytest.approx(100 * 1024 / 0.1)]
    assert data["nvlink_tx"] == [pytest.approx(200 * 1024 / 0.1)]


def test_pci_stats_handler(mock_handler, handler_args):
    handler = PCIStatsWebSocketHandler(*handler_args)
    handler.send_data()
    args, _ = mock_handler.call_args
    data = json.loads(args[0])
    assert "pci_tx" in data
    assert "pci_rx" in data
    assert "max_rxtx_tp" in data
