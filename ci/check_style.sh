#!/bin/bash
# SPDX-FileCopyrightText: Copyright (c) 2020-2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

set -euo pipefail

rapids-logger "Create checks conda environment"
. /opt/conda/etc/profile.d/conda.sh

rapids-dependency-file-generator \
  --output conda \
  --file-key checks \
  --matrix "cuda=${RAPIDS_CUDA_VERSION%.*};arch=$(arch);py=${RAPIDS_PY_VERSION}" | tee env.yaml

rapids-mamba-retry env create --yes -f env.yaml -n checks
conda activate checks

rapids-logger "Run pre-commit checks - Python backend"
# Run pre-commit checks
pre-commit run --hook-stage manual --all-files --show-diff-on-failure

# yarn version needs to be consistent between what 'jlpm' wraps and what is declared
# in 'package.json', so automated dependency updates work as expected
rapids-logger "checking yarn versions"
JLPM_VERSION=$(jlpm --version 2>/dev/null)
PACKAGE_JSON_VERSION=$(jq -r '."packageManager"' < ./package.json | cut -d@ -f2)
if [[ "${JLPM_VERSION}" != "${PACKAGE_JSON_VERSION}" ]]; then
  echo "error: yarn version from 'jlpm --version' (${JLPM_VERSION}) and 'packageManager' field in package.json (${PACKAGE_JSON_VERSION}) do not match."
  exit 1
fi


rapids-logger "eslint:check - TS frontend"

# Run eslint checks
jlpm install
jlpm run eslint:check
