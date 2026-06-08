#!/bin/bash
# SPDX-FileCopyrightText: Copyright (c) 2020-2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause

########################
#   Version Updater    #
########################

## Usage
# bash update-version.sh <new_version>


# Format is YY.MM.PP - no leading 'v' or trailing 'a'
NEXT_FULL_TAG=$1

# Get current version
CURRENT_TAG=$(git tag --merged HEAD | grep -xE '^v.*' | sort --version-sort | tail -n 1 | tr -d 'v')

echo "Preparing release $CURRENT_TAG => $NEXT_FULL_TAG"

# VERSION file
echo "${NEXT_FULL_TAG}" > ./VERSION

# package.json
jq --indent 4 -e --arg tag "$NEXT_FULL_TAG" '.version=$tag' package.json > package.json.tmp
mv package.json.tmp package.json
