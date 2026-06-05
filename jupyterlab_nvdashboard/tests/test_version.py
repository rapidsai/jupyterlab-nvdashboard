# SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION.
# SPDX-License-Identifier: BSD-3-Clause

import jupyterlab_nvdashboard


def test_version_constants_are_populated():
    # __version__ should always be non-empty
    assert isinstance(jupyterlab_nvdashboard.__version__, str)
    assert len(jupyterlab_nvdashboard.__version__) > 0
