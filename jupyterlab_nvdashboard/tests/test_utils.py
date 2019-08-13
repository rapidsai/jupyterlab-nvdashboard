import pytest


def test_format_bytes():
    from jupyterlab_nvdashboard.utils import format_bytes
    assert format_bytes(1e13) == '10.00 TB'
