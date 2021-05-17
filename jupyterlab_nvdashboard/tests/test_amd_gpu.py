import pytest
from unittest.mock import MagicMock

from apps import AMDGpuProperties as amd

@pytest.mark.parametrize(
    "test_input,expected_sum,expected_len",
    [('\n\n======================= ROCm System Management Interface =======================\n \
        ================================= Concise Info =================================\n \
        GPU  Temp   AvgPwr  SCLK    MCLK    Fan   Perf  PwrCap  VRAM%  GPU%  \n \
        0    20.0c  14.0W   925Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        1    22.0c  19.0W   930Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        2    18.0c  17.0W   930Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        3    19.0c  24.0W   930Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        4    22.0c  17.0W   930Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        5    22.0c  15.0W   930Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        6    20.0c  18.0W   930Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        7    22.0c  16.0W   930Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        ================================================================================\n \
        ============================= End of ROCm SMI Log ==============================\n',
        28,
        8
    ),
    ('\n\n======================= ROCm System Management Interface =======================\n \
        ================================= Concise Info =================================\n \
        GPU  Temp   AvgPwr  SCLK    MCLK    Fan   Perf  PwrCap  VRAM%  GPU%  \n \
        0    20.0c  14.0W   925Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        1    22.0c  19.0W   930Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        2    18.0c  17.0W   930Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        3    19.0c  24.0W   930Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        4    22.0c  17.0W   930Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        5    22.0c  15.0W   930Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        6    20.0c  18.0W   930Mhz  350Mhz  0.0%  auto  225.0W    0%   0%    \n \
        ================================================================================\n \
        ============================= End of ROCm SMI Log ==============================\n',
        21,
        7
    )])
def test_getGPUCount(test_input, expected_sum, expected_len):
    bash = MagicMock()
    bash.run().stdout = test_input
    service = amd.getGPUCount(bash=bash)
    gpu = service.get_gpu()
    assert len(gpu) == expected_len
    assert sum(gpu) == expected_sum
    bash.run.assert_called_with("rocm-smi", capture_output=True)

@pytest.mark.parameterize(
    "test_input,expected_sum,expected_len",
    [('\n\n======================= ROCm System Management Interface =======================\n \
        ========================== Current clock frequencies ===========================\n \
        GPU[0]\t\t: sclk clock level: 0 (925Mhz)\n \
        GPU[1]\t\t: sclk clock level: 1 (930Mhz)\n \
        GPU[2]\t\t: sclk clock level: 1 (930Mhz)\n \
        GPU[3]\t\t: sclk clock level: 1 (930Mhz)\n \
        GPU[4]\t\t: sclk clock level: 1 (930Mhz)\n \
        GPU[5]\t\t: sclk clock level: 1 (930Mhz)\n \
        GPU[6]\t\t: sclk clock level: 1 (930Mhz)\n \
        GPU[7]\t\t: sclk clock level: 1 (930Mhz)\n \
        ================================================================================\n \
        ============================= End of ROCm SMI Log ==============================\n',
        7435,
        8
    ),
    ('\n\n======================= ROCm System Management Interface =======================\n \
        ========================== Current clock frequencies ===========================\n \
        GPU[0]\t\t: sclk clock level: 0 (925Mhz)\n \
        GPU[1]\t\t: sclk clock level: 1 (930Mhz)\n \
        GPU[2]\t\t: sclk clock level: 1 (1930Mhz)\n \
        GPU[3]\t\t: sclk clock level: 1 (930Mhz)\n \
        GPU[4]\t\t: sclk clock level: 1 (930Mhz)\n \
        GPU[5]\t\t: sclk clock level: 1 (0Mhz)\n \
        GPU[6]\t\t: sclk clock level: 1 (930Mhz)\n \
        GPU[7]\t\t: sclk clock level: 1 (10930Mhz)\n \
        ================================================================================\n \
        ============================= End of ROCm SMI Log ==============================\n',
        17505,
        8
    ),
    ('\n\n======================= ROCm System Management Interface =======================\n \
        ========================== Current clock frequencies ===========================\n \
        GPU[0]\t\t: sclk clock level: 0 (925Mhz)\n \
        GPU[1]\t\t: sclk clock level: 1 (930Mhz)\n \
        GPU[2]\t\t: sclk clock level: 1 (1930Mhz)\n \
        GPU[3]\t\t: sclk clock level: 1 (930Mhz)\n \
        GPU[4]\t\t: sclk clock level: 1 (930Mhz)\n \
        GPU[5]\t\t: sclk clock level: 1 (0Mhz)\n \
        ================================================================================\n \
        ============================= End of ROCm SMI Log ==============================\n',
        5645,
        6
    )])
def test_getGPUClockFreq(test_input, expected_sum, expected_len):
    bash = MagicMock()
    bash.run().stdout = test_input
    service = amd.getGPUClockFreq(bash=bash)
    gpu = service.get_gpu()
    assert len(gpu) == expected_len
    assert sum(gpu) == expected_sum
    bash.run.assert_called_with(["rocm-smi", "-g"], capture_output=True)

