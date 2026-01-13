# Accelerator Button & Plugin System

## Overview

The accelerator plugin system is a modular, extensible framework for enabling GPU accelerators (like cuDF pandas and cuML) in JupyterLab notebooks. It consists of frontend TypeScript/React components, backend Python API handlers, and a simple declarative plugin system.

## Architecture Components

### 1. Frontend Components

#### AcceleratorButton (`src/accelerators/AcceleratorButton.tsx`)

React component that renders a dropdown selector in the JupyterLab toolbar.

**Responsibilities:**

- Renders dropdown widget in toolbar
- Manages accelerator state (active/inactive)
- Communicates with Jupyter kernel to load/unload extensions via `%load_ext`
- Persists accelerator choices in notebook metadata
- Auto-reloads accelerators after kernel restarts

**Key Features:**

- Shows active accelerator count in label
- Displays checkmarks next to active accelerators
- Handles kernel lifecycle (restart, status changes)
- Provides tooltips with accelerator info
- Disables unavailable accelerators

#### AcceleratorRegistry (`src/accelerators/registry.ts`)

Central registry for all accelerator plugins.

**Responsibilities:**

- Maintains map of registered plugins
- Auto-registers built-in plugins on initialization
- Queries backend API for system capabilities
- Maps plugin IDs to availability status

**Key Methods:**

- `register(plugin)` - Register a new plugin
- `getAll()` - Get all registered plugins
- `get(id)` - Get specific plugin by ID
- `checkAvailability()` - Query backend for GPU/package status
- `getPluginStatus()` - Get status of specific accelerator

#### Type Definitions (`src/accelerators/types.ts`)

TypeScript interfaces defining the plugin contract:

```typescript
interface IAcceleratorPlugin {
  id: string; // Unique identifier
  name: string; // Display name
  description: string; // What it does
  pythonPackage: string; // Package to check for availability
  extensionName: string; // Name for %load_ext command
  minimumVersion?: string; // Optional version requirement
  documentation?: string; // Link to documentation
}

interface IAcceleratorStatus {
  available: boolean; // Whether package is installed
  version: string | null; // Installed version
}

interface IAcceleratorSystemInfo {
  has_gpu: boolean; // System has GPUs
  ngpus: number; // Number of GPUs
  accelerators: Record<string, IAcceleratorStatus>;
}
```

### 2. Backend Components

#### HTTP Handler (`jupyterlab_nvdashboard/handlers.py`)

Provides REST API endpoint for checking accelerator availability.

**Endpoint:** `GET /nvdashboard/accelerators/check`

**Response Format:**

```json
{
  "has_gpu": true,
  "ngpus": 2,
  "accelerators": {
    "cudf-pandas": {
      "available": true,
      "version": "25.12.0"
    },
    "cuml-accel": {
      "available": false,
      "version": null
    }
  }
}
```

#### Package Checker (`jupyterlab_nvdashboard/accelerator_checker.py`)

Python module that checks if accelerator packages are installed.

**Key Functions:**

- `check_package_availability(package_name)` - Generic package checker
- `check_cudf_availability()` - Check cuDF installation
- `check_cuml_availability()` - Check cuML installation
- `check_all_accelerators()` - Check all registered accelerators

### 3. Plugin Definitions

Plugins are stored in `src/accelerators/plugins/` directory.

**Current Plugins:**

- `cudfpandas.ts` - cuDF pandas accelerator
- `cumlaccel.ts` - cuML accelerator
- `index.ts` - Plugin exports

