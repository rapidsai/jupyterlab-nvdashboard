/*
 * SPDX-FileCopyrightText: Copyright (c) 2023-2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// custom svg type declaration: https://jupyterlab.readthedocs.io/en/stable/extension/ui_components.html#how-to-create-a-new-labicon-from-an-external-svg-file
declare module '..*.svg' {
  const value: string;
  export default value;
}
