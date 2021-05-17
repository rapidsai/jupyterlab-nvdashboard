# requires rocm!
import subprocess
import logging
import re


logging.basicConfig(
    filename="/var/log/amd_gpu.log",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


class AMDGpuProperties:
    def __init__(self, bash=subprocess):
        self.bash = bash
        self.gpus = self.getGPUCount()

    def getGPUCount(self):
        try:
            output = self.bash.run("rocm-smi", capture_output=True).stdout
            if "ROCm System Management Interface" in output:
                gpusCount = [int(num[-1]) for num in re.findall(r'\n\d{1,2}', str(output))]
                self.gpus = len(gpusCount)

        except Exception:
            logger.error(Exception)

    def getGPUClockFreq(self, flag="-g"):
        try:
            output = self.bash.run(["rocm-smi", flag], capture_output=True).stdout
            if "ROCm System Management Interface" in output:
                freq = [int(num[1:-1]) for num in re.findall(r'\([0-9]*M', str(output))]
                return freq

        except Exception:
            logger.error(Exception)

    def getGPUMemUse(self, flag="--showmemuse"):
        try:
            output = self.bash.run(["rocm-smi", flag], capture_output=True).stdout
            if "ROCm System Management Interface" in output:
                memUse = [int(num[0:-1]) for num in re.findall(r'\d{1,3}\n', str(output))]
                return memUse

        except Exception:
            logger.error(Exception)
    
    def getGPUpcieUse(self, flag="-b"):
        try:
            output = self.bash.run(["rocm-smi", flag], capture_output=True).stdout      # takes a few seconds
            if "ROCm System Management Interface" in output:
                pcieUse = [float(num[1:-1]) for num in re.findall(r' [0-9]*\.[0-9]*\n', str(output))]
                return pcieUse

        except Exception:
            logger.error(Exception)

    def getGPUVoltage(self, flag="--showvoltage"):
        try:
            output = self.bash.run(["rocm-smi", flag], capture_output=True).stdout      # takes a few seconds
            if "ROCm System Management Interface" in output:
                voltage = [int(num[:-1]) for num in re.findall(r' [0-9]*\n', str(output))]
                return voltage

        except Exception:
            logger.error(Exception)
