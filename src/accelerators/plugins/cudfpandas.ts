/**
 * cudf.pandas accelerator plugin definition
 */

import { IAcceleratorPlugin } from '../types';

/**
 * cudf.pandas provides a zero-code-change GPU accelerator for pandas.
 * It automatically intercepts pandas operations and routes them to cuDF when possible.
 */
export const cudfpandasPlugin: IAcceleratorPlugin = {
  id: 'cudf-pandas',
  name: 'cuDF pandas',
  description: 'GPU-accelerated pandas',
  pythonPackage: 'cudf',
  activationCode: '%load_ext cudf.pandas',
  minimumVersion: '25.12',
  documentation: 'https://docs.rapids.ai/api/cudf/stable/cudf_pandas/'
};
