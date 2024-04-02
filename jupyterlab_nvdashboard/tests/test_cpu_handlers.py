import json
import pytest
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


@pytest.fixture
def handler_args():
    with patch("tornado.web.Application") as mock_application, patch(
        "tornado.httputil.HTTPServerRequest"
    ) as mock_request:
        yield mock_application, mock_request


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
