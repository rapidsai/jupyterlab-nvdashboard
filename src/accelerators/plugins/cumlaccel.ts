/**
 * cuml.accel accelerator plugin definition
 */

import { IAcceleratorPlugin } from '../types';

/**
 * cuml.accel provides GPU acceleration for scikit-learn compatible machine learning.
 * It enables GPU-accelerated ML algorithms with minimal code changes.
 */
export const cumlaccelPlugin: IAcceleratorPlugin = {
  id: 'cuml-accel',
  name: 'cuML Accelerator',
  description: 'GPU-accelerated scikit-learn',
  pythonPackage: 'cuml',
  extensionName: 'cuml.accel',
  minimumVersion: '25.12',
  documentation: 'https://docs.rapids.ai/api/cuml/stable/cuml-accel/'
};

