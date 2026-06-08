#!/bin/bash
# SPDX-FileCopyrightText: Copyright (c) 2023, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

set -eou pipefail

source rapids-init-pip

# Set the package name
package_name="jupyterlab-nvdashboard"

rapids-logger "Downloading artifacts from previous jobs"
WHEELHOUSE=$(RAPIDS_PY_WHEEL_NAME="${package_name}" RAPIDS_PY_WHEEL_PURE="1" rapids-download-wheels-from-github python)

# echo to expand wildcard before adding `[extra]` required for pip
python -m pip install \
    "$(echo "${WHEELHOUSE}"/jupyterlab_nvdashboard*.whl)[test]"

rapids-logger "Check GPU usage"
nvidia-smi

EXITCODE=0
trap "EXITCODE=1" ERR
set +e

rapids-logger "pytest jupyterlab-nvdashboard"
JUPYTER_PLATFORM_DIRS=1 python -m pytest

rapids-logger "Test script exiting with value: $EXITCODE"
exit ${EXITCODE}
