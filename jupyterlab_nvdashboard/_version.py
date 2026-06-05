# SPDX-FileCopyrightText: Copyright (c) 2023-2026, NVIDIA CORPORATION.
# SPDX-License-Identifier: BSD-3-Clause

import importlib.resources

__version__ = (
    importlib.resources.files(__package__)
    .joinpath("VERSION")
    .read_text()
    .strip()
)

__all__ = ["__version__"]
