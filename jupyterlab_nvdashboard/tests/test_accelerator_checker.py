# SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

from unittest.mock import patch, MagicMock
from jupyterlab_nvdashboard.accelerator_checker import (
    check_package_availability,
    check_cudf_availability,
    check_cuml_availability,
    check_all_accelerators,
)


def test_check_package_availability_installed():
    """Test check_package_availability with an installed package."""
    mock_module = MagicMock()
    mock_module.__version__ = "1.2.3"

    with patch("builtins.__import__", return_value=mock_module):
        result = check_package_availability("testpackage")

    assert result == {"available": True, "version": "1.2.3"}


def test_check_package_availability_missing():
    """Test check_package_availability with a missing package."""
    with patch(
        "builtins.__import__",
        side_effect=ImportError("No module named 'testpackage'"),
    ):
        result = check_package_availability("testpackage")

    assert result == {"available": False, "version": None}


def test_check_package_availability_no_version():
    """Test check_package_availability with package missing __version__."""
    mock_module = MagicMock()
    # Remove __version__ attribute
    del mock_module.__version__

    with patch("builtins.__import__", return_value=mock_module):
        result = check_package_availability("testpackage")

    assert result == {"available": True, "version": "unknown"}


def test_check_cudf_availability():
    """Test check_cudf_availability calls check_package_availability."""
    with patch("jupyterlab_nvdashboard.accelerator_checker.check_package_availability") as mock_check:
        mock_check.return_value = {"available": True, "version": "25.12.0"}
        result = check_cudf_availability()

        mock_check.assert_called_once_with("cudf")
        assert result == {"available": True, "version": "25.12.0"}


def test_check_cuml_availability():
    """Test check_cuml_availability calls check_package_availability."""
    with patch("jupyterlab_nvdashboard.accelerator_checker.check_package_availability") as mock_check:
        mock_check.return_value = {"available": True, "version": "25.12.0"}
        result = check_cuml_availability()

        mock_check.assert_called_once_with("cuml")
        assert result == {"available": True, "version": "25.12.0"}


def test_check_all_accelerators_structure():
    """Test check_all_accelerators returns correct structure."""
    with (
        patch(
            "jupyterlab_nvdashboard.accelerator_checker.check_cudf_availability",
            return_value={"available": True, "version": "25.12.0"},
        ),
        patch(
            "jupyterlab_nvdashboard.accelerator_checker.check_cuml_availability",
            return_value={"available": False, "version": None},
        ),
    ):
        result = check_all_accelerators()

        # Check structure
        assert isinstance(result, dict)
        assert "cudf-pandas" in result
        assert "cuml-accel" in result

        # Check cudf-pandas entry
        assert result["cudf-pandas"]["available"] is True
        assert result["cudf-pandas"]["version"] == "25.12.0"

        # Check cuml-accel entry
        assert result["cuml-accel"]["available"] is False
        assert result["cuml-accel"]["version"] is None


def test_check_all_accelerators_all_installed():
    """Test check_all_accelerators when all packages are installed."""
    with (
        patch(
            "jupyterlab_nvdashboard.accelerator_checker.check_cudf_availability",
            return_value={"available": True, "version": "25.12.0"},
        ),
        patch(
            "jupyterlab_nvdashboard.accelerator_checker.check_cuml_availability",
            return_value={"available": True, "version": "25.12.0"},
        ),
    ):
        result = check_all_accelerators()

        assert result["cudf-pandas"]["available"] is True
        assert result["cuml-accel"]["available"] is True


def test_check_all_accelerators_none_installed():
    """Test check_all_accelerators when no packages are installed."""
    with (
        patch(
            "jupyterlab_nvdashboard.accelerator_checker.check_cudf_availability",
            return_value={"available": False, "version": None},
        ),
        patch(
            "jupyterlab_nvdashboard.accelerator_checker.check_cuml_availability",
            return_value={"available": False, "version": None},
        ),
    ):
        result = check_all_accelerators()

        assert result["cudf-pandas"]["available"] is False
        assert result["cuml-accel"]["available"] is False
