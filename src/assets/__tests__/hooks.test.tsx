/*
 * SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { renderHook } from '@testing-library/react';
import { useWebSocket } from '../hooks';

jest.mock('../../handler', () => ({
  connectToWebSocket: jest.fn()
}));

import { connectToWebSocket } from '../../handler';

describe('useWebSocket', () => {
  let ws: any;

  beforeEach(() => {
    ws = { send: jest.fn(), close: jest.fn(), readyState: 1 };
    (connectToWebSocket as jest.Mock).mockReturnValue(ws);
  });

  it('calls the latest processData for messages received after a re-render', () => {
    const first = jest.fn();
    const second = jest.fn();

    const { rerender } = renderHook(
      ({ cb }) => useWebSocket<any>('endpoint', false, 1000, cb, true),
      { initialProps: { cb: first } }
    );

    rerender({ cb: second });
    ws.onmessage({ data: JSON.stringify({ value: 1 }) });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ value: 1 }, false);
    // The connection is not re-created on re-render.
    expect(connectToWebSocket).toHaveBeenCalledTimes(1);
  });
});
