#!/bin/bash
# Copyright (c) 2023, NVIDIA CORPORATION.

set -eou pipefail

# Set the package name
package_name="jupyterlab-nvdashboard"

rapids-logger "Downloading artifacts from previous jobs"
RAPIDS_PY_WHEEL_NAME="${package_name}" rapids-download-wheels-from-s3 ./dist

# echo to expand wildcard before adding `[extra]` required for pip
python -m pip install $(echo ./dist/jupyterlab_nvdashboard*.whl)[test]

rapids-logger "Check GPU usage"
nvidia-smi

EXITCODE=0
trap "EXITCODE=1" ERR
set +e

rapids-logger "pytest jupyterlab-nvdashboard"
JUPYTER_PLATFORM_DIRS=1 python -m pytest

rapids-logger "Test script exiting with value: $EXITCODE"
exit ${EXITCODE}
