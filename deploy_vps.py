import os
import subprocess
import sys
import time
import re

remote_host = "root@157.245.111.133"

bash_script = f"""
set -e

echo "=== 1. Cloning/pulling ContentProV2 repo ==="
if [ -d "/opt/ContentProV2" ]; then
    echo "Directory /opt/ContentProV2 exists. Pulling latest..."
    cd /opt/ContentProV2
    git fetch origin
    git checkout rohan/dev
    git pull origin rohan/dev
else
    echo "Directory /opt/ContentProV2 does not exist. Cloning..."
    cd /opt
    git clone https://github.com/RohanConversely/ContentProV2.git
    cd ContentProV2
    git checkout rohan/dev
fi

echo "=== 2. Setting up Python environment ==="
cd /opt/ContentProV2/batch-service
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "=== 3. Creating .env file ==="
cat << 'EOF' > /opt/ContentProV2/batch-service/.env
OPENAI_API_KEY={os.getenv("OPENAI_API_KEY", "")}
SUPABASE_URL=https://zscdsnqiktvavouovbuh.supabase.co
SUPABASE_SERVICE_KEY={os.getenv("SUPABASE_SERVICE_KEY", "")}
FRONTEND_URL=https://content-pro-v2.vercel.app
OPENAI_BATCH_IMAGE_MODEL=gpt-image-1.5
OPENAI_BATCH_IMAGE_QUALITY=low
OPENAI_BATCH_USE_IMAGE_KYC=true
EOF

echo "=== 4. Creating and registering systemd service contentpro-batch ==="
cat << 'EOF' > /etc/systemd/system/contentpro-batch.service
[Unit]
Description=ContentPro Batch Service
After=network.target

[Service]
User=root
WorkingDirectory=/opt/ContentProV2/batch-service
EnvironmentFile=/opt/ContentProV2/batch-service/.env
ExecStart=/opt/ContentProV2/batch-service/.venv/bin/uvicorn app:app --host 127.0.0.1 --port 4001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable contentpro-batch
systemctl restart contentpro-batch

echo "=== 5. Verifying local health check ==="
sleep 3
curl -i http://127.0.0.1:4001/health

echo "=== 6. Installing cloudflared if not present ==="
if ! command -v cloudflared &> /dev/null; then
    echo "cloudflared not found. Installing..."
    curl -L --output /tmp/cloudflared-linux-amd64.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i /tmp/cloudflared-linux-amd64.deb
    rm /tmp/cloudflared-linux-amd64.deb
else
    echo "cloudflared is already installed."
fi

CLOUDFLARED_PATH=$(which cloudflared)
echo "cloudflared path: $CLOUDFLARED_PATH"

echo "=== 7. Creating systemd service contentpro-tunnel ==="
cat << EOF > /etc/systemd/system/contentpro-tunnel.service
[Unit]
Description=Cloudflare Tunnel for ContentPro Batch Service
After=network.target

[Service]
User=root
ExecStart=$CLOUDFLARED_PATH tunnel --url http://127.0.0.1:4001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable contentpro-tunnel
systemctl restart contentpro-tunnel
echo "contentpro-tunnel service started."
"""

def main():
    print(f"Deploying batch service to remote host: {remote_host}")
    try:
        process = subprocess.run(
            ["ssh", remote_host, "bash", "-s"],
            input=bash_script,
            text=True,
            capture_output=True,
            check=True
        )
        print("=== DEPLOYMENT OUTPUT ===")
        print(process.stdout)
    except subprocess.CalledProcessError as e:
        print("=== DEPLOYMENT FAILED ===", file=sys.stderr)
        print(e.stderr, file=sys.stderr)
        sys.exit(e.returncode)

    # Search for Cloudflare Tunnel URL from logs
    print("=== Extracting Cloudflare Tunnel URL ===")
    tunnel_url = None
    for attempt in range(1, 11):
        print(f"Polling tunnel logs (attempt {attempt}/10)...")
        logs_process = subprocess.run(
            ["ssh", remote_host, "journalctl -u contentpro-tunnel -n 100 --no-pager"],
            text=True,
            capture_output=True,
            check=True
        )
        logs = logs_process.stdout
        matches = re.findall(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", logs)
        if matches:
            tunnel_url = matches[-1]
            print(f"Found Cloudflare Tunnel URL: {tunnel_url}")
            break
        time.sleep(3)

    if not tunnel_url:
        print("Could not find Cloudflare Tunnel URL in logs. Please run manually: journalctl -u contentpro-tunnel", file=sys.stderr)
        sys.exit(1)

    print("\n=== DEPLOYMENT SUCCESSFUL ===")
    print(f"Health Check: http://127.0.0.1:4001/health is OK")
    print(f"Tunnel URL: {tunnel_url}")

if __name__ == "__main__":
    main()
