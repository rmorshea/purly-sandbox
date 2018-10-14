import os
import sys
import subprocess

version = sys.argv[1]

root = os.getcwd()
src = os.path.join(root, "src")

for name in os.listdir(src):
    if name != "docker-compose.yaml":
        tag = "gcr.io/purly-sandbox/{name}:{version}"
        subprocess.call(["docker", "push", tag])
