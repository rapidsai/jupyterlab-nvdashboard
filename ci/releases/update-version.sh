#!/bin/bash
########################
#   Version Updater    #
########################

## Usage
# bash update-version.sh <type>
#     where <type> is either `major`, `minor`, `patch`

set -e

# Grab argument for release type
RELEASE_TYPE=$1

jlpm config set version-tag-prefix ""
jlpm version --no-git-tag-version --non-interactive --${RELEASE_TYPE}