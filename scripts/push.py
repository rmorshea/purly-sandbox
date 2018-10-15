import os
import sys
import subprocess

root = os.getcwd()
name, version = sys.argv[1].split(":")
path = os.path.join(root, "src", name)
tag = f"gcr.io/purly-sandbox/{name}:{version}"

subprocess.call(["docker", "build", "-t", tag, path])
subprocess.call(["docker", "push", tag])
