import pytest
from unittest.mock import patch


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
