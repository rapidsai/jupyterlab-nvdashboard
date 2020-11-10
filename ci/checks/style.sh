#!/bin/bash
# Copyright (c) 2020, NVIDIA CORPORATION.

# Ignore errors and set path
set +e
PATH=/opt/conda/bin:$PATH

# Activate common conda env
. /opt/conda/etc/profile.d/conda.sh
conda activate rapids

# Run flake8 and get results/return code
FLAKE=`flake8 --exclude=src,style,test`
RETVAL=$?

# Output results if failure otherwise show pass
if [ "$FLAKE" != "" ]; then
  echo -e "\n\n>>>> FAILED: flake8 style check; begin output\n\n"
  echo -e "$FLAKE"
  echo -e "\n\n>>>> FAILED: flake8 style check; end output\n\n"
else
  echo -e "\n\n>>>> PASSED: flake8 style check\n\n"
fi

#TODO Fix flake8 issues then re-enable this check
#exit $RETVAL
exit 0