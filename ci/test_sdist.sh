#!/bin/bash
# SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

set -eou pipefail

source rapids-init-pip

rapids-logger "Downloading artifacts from previous jobs"
DOWNLOADS_DIR=$(rapids-download-from-github "$(rapids-artifact-name wheel_python jupyterlab-nvdashboard jupyterlab-nvdashboard --pure --arch any)")

# unset PIP_CONSTRAINT (set by rapids-init-pip)... it doesn't affect builds as of pip 25.3, and
# results in an error from 'pip wheel' when set and --build-constraint is also passed
unset PIP_CONSTRAINT

# echo to expand wildcard before adding `[extra]` required for pip
python -m pip install \
    --build-constraint "${PIP_CONSTRAINT}" \
    --constraint "${PIP_CONSTRAINT}" \
    "$(echo "${DOWNLOADS_DIR}"/jupyterlab_nvdashboard*.tar.gz)[test]"

./ci/run_pytests.sh
