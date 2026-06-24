#!/bin/bash
# SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

set -eou pipefail

sdist_dir_relative_path=$1

rapids-logger "validate packages with 'pydistcheck'"

pydistcheck \
    --inspect \
    --max-allowed-files 41 \
    --max-allowed-size-compressed 1Mi \
    "$(echo "${sdist_dir_relative_path}"/*.tar.gz)"

rapids-logger "validate packages with 'twine'"

twine check \
    --strict \
    "$(echo "${sdist_dir_relative_path}"/*.tar.gz)"
