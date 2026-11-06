#!/bin/sh
# Installs the Accent Window Border extension for the current user.
set -e
UUID=accent-window-border@carlosbravoa.github.io
SRC="$(cd "$(dirname "$0")" && pwd)/$UUID"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

glib-compile-schemas "$SRC/schemas"
mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
cp -r "$SRC" "$DEST"
# The running shell doesn't know about a new extension until re-login on
# Wayland, so add it to enabled-extensions directly as well.
gnome-extensions enable "$UUID" 2>/dev/null || python3 - "$UUID" <<'EOF'
import ast, subprocess, sys
uuid = sys.argv[1]
cur = ast.literal_eval(subprocess.check_output(
    ["gsettings", "get", "org.gnome.shell", "enabled-extensions"], text=True).replace("@as ", ""))
if uuid not in cur:
    cur.append(uuid)
    subprocess.check_call(["gsettings", "set", "org.gnome.shell", "enabled-extensions", str(cur)])
EOF

echo "Installed to $DEST"
echo "On Wayland, log out and back in once so GNOME Shell picks it up,"
echo "then (if needed): gnome-extensions enable $UUID"
