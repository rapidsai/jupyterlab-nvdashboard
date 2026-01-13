# Accelerator Feature: Design Considerations

## Overview

This document analyzes design decisions regarding the accelerator management feature within the jupyterlab-nvdashboard extension, specifically whether it should remain integrated or be separated into its own extension.

## Current Situation of this PR

We have the jupyterlab-nvdashboard Core Features and the new (added in this PR) gpu accelerator
toggle button in the same extension

## Q: Should they be separated or not?

### Arguments for "Together"

**Easier usability**

- Users typically would want both monitoring and acceleration

**Avoid Maintenance Overhead**

- Two repositories, two CI/CD pipelines
- Two release cycles to coordinate
- Duplicate infrastructure (testing, docs, packaging)

**Discovery**

- Harder for users to find if split across extensions

**Shared Infrastructure**

- Both features use GPU detection
- Both use backend handlers
- Both target same user base

### Arguments for "Separated"

**Scope Clarity**

- nvdashboard is about monitoring, accelerators are about compute enablement

**Installation Flexibility**

- Users might one but not the other

**Maintenance and releases**

- Easier to release one separate from teh other.

**Reusability and Adoption**

- Other projects could use accelerator management without dashboard, and they
  wouldn't need to strip out the code.

## Recommendation:

- For now would be to keep together and then see what happens
