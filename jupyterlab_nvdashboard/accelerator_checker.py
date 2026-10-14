# Module for checking availability of GPU accelerator packages.


def check_package_availability(package_name):
    """
    Check if a Python package is installed and get its version.

    Parameters
    ----------
    package_name : str
        Name of the package to check (e.g., 'cudf', 'cuml')

    Returns
    -------
    dict
        Dictionary with 'available' (bool) and 'version' (str or None)
    """
    try:
        module = __import__(package_name)
        version = getattr(module, "__version__", "unknown")
        return {"available": True, "version": version}
    except ImportError:
        return {"available": False, "version": None}


def check_cudf_availability():
    """Check if cudf (for cudf.pandas) is installed."""
    return check_package_availability("cudf")


def check_cuml_availability():
    """Check if cuml (for cuml.accel) is installed."""
    return check_package_availability("cuml")


def check_all_accelerators():
    """
    Check availability of all supported GPU accelerators.

    Returns
    -------
    dict
        Dictionary mapping accelerator IDs to their availability status.
        Each status includes 'available' (bool) and 'version' (str or None).
    """
    return {
        "cudf-pandas": check_cudf_availability(),
        "cuml-accel": check_cuml_availability(),
    }
