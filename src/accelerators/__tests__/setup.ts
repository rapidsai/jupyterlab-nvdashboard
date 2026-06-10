/*
 * SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Jest Test Setup File
 *
 * This file runs before each test file to configure the testing environment.
 */

// Import jest-dom matchers for better assertions
import '@testing-library/jest-dom';

// Configure jest-fetch-mock
import fetchMock from 'jest-fetch-mock';

// Enable fetch mocking globally
fetchMock.enableMocks();

// Reset mocks before each test
beforeEach(() => {
  fetchMock.resetMocks();
});