Each plugin is a simple TypeScript object implementing `IAcceleratorPlugin`.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    JupyterLab Toolbar                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  AcceleratorButton Component                          │  │
│  │    [GPU Accel (2) ▼]                                  │  │
│  │      • ✓ cuDF pandas                                  │  │
│  │      • ✓ cuML Accelerator                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ (1) Check System Availability
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              AcceleratorRegistry (Frontend)                  │
│  • Registered Plugins                                        │
│  • Query Backend API                                         │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ (2) HTTP GET Request
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         Backend API: AcceleratorStatusHandler                │
│  Endpoint: /nvdashboard/accelerators/check                  │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ (3) Check Installed Packages
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              accelerator_checker.py                          │
│  • Import packages to verify installation                   │
│  • Return availability + version info                        │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ (4) JSON Response
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              AcceleratorButton UI Update                     │
│  • Filter available plugins                                  │
│  • Show version info                                         │
│  • Disable unavailable plugins                               │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ (5) User Selects Accelerator
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Jupyter Kernel                             │
│  • Execute: %load_ext {extensionName}                       │
│  • Save state to notebook metadata                           │
│  • Auto-reload after kernel restart                          │
└─────────────────────────────────────────────────────────────┘
```

## Lifecycle

### Initialization

1. `AcceleratorRegistry` constructor auto-registers built-in plugins
2. `AcceleratorButton` component mounts and calls `checkAvailability()`
3. Backend checks which packages are installed via Python imports
4. UI filters and displays available accelerators

### User Activation

1. User selects accelerator from dropdown
2. Component executes `%load_ext {extensionName}` in Jupyter kernel
3. Updates active plugin state
4. Saves selection to notebook metadata (`gpu_accelerators` field)
5. Prompts user to restart kernel for changes to take effect

### Kernel Restart

1. Button detects kernel status change to `'restarting'`
2. Sets internal flag to trigger reload
3. When kernel becomes `'idle'`, auto-loads saved accelerators
4. Reads from notebook metadata
5. Batch executes all `%load_ext` commands
6. Updates UI to show active accelerators

## Adding a New Accelerator

Follow these steps to add a new GPU accelerator plugin:

### Step 1: Create Plugin Definition

Create `src/accelerators/plugins/myaccel.ts`:

```typescript
import { IAcceleratorPlugin } from '../types';

export const myAccelPlugin: IAcceleratorPlugin = {
  id: 'my-accel',
  name: 'My Accelerator',
  description: 'GPU-accelerated functionality',
  pythonPackage: 'mypackage',
  extensionName: 'mypackage.accel',
  minimumVersion: '1.0.0',
  documentation: 'https://example.com/docs'
};
```

### Step 2: Export Plugin

Add to `src/accelerators/plugins/index.ts`:

```typescript
export { cudfpandasPlugin } from './cudfpandas';
export { cumlaccelPlugin } from './cumlaccel';
export { myAccelPlugin } from './myaccel';
```

### Step 3: Register Plugin

Import and register in `src/accelerators/registry.ts`:

```typescript
import { cudfpandasPlugin, cumlaccelPlugin, myAccelPlugin } from './plugins';

constructor() {
  this.plugins = new Map();
  this.register(cudfpandasPlugin);
  this.register(cumlaccelPlugin);
  this.register(myAccelPlugin);
}
```

### Step 4: Add Backend Checker

Add to `jupyterlab_nvdashboard/accelerator_checker.py`:

```python
def check_myaccel_availability():
    """Check if mypackage is installed."""
    return check_package_availability('mypackage')

def check_all_accelerators():
    return {
        'cudf-pandas': check_cudf_availability(),
        'cuml-accel': check_cuml_availability(),
        'my-accel': check_myaccel_availability()
    }
```

### Step 5: Rebuild Extension

```bash
jlpm build
jupyter labextension develop . --overwrite
```

The new accelerator will automatically:

- Appear in the dropdown menu
- Show availability status
- Display version information
- Support kernel lifecycle management
- Persist state in notebook metadata

## File Structure

```
src/accelerators/
├── AcceleratorButton.tsx       # Main UI component
├── registry.ts                 # Plugin registry
├── types.ts                    # TypeScript interfaces
└── plugins/
    ├── index.ts                # Plugin exports
    ├── cudfpandas.ts           # cuDF pandas plugin
    ├── cumlaccel.ts            # cuML plugin
    └── [your-plugin].ts        # Add new plugins here

jupyterlab_nvdashboard/
├── handlers.py                 # HTTP API endpoints
└── accelerator_checker.py      # Package availability checker
```

## TODO: Testing Components

### Backend Tests

- [ ] AcceleratorStatusHandler endpoint (response format, authentication)
- [ ] accelerator_checker module (package detection, version extraction)

### Frontend Tests

- [ ] AcceleratorRegistry (plugin registration, API communication)
- [ ] AcceleratorButton component (rendering, user interactions, state management)
- [ ] Plugin definitions (structure validation, exports)

### Integration Tests

- [ ] End-to-end activation flow (selection → kernel load → metadata save)
- [ ] Kernel restart with auto-reload of saved accelerators
- [ ] Multi-accelerator scenarios
