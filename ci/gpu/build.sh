#!/bin/bash
# Copyright (c) 2020, NVIDIA CORPORATION.
set -e
NUMARGS=$#
ARGS=$*

# Arg parsing function
function hasArg {
    (( ${NUMARGS} != 0 )) && (echo " ${ARGS} " | grep -q " $1 ")
}

# Set path and build parallel level
export PATH=/opt/conda/bin:/usr/local/cuda/bin:$PATH
export PARALLEL_LEVEL=${PARALLEL_LEVEL:-4}
export CUDA_REL=${CUDA_VERSION%.*}

# Set home to the job's workspace
export HOME=$WORKSPACE

# Parse git describe
cd $WORKSPACE
export GIT_DESCRIBE_TAG=`git describe --abbrev=0 --tags`
export GIT_DESCRIBE_NUMBER=`git rev-list ${GIT_DESCRIBE_TAG}..HEAD --count`
export MINOR_VERSION=`echo $GIT_DESCRIBE_TAG | grep -o -E '([0-9]+\.[0-9]+)'`
export RAPIDS_DATE_STRING=$(date +%y%m%d)

################################################################################
# SETUP - Check environment
################################################################################

gpuci_logger "Check environment"
env

gpuci_logger "Check GPU usage"
nvidia-smi

gpuci_logger "Activate conda env"
. /opt/conda/etc/profile.d/conda.sh
conda activate rapids

################################################################################
# TEST
################################################################################

if hasArg --skip-tests; then
    gpuci_logger "Skipping Tests"
else
    gpuci_logger "Check GPU usage"
    nvidia-smi

    cd $WORKSPACE
    python -m pip install .

    gpuci_logger "Python py.test for jupyterlab-nvdashboard"
    py.test --cache-clear --junitxml=${WORKSPACE}/junit-nvstrings.xml -v jupyterlab-nvdashboard

    gpuci_logger "Node jlpm test for jupyterlab-nvdashboard"
    jlpm install
    jlpm run eslint:check
    jlpm test

    gpuci_logger "Jupyter extension installation test for jupyterlab-nvdashboard"
    jupyter labextension list 2>&1 | grep -ie "jupyterlab-nvdashboard.*OK"
fi
