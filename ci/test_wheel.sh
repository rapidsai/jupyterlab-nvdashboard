#!/bin/bash
# SPDX-FileCopyrightText: Copyright (c) 2023-2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

set -eou pipefail

source rapids-init-pip

rapids-logger "Downloading artifacts from previous jobs"
WHEELHOUSE=$(rapids-download-from-github "$(rapids-artifact-name wheel_python jupyterlab-nvdashboard jupyterlab-nvdashboard --pure --arch any)")

# generate constraints (possibly pinning to oldest support versions of dependencies)
rapids-generate-pip-constraints py_test "${PIP_CONSTRAINT}"

# echo to expand wildcard before adding `[extra]` required for pip
python -m pip install \
    --constraint "${PIP_CONSTRAINT}" \
    "$(echo "${WHEELHOUSE}"/jupyterlab_nvdashboard*.whl)[test]"

./ci/run_pytests.sh
