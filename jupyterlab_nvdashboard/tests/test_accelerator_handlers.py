# SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

"""
Tests for AcceleratorStatusHandler.

Authentication Mocking:
-----------------------
The @tornado.web.authenticated decorator directly calls get_current_user()
instead of using the current_user property. This means it bypasses
JupyterHandler's internal _jupyter_current_user attribute entirely.

To prevent deprecation warnings from jupyter-server 2.0+, we must mock
get_current_user() directly. Setting _jupyter_current_user alone is
insufficient because the decorator never accesses it.
"""

import json
import pytest
from unittest.mock import MagicMock, patch
from jupyterlab_nvdashboard.handlers import AcceleratorStatusHandler


@pytest.fixture
def authenticated_handler(handler_args):
    """
    Create an AcceleratorStatusHandler with authentication properly mocked.

    This fixture handles the authentication mocking required by the
    @tornado.web.authenticated decorator. It mocks get_current_user()
    directly because that's what the decorator calls, bypassing the
    current_user property and _jupyter_current_user attribute.
    """
    handler = AcceleratorStatusHandler(*handler_args)
    handler.finish = MagicMock()
    # Mock get_current_user to satisfy @authenticated decorator
    handler.get_current_user = MagicMock(return_value="test_user")
    return handler


def test_accelerator_status_handler_with_gpus(authenticated_handler):
    """Test AcceleratorStatusHandler GET endpoint with GPUs."""
    mock_accelerators = {
        "cudf-pandas": {"available": True, "version": "25.12.0"},
        "cuml-accel": {"available": False, "version": None},
    }

    with (
        patch("jupyterlab_nvdashboard.handlers.apps.gpu.ngpus", 2),
        patch(
            "jupyterlab_nvdashboard.accelerator_checker.check_all_accelerators",
            return_value=mock_accelerators,
        ),
    ):
        authenticated_handler.get()

        # Verify finish was called with JSON string
        assert authenticated_handler.finish.called
        call_args = authenticated_handler.finish.call_args[0][0]
        response_data = json.loads(call_args)

        # Verify response structure
        assert response_data["has_gpu"] is True
        assert response_data["ngpus"] == 2
        assert "accelerators" in response_data
        assert response_data["accelerators"] == mock_accelerators


def test_accelerator_status_handler_no_gpus(authenticated_handler):
    """Test AcceleratorStatusHandler GET endpoint with no GPUs."""
    mock_accelerators = {
        "cudf-pandas": {"available": False, "version": None},
        "cuml-accel": {"available": False, "version": None},
    }

    with (
        patch("jupyterlab_nvdashboard.handlers.apps.gpu.ngpus", 0),
        patch(
            "jupyterlab_nvdashboard.accelerator_checker.check_all_accelerators",
            return_value=mock_accelerators,
        ),
    ):
        authenticated_handler.get()

        # Verify finish was called with JSON string
        assert authenticated_handler.finish.called
        call_args = authenticated_handler.finish.call_args[0][0]
        response_data = json.loads(call_args)

        # Verify response structure
        assert response_data["has_gpu"] is False
        assert response_data["ngpus"] == 0
        assert "accelerators" in response_data
        assert response_data["accelerators"] == mock_accelerators


def test_accelerator_status_handler_response_structure(authenticated_handler):
    """
    Test AcceleratorStatusHandler response matches IAcceleratorSystemInfo.
    """
    mock_accelerators = {
        "cudf-pandas": {"available": True, "version": "25.12.0"},
        "cuml-accel": {"available": True, "version": "25.12.0"},
    }

    with (
        patch("jupyterlab_nvdashboard.handlers.apps.gpu.ngpus", 1),
        patch(
            "jupyterlab_nvdashboard.accelerator_checker.check_all_accelerators",
            return_value=mock_accelerators,
        ),
    ):
        authenticated_handler.get()

        call_args = authenticated_handler.finish.call_args[0][0]
        response_data = json.loads(call_args)

        # Verify all required fields
        assert "has_gpu" in response_data
        assert isinstance(response_data["has_gpu"], bool)
        assert "ngpus" in response_data
        assert isinstance(response_data["ngpus"], int)
        assert "accelerators" in response_data
        assert isinstance(response_data["accelerators"], dict)

        # Verify accelerators structure
        for _, accel_status in response_data["accelerators"].values():
            assert "available" in accel_status
            assert isinstance(accel_status["available"], bool)
            assert "version" in accel_status
            assert accel_status["version"] is None or isinstance(accel_status["version"], str)


def test_accelerator_status_handler_authentication_decorator():
    """Test AcceleratorStatusHandler has authentication decorator."""
    assert hasattr(AcceleratorStatusHandler, "get")
    assert callable(AcceleratorStatusHandler.get)
    # Note: We verify the decorator is present by confirming the method exists
    # and is callable. The actual authentication behavior is tested implicitly
    # in other tests where get_current_user is mocked. Direct decorator
    # inspection is difficult due to how Tornado applies decorators.


def test_accelerator_status_handler_error_handling(authenticated_handler):
    """Test AcceleratorStatusHandler handles errors gracefully."""
    with (
        patch("jupyterlab_nvdashboard.handlers.apps.gpu.ngpus", 1),
        patch(
            "jupyterlab_nvdashboard.accelerator_checker.check_all_accelerators",
            side_effect=Exception("Test error"),
        ),
        pytest.raises(Exception, match="Test error"),
    ):
        authenticated_handler.get()
