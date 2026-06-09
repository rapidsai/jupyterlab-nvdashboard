#!/bin/bash
# SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

set -e -u -o pipefail

# yarn version needs to be consistent between what 'jlpm' wraps and what is declared
# in 'package.json', so automated dependency updates work as expected
JLPM_VERSION=$(jlpm --version 2>/dev/null)
PACKAGE_JSON_VERSION=$(jq -r '."packageManager"' < ./package.json | cut -d@ -f2)
if [[ "${JLPM_VERSION}" != "${PACKAGE_JSON_VERSION}" ]]; then
  echo "error: yarn version from 'jlpm --version' (${JLPM_VERSION}) and 'packageManager' field in package.json (${PACKAGE_JSON_VERSION}) do not match."
  exit 1
fi
