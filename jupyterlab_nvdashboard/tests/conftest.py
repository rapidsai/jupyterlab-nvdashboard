def pytest_configure(config):
    config.addinivalue_line("markers", "asyncio: mark test as asyncio")
