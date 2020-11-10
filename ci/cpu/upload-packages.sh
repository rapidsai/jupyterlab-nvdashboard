#!/bin/bash
# Copyright (c) 2020, NVIDIA CORPORATION.

# Restrict uploads to master branch
if [[ "${GIT_BRANCH}" != "master" ]]; then
  echo "Skipping upload"
  return 0
fi

if [ -z "$MY_UPLOAD_KEY" ]; then
  echo "No upload key"
  return 0
fi

if [ -z "$TWINE_PASSWORD" ]; then
  echo "TWINE_PASSWORD not set"
  return 0
fi

if [ -z "$NPM_TOKEN" ]; then
  echo "NPM_TOKEN not set"
  return 0
fi

anaconda -t ${MY_UPLOAD_KEY} upload -u ${CONDA_USERNAME:-rapidsai} --label main --skip-existing "`gpuci_conda_retry build conda/recipes/jupyterlab-nvdashboard --output`"

echo "Upload pypi"
twine upload --skip-existing -u ${TWINE_USERNAME:-rapidsai} dist/*

echo '//registry.npmjs.org/:_authToken=${NPM_TOKEN}' > .npmrc
if [[ "$BUILD_MODE" == "branch" && "${SOURCE_BRANCH}" != 'master' ]]; then
  echo "Nightly build, publishing to npm with nightly tag"
  npm publish --tag=nightly
else
  npm publish
fi