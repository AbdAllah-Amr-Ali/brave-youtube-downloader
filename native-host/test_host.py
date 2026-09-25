"""
Test script to verify the Native Messaging Host protocol over stdio.
"""

import subprocess
import struct
import json
import os
import sys

def test_ping():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    host_py = os.path.join(script_dir, "host.py")

    proc = subprocess.Popen(
        [sys.executable, "-u", host_py],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # Prepare "ping" message
    payload = {"action": "ping"}
    data = json.dumps(payload).encode("utf-8")
    length_prefix = struct.pack("@I", len(data))

    # Send length + data
    proc.stdin.write(length_prefix + data)
    proc.stdin.flush()

    # Read response length
    resp_len_bytes = proc.stdout.read(4)
    if not resp_len_bytes:
        stderr_out = proc.stderr.read().decode("utf-8", errors="replace")
        print("FAIL: No response received. Stderr:", stderr_out)
        proc.kill()
        return False

    resp_len = struct.unpack("@I", resp_len_bytes)[0]
    resp_data = proc.stdout.read(resp_len).decode("utf-8")
    resp = json.loads(resp_data)
    print("SUCCESS: Received response from host:")
    print(json.dumps(resp, indent=2))

    proc.stdin.close()
    proc.kill()
    return True

if __name__ == "__main__":
    if test_ping():
        print("\nAll host checks passed!")
    else:
        sys.exit(1)
