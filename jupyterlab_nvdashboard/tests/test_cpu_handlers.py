# SPDX-FileCopyrightText: Copyright (c) 2024-2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

import json
import pytest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from jupyterlab_nvdashboard.apps.cpu import CPUResourceWebSocketHandler


@pytest.fixture
def mock_handler(monkeypatch):
    mock = MagicMock()
    monkeypatch.setattr(
        "jupyterlab_nvdashboard.apps.cpu.CustomWebSocketHandler.write_message",
        mock,
    )
    return mock


def test_cpu_resource_handler(mock_handler, handler_args):
    handler = CPUResourceWebSocketHandler(*handler_args)
    handler.send_data()
    args, _ = mock_handler.call_args
    data = json.loads(args[0])
    assert "time" in data
    assert "cpu_utilization" in data
    assert "memory_usage" in data
    assert "disk_read" in data
    assert "disk_write" in data
    assert "network_read" in data
    assert "network_write" in data


@pytest.mark.parametrize("disk_available", [False, True])
@pytest.mark.parametrize("network_available", [False, True])
def test_cpu_resource_handler_io_counters(mock_handler, handler_args, disk_available, network_available):
    disk = SimpleNamespace(read_bytes=1024, write_bytes=2048) if disk_available else None
    network = SimpleNamespace(bytes_recv=4096, bytes_sent=8192) if network_available else None

    with (
        patch("jupyterlab_nvdashboard.apps.cpu.time.time", return_value=1234.5),
        patch("jupyterlab_nvdashboard.apps.cpu.psutil.cpu_percent", return_value=42.0),
        patch("jupyterlab_nvdashboard.apps.cpu.psutil.virtual_memory", return_value=SimpleNamespace(used=16384)),
        patch("jupyterlab_nvdashboard.apps.cpu.psutil.disk_io_counters", return_value=disk) as disk_io,
        patch("jupyterlab_nvdashboard.apps.cpu.psutil.net_io_counters", return_value=network) as network_io,
    ):
        handler = CPUResourceWebSocketHandler(*handler_args)
        handler.send_data()

    mock_handler.assert_called_once()
    data = json.loads(mock_handler.call_args.args[0])
    assert data == {
        "time": 1234500.0,
        "cpu_utilization": 42.0,
        "memory_usage": 16384,
        "disk_read": 1024 if disk_available else 0,
        "disk_write": 2048 if disk_available else 0,
        "network_read": 4096 if network_available else 0,
        "network_write": 8192 if network_available else 0,
    }
    disk_io.assert_called_once_with()
    network_io.assert_called_once_with()
