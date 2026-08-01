#!/usr/bin/env bash
# ===============================================================
# install-security-tools.sh
# Install security tools for MyZubsterGateway security bot
#
# Installs: nmap, nikto, sqlmap, gobuster, dirb/common.txt wordlist,
#           python3-requests
#
# Usage: sudo bash scripts/install-security-tools.sh
# ===============================================================

set -euo pipefail

# ----- Colors -----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ----- Helpers -----
info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }
header(){ echo -e "${CYAN}━━━ $* ━━━${NC}"; }

# ----- Pre-flight -----
if [[ $EUID -ne 0 ]]; then
  error "This script must be run with sudo (or as root)."
  echo "  Usage: sudo bash $0"
  exit 1
fi

header "Starting MyZubsterGateway Security Tools Installation"
info "Detecting package manager..."

# Detect package manager
if command -v apt-get &>/dev/null; then
  PKG_MANAGER="apt-get"
  INSTALL_CMD="apt-get install -y"
  UPDATE_CMD="apt-get update -qq"
elif command -v yum &>/dev/null; then
  PKG_MANAGER="yum"
  INSTALL_CMD="yum install -y"
  UPDATE_CMD="yum check-update -q || true"
elif command -v dnf &>/dev/null; then
  PKG_MANAGER="dnf"
  INSTALL_CMD="dnf install -y"
  UPDATE_CMD="dnf check-update -q || true"
elif command -v pacman &>/dev/null; then
  PKG_MANAGER="pacman"
  INSTALL_CMD="pacman -S --noconfirm"
  UPDATE_CMD="pacman -Sy"
else
  error "Unsupported package manager. Supported: apt, yum, dnf, pacman"
  exit 1
fi

ok "Detected package manager: $PKG_MANAGER"

# ----- Update package lists -----
header "Updating package lists"
$UPDATE_CMD
ok "Package lists updated"

# ----- Function: install if missing -----
install_if_missing() {
  local name="$1"
  local pkg="${2:-$1}"
  local check_cmd="${3:-command -v $name}"

  if eval "$check_cmd" &>/dev/null; then
    ok "$name is already installed — skipping"
  else
    info "Installing $name..."
    $INSTALL_CMD "$pkg"
    if eval "$check_cmd" &>/dev/null; then
      ok "$name installed successfully"
    else
      warn "$name may not be fully installed (check above)"
    fi
  fi
}

# ----- 1. nmap -----
header "Installing nmap (network scanner)"
install_if_missing "nmap" "nmap"

# ----- 2. nikto -----
header "Installing nikto (web server scanner)"
# nikto is a perl script; check by looking for the binary
install_if_missing "nikto" "nikto"

# ----- 3. sqlmap -----
header "Installing sqlmap (SQL injection tool)"
install_if_missing "sqlmap" "sqlmap"

# ----- 4. gobuster -----
header "Installing gobuster (directory/file brute-forcer)"
if command -v gobuster &>/dev/null; then
  ok "gobuster is already installed — skipping"
else
  # Try package manager first, then go install
  if $INSTALL_CMD "gobuster" 2>/dev/null; then
    ok "gobuster installed via $PKG_MANAGER"
  elif command -v go &>/dev/null; then
    info "Installing gobuster via 'go install'..."
    go install github.com/OJ/gobuster/v3@latest
    # Ensure Go bin directory is in PATH
    if [[ -f "$HOME/go/bin/gobuster" ]]; then
      cp "$HOME/go/bin/gobuster" /usr/local/bin/gobuster
      ok "gobuster installed via go install"
    else
      warn "gobuster go install may have failed; check GOPATH"
    fi
  else
    warn "Could not install gobuster — try manual install from https://github.com/OJ/gobuster"
  fi
fi

# ----- 5. Wordlist: dirb/common.txt -----
header "Downloading dirb/common.txt wordlist"
WORDLIST_DIR="/usr/share/wordlists"
WORDLIST_PATH="${WORDLIST_DIR}/dirb/common.txt"

if [[ -f "$WORDLIST_PATH" ]]; then
  ok "Wordlist already exists at $WORDLIST_PATH — skipping"
else
  mkdir -p "${WORDLIST_DIR}/dirb"
  info "Downloading common.txt from Kali's wordlist repository..."
  # Try multiple sources
  if curl -fsSL "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/common.txt" \
       -o "$WORDLIST_PATH" 2>/dev/null; then
    ok "Wordlist downloaded from SecLists (common.txt)"
  elif curl -fsSL "https://raw.githubusercontent.com/daviddias/node-dirb/master/wordlists/common.txt" \
       -o "$WORDLIST_PATH" 2>/dev/null; then
    ok "Wordlist downloaded from node-dirb mirror"
  elif apt-get install -y dirb 2>/dev/null && [[ -f "/usr/share/dirb/wordlists/common.txt" ]]; then
    cp /usr/share/dirb/wordlists/common.txt "$WORDLIST_PATH"
    ok "Wordlist extracted from dirb package"
  else
    # Create a minimal common.txt as fallback
    warn "Could not download wordlist — creating minimal fallback"
    cat > "$WORDLIST_PATH" << 'EOF'
admin
login
index
images
css
js
assets
uploads
backup
config
api
robots.txt
sitemap.xml
README.md
LICENSE
.git
.svn
.env
wp-admin
wp-content
includes
modules
templates
cache
tmp
logs
data
private
test
docs
src
lib
vendor
node_modules
dist
build
EOF
    warn "Created minimal fallback wordlist — consider replacing with full SecLists version"
  fi
  chmod 644 "$WORDLIST_PATH"
fi

# Print wordlist size
if [[ -f "$WORDLIST_PATH" ]]; then
  WC=$(wc -l < "$WORDLIST_PATH")
  ok "Wordlist at $WORDLIST_PATH ($WC lines)"
fi

# ----- 6. python3-requests -----
header "Installing python3-requests (for DeepSeek in security bot)"
if python3 -c "import requests" &>/dev/null 2>&1; then
  ok "python3-requests is already installed — skipping"
else
  if command -v pip3 &>/dev/null; then
    info "Installing via pip3..."
    pip3 install requests
    ok "python3-requests installed via pip3"
  elif command -v pip &>/dev/null; then
    info "Installing via pip..."
    pip install requests
    ok "python3-requests installed via pip"
  else
    info "Installing via system package manager..."
    install_if_missing "python3-requests" "python3-requests" "python3 -c 'import requests'"
  fi
fi

# Verify python3-requests
if python3 -c "import requests; print(requests.__version__)" &>/dev/null 2>&1; then
  VER=$(python3 -c "import requests; print(requests.__version__)")
  ok "python3-requests v$VER is ready"
else
  warn "python3-requests may not be fully installed"
fi

# ----- Summary -----
header "Installation Summary"
echo ""
echo -e "  ${CYAN}Tool${NC}                    ${GREEN}Status${NC}"
echo -e "  ${CYAN}────${NC}                    ${GREEN}──────${NC}"

check_status() {
  local name="$1"
  local check="${2:-command -v $name}"
  if eval "$check" &>/dev/null 2>&1; then
    echo -e "  ${name,-30}  ${GREEN}✓ Installed${NC}"
  else
    echo -e "  ${name,-30}  ${RED}✗ Not found${NC}"
  fi
}

check_status "nmap"
check_status "nikto"
check_status "sqlmap"
check_status "gobuster"
check_status "wordlist (dirb/common.txt)" "[[ -f '$WORDLIST_PATH' ]]"
check_status "python3-requests" "python3 -c 'import requests'"

echo ""
ok "Installation complete!"
info "You can now run the security bot at: python3 security/security_bot.py"