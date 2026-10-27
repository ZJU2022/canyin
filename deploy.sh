#!/bin/bash
# 在 CentOS 云主机上，进入拉下来的代码目录后执行：
#   sudo bash deploy.sh
# 第一次：
#   git clone <你的仓库地址>
#   cd canyin
#   sudo bash deploy.sh
# 以后更新：
#   git pull
#   sudo bash deploy.sh
# 完成后用浏览器打开 http://这台机器的公网IP:8081
# 云主机安全组里要放行 TCP 8081。

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "请用 root 执行：sudo bash deploy.sh"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR=/opt/canyin
GO_VERSION=1.24.0
PORT=8081

arch="$(uname -m)"
case "$arch" in
  x86_64) goarch=amd64 ;;
  aarch64) goarch=arm64 ;;
  *)
    echo "这台机器的架构是 ${arch}，脚本只准备了 x86_64 和 aarch64。"
    exit 1
    ;;
esac

# CentOS 精简镜像常常没有 curl。编译前要先能下载 Go。
if ! command -v curl >/dev/null 2>&1; then
  if command -v dnf >/dev/null 2>&1; then
    dnf install -y curl
  elif command -v yum >/dev/null 2>&1; then
    yum install -y curl
  else
    echo "没有 curl，也没有 yum 或 dnf，没法下载 Go。"
    exit 1
  fi
fi

go_is_new() {
  command -v go >/dev/null 2>&1 || return 1
  version="$(go version | awk '{print $3}' | sed 's/^go//')"
  major="$(echo "$version" | cut -d. -f1)"
  minor="$(echo "$version" | cut -d. -f2)"
  [ "$major" -gt 1 ] && return 0
  [ "$major" -eq 1 ] && [ "$minor" -ge 24 ]
}

install_go() {
  echo "正在安装 Go ${GO_VERSION}……"
  tmp="$(mktemp)"
  urls="https://mirrors.aliyun.com/golang/go${GO_VERSION}.linux-${goarch}.tar.gz https://mirrors.cloud.tencent.com/go/go${GO_VERSION}.linux-${goarch}.tar.gz https://go.dev/dl/go${GO_VERSION}.linux-${goarch}.tar.gz"
  ok=0
  for url in $urls; do
    if curl -fL --retry 2 --connect-timeout 15 -o "$tmp" "$url"; then
      ok=1
      break
    fi
  done
  if [ "$ok" -ne 1 ]; then
    echo "下载 Go 失败。请检查这台机器能不能访问外网。"
    exit 1
  fi
  rm -rf /usr/local/go
  tar -C /usr/local -xzf "$tmp"
  ln -sfn /usr/local/go/bin/go /usr/local/bin/go
  rm -f "$tmp"
}

if ! go_is_new; then
  install_go
fi

export PATH="/usr/local/go/bin:/usr/local/bin:${PATH}"
export GOPROXY="${GOPROXY:-https://goproxy.cn,https://proxy.golang.org,direct}"
export CGO_ENABLED=0
export GOOS=linux
export GOARCH="$goarch"

mkdir -p "$INSTALL_DIR/web"
echo "正在编译……"
(
  cd "$ROOT"
  go build -o "$INSTALL_DIR/canyin" ./cmd/server
)
cp -a "$ROOT/web/." "$INSTALL_DIR/web/"

# CentOS 开着 SELinux 时，/opt 里新放的程序可能被拒绝执行。标成可执行类型。
if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" = "Enforcing" ]; then
  chcon -t bin_t "$INSTALL_DIR/canyin" || true
fi

cat > /etc/systemd/system/canyin.service <<EOF
[Unit]
Description=一家店的餐饮模型
After=network.target

[Service]
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/canyin -addr :${PORT} -web ${INSTALL_DIR}/web
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable canyin
systemctl restart canyin

if systemctl is-active firewalld >/dev/null 2>&1; then
  firewall-cmd --permanent --add-port=${PORT}/tcp
  firewall-cmd --reload
fi

ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo
echo "部署完成。"
echo "本机打开： http://127.0.0.1:${PORT}"
if [ -n "${ip}" ]; then
  echo "局域网打开： http://${ip}:${PORT}"
fi
echo "如果是云主机，安全组里也要放行 TCP ${PORT}，再用公网 IP 打开。"
echo "查看状态： systemctl status canyin"