@pytest.mark.parametrize(
    "test_input,expected_sum,expected_len",
    [('\n\n======================= ROCm System Management Interface =======================\n \
        ============================== Current Memory Use ==============================\n \
        GPU[0]\t\t: GPU memory use (%): 0\n \
        GPU[1]\t\t: GPU memory use (%): 0\n \
        GPU[2]\t\t: GPU memory use (%): 0\n \
        GPU[3]\t\t: GPU memory use (%): 0\n \
        GPU[4]\t\t: GPU memory use (%): 0\n \
        GPU[5]\t\t: GPU memory use (%): 0\n \
        GPU[6]\t\t: GPU memory use (%): 0\n \
        ================================================================================\n \
        ============================= End of ROCm SMI Log ==============================\n',
        0,
        7
    ),
    ('\n\n======================= ROCm System Management Interface =======================\n \
        ============================== Current Memory Use ==============================\n \
        GPU[0]\t\t: GPU memory use (%): 100\n \
        GPU[1]\t\t: GPU memory use (%): 100\n \
        GPU[2]\t\t: GPU memory use (%): 50\n \
        GPU[3]\t\t: GPU memory use (%): 75\n \
        GPU[4]\t\t: GPU memory use (%): 100\n \
        GPU[5]\t\t: GPU memory use (%): 0\n \
        GPU[6]\t\t: GPU memory use (%): 0\n \
        GPU[7]\t\t: GPU memory use (%): 25\n \
        ================================================================================\n \
        ============================= End of ROCm SMI Log ==============================\n',
        450,
        8
    )])
def test_getGPUMemUse(test_input, expected_sum, expected_len):
    bash = MagicMock()
    bash.run().stdout = test_input
    service = amd.getGPUMemUse(bash=bash)
    gpu = service.get_gpu()
    assert len(gpu) == expected_len
    assert sum(gpu) == expected_sum
    bash.run.assert_called_with(["rocm-smi", "--showmemuse"], capture_output=True)

@pytest.mark.parametrize(
    "test_input,expected_sum,expected_len",
    [('\n\n======================= ROCm System Management Interface =======================\n \
        =========================== Measured PCIe Bandwidth ============================\n \
        GPU[0]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.000\n \
        GPU[1]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.000\n \
        GPU[2]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.000\n \
        GPU[3]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.000\n \
        GPU[4]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.000\n \
        GPU[5]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.000\n \
        GPU[6]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.000\n \
        GPU[7]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.000\n \
        ================================================================================\n \
        ============================= End of ROCm SMI Log ==============================\n',
        0.0,
        8
    ),
    ('\n\n======================= ROCm System Management Interface =======================\n \
        =========================== Measured PCIe Bandwidth ============================\n \
        GPU[0]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 500.000\n \
        GPU[1]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.071\n \
        GPU[2]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.999\n \
        GPU[3]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 1501.002\n \
        GPU[4]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.000\n \
        GPU[5]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.000\n \
        GPU[6]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.000\n \
        GPU[7]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.500\n \
        ================================================================================\n \
        ============================= End of ROCm SMI Log ==============================\n',
        2002.5720000000001,
        8
    )('\n\n======================= ROCm System Management Interface =======================\n \
        =========================== Measured PCIe Bandwidth ============================\n \
        GPU[0]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 500.000\n \
        GPU[1]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.071\n \
        GPU[2]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.999\n \
        GPU[3]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 1501.002\n \
        GPU[4]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.000\n \
        GPU[5]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.000\n \
        GPU[6]\t\t: Estimated maximum PCIe bandwidth over the last second (MB/s): 0.500\n \
        ================================================================================\n \
        ============================= End of ROCm SMI Log ==============================\n',
        2002.5720000000001,
        7
    )])
def test_getGPUpcieUse(test_input, expected_sum, expected_len):
    bash = MagicMock()
    bash.run().stdout = test_input
    service = amd.getGPUpcieUse(bash=bash)
    gpu = service.get_gpu()
    assert len(gpu) == expected_len
    assert sum(gpu) == expected_sum
    bash.run.assert_called_with(["rocm-smi", "-b"], capture_output=True)

@pytest.mark.parametrize(
    "test_input,expected_sum,expected_len",
    [('\n\n======================= ROCm System Management Interface =======================\n \
        =============================== Current voltage ================================\n \
        GPU[0]\t\t: Voltage (mV): 737\n \
        GPU[1]\t\t: Voltage (mV): 737\n \
        GPU[2]\t\t: Voltage (mV): 737\n \
        GPU[3]\t\t: Voltage (mV): 737\n \
        GPU[4]\t\t: Voltage (mV): 737\n \
        GPU[5]\t\t: Voltage (mV): 737\n \
        GPU[6]\t\t: Voltage (mV): 737\n \
        GPU[7]\t\t: Voltage (mV): 737\n \
        ================================================================================\n \
        ============================= End of ROCm SMI Log ==============================\n',
        5896,
        8
    ),
    ('\n\n======================= ROCm System Management Interface =======================\n \
        =============================== Current voltage ================================\n \
        GPU[0]\t\t: Voltage (mV): 200000\n \
        GPU[1]\t\t: Voltage (mV): 0\n \
        GPU[2]\t\t: Voltage (mV): 1000\n \
        GPU[3]\t\t: Voltage (mV): 200000\n \
        GPU[4]\t\t: Voltage (mV): 200000\n \
        GPU[5]\t\t: Voltage (mV): 200000\n \
        GPU[6]\t\t: Voltage (mV): 200000\n \
        GPU[7]\t\t: Voltage (mV): 50000\n \
        ================================================================================\n \
        ============================= End of ROCm SMI Log ==============================\n',
        1051000,
        8
    ),
    ('\n\n======================= ROCm System Management Interface =======================\n \
        =============================== Current voltage ================================\n \
        ================================================================================\n \
        ============================= End of ROCm SMI Log ==============================\n',
        0,
        0
    )])
def test_getGPUVoltage(test_input, expected_sum, expected_len):
    bash = MagicMock()
    bash.run().stdout = test_input
    service = amd.getGPUVoltage(bash=bash)
    gpu = service.get_gpu()
    assert len(gpu) == expected_len
    assert sum(gpu) == expected_sum
    bash.run.assert_called_with(["rocm-smi", "--showvoltage"], capture_output=True)
    