# Accelerator Testing Guide

This document describes the tests added for the accelerator (GPU/cuDF/cuML) functionality,  It covers both **frontend** (TypeScript/Jest) and **backend** (Python/pytest) test suites at a high level and how to run them.

---

## Backend Tests (`jupyterlab_nvdashboard/tests/`)

Backend tests use **pytest**. Shared fixtures (e.g. `handler_args`) are in `jupyterlab_nvdashboard/tests/conftest.py`.

### `test_accelerator_checker.py`

Covers the **accelerator checker** module (`accelerator_checker.py`): package availability checks, cudf/cuml delegation, and the combined `check_all_accelerators()` result. Uses `unittest.mock.patch` to mock imports and helpers. See each test’s docstring for what it asserts.

### `test_accelerator_handlers.py`

Covers **`AcceleratorStatusHandler`** (the HTTP GET endpoint that returns accelerator/GPU status): response when GPUs are present or absent, JSON shape, authentication mocking, and error handling. Uses the `handler_args` and `authenticated_handler` fixtures. See each test’s docstring for details.

### Running backend tests

From the **repository root**, with the environment that has `jupyterlab_nvdashboard` and pytest installed:

```bash
# Run all accelerator backend tests
python -m pytest jupyterlab_nvdashboard/tests/test_accelerator_*.py -v

# Run only the checker tests
python -m pytest jupyterlab_nvdashboard/tests/test_accelerator_checker.py -v

# Run only the handler tests
python -m pytest jupyterlab_nvdashboard/tests/test_accelerator_handlers.py -v
```

Add `-v` for verbose output; other pytest options (e.g. `-x`, `-k EXPR`) work as usual.

---

## Frontend Tests (`src/accelerators/__tests__/`)

Frontend tests use **Jest** with **jsdom**, **ts-jest**, **React Testing Library**, and **jest-fetch-mock**.

### `setup.ts`

Global test setup: imports `@testing-library/jest-dom`, enables and resets `jest-fetch-mock` before each test.

### `registry.test.ts`

Covers **AcceleratorRegistry**: plugin registration (getAll, register, get), `checkAvailability()` with success and fetch errors, and `getPluginStatus()` with various inputs. Mocks `@jupyterlab/coreutils` and `@jupyterlab/services`. See the `describe`/`it` blocks and any docstrings for what each test does.

### `AcceleratorButton.test.tsx`

Covers the **AcceleratorButton** / **AcceleratorSelector** UI: rendering states (loading, no GPU, active count, etc.), user interactions (toggle, select all, clear all), metadata helpers (get/save), and kernel lifecycle (mocked). Mocks JupyterLab apputils, ui-components, translation, and the accelerator registry. See the test blocks and docstrings for each case.

### Running frontend tests

From the **repository root**:

```bash
# Run all tests (including any top-level test/ and accelerator __tests__)
jlpm test

# Run only accelerator frontend tests by path
jlpm test src/accelerators/__tests__

# Run a single test file
jlpm test src/accelerators/__tests__/registry.test.ts
jlpm test src/accelerators/__tests__/AcceleratorButton.test.tsx

# Watch mode (re-run on file changes)
jlpm test --watch
```

`jlpm` is JupyterLab’s package manager (yarn). The `test` script in `package.json` runs Jest.

---

## Running both suites

To run backend and frontend accelerator-related tests in one go:

```bash
python -m pytest jupyterlab_nvdashboard/tests/test_accelerator_*.py -v && jlpm test
```
