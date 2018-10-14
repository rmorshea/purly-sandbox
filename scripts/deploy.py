import os
import subprocess

root = os.getcwd()
k8s = os.path.join(root, "k8s")

for filename in os.listdir(k8s):
    if filename != "docker-compose.yaml":
        fullname = os.path.join(k8s, filename)
        subprocess.call(["kubectl", "create", "-f", fullname])
