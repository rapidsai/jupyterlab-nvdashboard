#!/bin/bash
# SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

set -e -u -o pipefail

echo "Check GPU usage"
nvidia-smi

echo "pytest jupyterlab-nvdashboard"
JUPYTER_PLATFORM_DIRS=1 python -m pytest "$@"
