import subprocess
import sys
import os

os.chdir(os.path.join(os.path.dirname(__file__), "backend"))
subprocess.run([sys.executable, "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--reload"])
