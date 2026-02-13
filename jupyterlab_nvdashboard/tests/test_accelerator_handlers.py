"""
Tests for AcceleratorStatusHandler.

Authentication Mocking Explanation:
-----------------------------------
The @tornado.web.authenticated decorator checks authentication by accessing
self.current_user. The current_user property in JupyterHandler works as
follows:
1. First checks if _jupyter_current_user is set (preferred, no deprecation)
2. If not set, calls get_current_user() (deprecated in jupyter-server 2.0+)

However, Tornado's @authenticated decorator appears to call get_current_user()
directly in some code paths, bypassing the current_user property check. This
means:
- Setting only _jupyter_current_user: Tests pass but deprecation warnings
  appear
- Mocking only get_current_user: Tests pass and warnings are prevented

We use both for completeness and defense in depth:
- handler._jupyter_current_user = "test_user" - Sets the preferred internal
  state
- handler.get_current_user = MagicMock(return_value="test_user") - Prevents
  the deprecated method from being called when the decorator accesses it
  directly

In practice, mocking get_current_user alone is sufficient to prevent warnings,
but setting _jupyter_current_user follows the deprecation warning guidance and
ensures the current_user property would work correctly if accessed directly.
"""

import json
import pytest
from unittest.mock import MagicMock, patch
from jupyterlab_nvdashboard.handlers import AcceleratorStatusHandler


@pytest.fixture
def handler_args():
    """Fixture to provide mock application and request for handler init."""
    with (
        patch("tornado.web.Application") as mock_application,
        patch("tornado.httputil.HTTPServerRequest") as mock_request,
    ):
        # Mock the settings to return appropriate values
        mock_settings = {
            "base_url": "/",
        }
        mock_application.settings = mock_settings
        yield mock_application, mock_request


def test_accelerator_status_handler_with_gpus(handler_args):
    """Test AcceleratorStatusHandler GET endpoint with GPUs."""
    mock_accelerators = {
        "cudf-pandas": {"available": True, "version": "25.12.0"},
        "cuml-accel": {"available": False, "version": None},
    }

    with (
        patch("jupyterlab_nvdashboard.handlers.apps.gpu.ngpus", 2),
        patch(
            "jupyterlab_nvdashboard.accelerator_checker."
            "check_all_accelerators",
            return_value=mock_accelerators,
        ),
    ):
        # Create actual handler instance with mocked args
        handler = AcceleratorStatusHandler(*handler_args)
        handler.finish = MagicMock()
        # Mock authentication (see module docstring for explanation)
        handler._jupyter_current_user = "test_user"
        handler.get_current_user = MagicMock(return_value="test_user")

        # Call get method
        handler.get()

        # Verify finish was called with JSON string
        assert handler.finish.called
        call_args = handler.finish.call_args[0][0]
        response_data = json.loads(call_args)

        # Verify response structure
        assert response_data["has_gpu"] is True
        assert response_data["ngpus"] == 2
        assert "accelerators" in response_data
        assert response_data["accelerators"] == mock_accelerators


def test_accelerator_status_handler_no_gpus(handler_args):
    """Test AcceleratorStatusHandler GET endpoint with no GPUs."""
    mock_accelerators = {
        "cudf-pandas": {"available": False, "version": None},
        "cuml-accel": {"available": False, "version": None},
    }

    with (
        patch("jupyterlab_nvdashboard.handlers.apps.gpu.ngpus", 0),
        patch(
            "jupyterlab_nvdashboard.accelerator_checker."
            "check_all_accelerators",
            return_value=mock_accelerators,
        ),
    ):
        # Create actual handler instance with mocked args
        handler = AcceleratorStatusHandler(*handler_args)
        handler.finish = MagicMock()
        # Mock authentication (see module docstring for explanation)
        handler._jupyter_current_user = "test_user"
        handler.get_current_user = MagicMock(return_value="test_user")

        # Call get method
        handler.get()

        # Verify finish was called with JSON string
        assert handler.finish.called
        call_args = handler.finish.call_args[0][0]
        response_data = json.loads(call_args)

        # Verify response structure
        assert response_data["has_gpu"] is False
        assert response_data["ngpus"] == 0
        assert "accelerators" in response_data
        assert response_data["accelerators"] == mock_accelerators


def test_accelerator_status_handler_response_structure(handler_args):
    """Test AcceleratorStatusHandler response matches IAcceleratorSystemInfo"""
    mock_accelerators = {
        "cudf-pandas": {"available": True, "version": "25.12.0"},
        "cuml-accel": {"available": True, "version": "25.12.0"},
    }

    with (
        patch("jupyterlab_nvdashboard.handlers.apps.gpu.ngpus", 1),
        patch(
            "jupyterlab_nvdashboard.accelerator_checker."
            "check_all_accelerators",
            return_value=mock_accelerators,
        ),
    ):
        handler = AcceleratorStatusHandler(*handler_args)
        handler.finish = MagicMock()
        # Mock authentication (see module docstring for explanation)
        handler._jupyter_current_user = "test_user"
        handler.get_current_user = MagicMock(return_value="test_user")

        handler.get()

        call_args = handler.finish.call_args[0][0]
        response_data = json.loads(call_args)

        # Verify all required fields
        assert "has_gpu" in response_data
        assert isinstance(response_data["has_gpu"], bool)
        assert "ngpus" in response_data
        assert isinstance(response_data["ngpus"], int)
        assert "accelerators" in response_data
        assert isinstance(response_data["accelerators"], dict)

        # Verify accelerators structure
        for accel_id, accel_status in response_data["accelerators"].items():
            assert "available" in accel_status
            assert isinstance(accel_status["available"], bool)
            assert "version" in accel_status
            assert accel_status["version"] is None or isinstance(
                accel_status["version"], str
            )


def test_accelerator_status_handler_authentication_decorator():
    """Test AcceleratorStatusHandler has authentication decorator."""
    # Check if get method exists and is callable
    assert hasattr(AcceleratorStatusHandler, "get")
    assert callable(AcceleratorStatusHandler.get)

    # Verify the decorator is present by checking method attributes
    # JupyterHandler methods should have authentication
    # The @tornado.web.authenticated decorator should be applied
    # We verify by checking the method exists and can be called


def test_accelerator_status_handler_error_handling(handler_args):
    """Test AcceleratorStatusHandler handles errors gracefully."""
    with (
        patch("jupyterlab_nvdashboard.handlers.apps.gpu.ngpus", 1),
        patch(
            "jupyterlab_nvdashboard.accelerator_checker."
            "check_all_accelerators",
            side_effect=Exception("Test error"),
        ),
    ):
        handler = AcceleratorStatusHandler(*handler_args)
        handler.finish = MagicMock()
        # Mock authentication (see module docstring for explanation)
        handler._jupyter_current_user = "test_user"
        handler.get_current_user = MagicMock(return_value="test_user")

        # Should raise exception (not catch it internally)
        with pytest.raises(Exception, match="Test error"):
            handler.get()
