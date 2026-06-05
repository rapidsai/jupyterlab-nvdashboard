#!/bin/bash
# Copyright (c) 2023-2025, NVIDIA CORPORATION
# Run frontend (Jest) tests. Does not require GPU.

set -euo pipefail

. /opt/conda/etc/profile.d/conda.sh

rapids-logger "Generate frontend testing dependencies"
rapids-dependency-file-generator \
  --output conda \
  --file-key checks \
  --matrix "cuda=${RAPIDS_CUDA_VERSION%.*};arch=$(arch);py=${RAPIDS_PY_VERSION}" | tee env.yaml

rapids-mamba-retry env create --yes -f env.yaml -n test_frontend

# Temporarily allow unbound variables for conda activation.
set +u
conda activate test_frontend
set -u

rapids-print-env

rapids-logger "Install JS dependencies"
jlpm install

EXITCODE=0
trap "EXITCODE=1" ERR
set +e

rapids-logger "Run frontend tests (Jest)"
jlpm test

rapids-logger "Frontend test script exiting with value: $EXITCODE"
exit ${EXITCODE}
