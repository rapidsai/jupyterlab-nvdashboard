#!/bin/bash
# Copyright (c) 2020-2022, NVIDIA CORPORATION.

set -euo pipefail

rapids-logger "Create checks conda environment"
. /opt/conda/etc/profile.d/conda.sh

rapids-dependency-file-generator \
  --output conda \
  --file_key checks \
  --matrix "cuda=${RAPIDS_CUDA_VERSION%.*};arch=$(arch);py=${RAPIDS_PY_VERSION}" | tee env.yaml

rapids-mamba-retry env create --force -f env.yaml -n checks
conda activate checks

rapids-logger "Run pre-commit checks - Python backend"
# Run pre-commit checks
pre-commit run --hook-stage manual --all-files --show-diff-on-failure

rapids-logger "eslint:check - TS frontend"
# Run eslint checks
jlpm install
jlpm run eslint:check