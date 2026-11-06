# Accent Window Border

A GNOME Shell extension that draws a thin border around the **focused window** in
your **system accent color**, so the active window stands out, especially in dark mode.

- Follows *Settings › Appearance › Accent color* and updates instantly when you change it
  (on Ubuntu the colors match the Yaru palette).
- Works for every window: GTK/libadwaita, Firefox, Chrome, Qt, Xwayland, with
  client-side or server-side decorations.
- Drawn just outside the window frame, so it never covers content.
- Moves with the window: drags, workspace switches, minimize/restore animations.
- Hidden for fullscreen windows, in the Activities overview and (optionally) on
  maximized windows.
- Optional custom color with a **live preview** picker: the border changes as you click.

Tested on Ubuntu with GNOME Shell 50 (Wayland). `metadata.json` declares support for
GNOME Shell 46–50.

## Install

```sh
git clone https://github.com/carlosbravoa/gnome-accent-window-border.git
cd gnome-accent-window-border
./install.sh
```

The script compiles the settings schema, copies the extension to
`~/.local/share/gnome-shell/extensions/accent-window-border@cbravo` and enables it.

On **Wayland**, log out and back in once so GNOME Shell discovers the new extension.
(On X11 you can press <kbd>Alt</kbd>+<kbd>F2</kbd>, type `r` and press Enter instead.)

To update, `git pull` and run `./install.sh` again. Changes to `extension.js` need
another logout on Wayland; changes to the preferences window don't.

## Settings

Open the preferences from the **Extensions** app (gear icon) or with:

```sh
gnome-extensions prefs accent-window-border@cbravo
```

| Setting | Default | Description |
|---|---|---|
| Use system accent color | on | Follow the accent color from Appearance settings |
| Custom color | `#ffffff` | Used when the accent switch is off. The picker previews live; **Cancel**/<kbd>Esc</kbd> restores the previous color, **Select** (or double-click) keeps it |
| Thickness | 2 px | 1–10 px |
| Corner radius | 12 px | 0–32 px. 12 matches libadwaita windows |
| Show on maximized windows | off | Draw the border on maximized windows too |

The same keys are available from the command line:

```sh
D=~/.local/share/gnome-shell/extensions/accent-window-border@cbravo/schemas
S=org.gnome.shell.extensions.accent-window-border
gsettings --schemadir $D set $S border-width 3
gsettings --schemadir $D set $S use-accent-color false
gsettings --schemadir $D set $S custom-color '#00ffaa'
```

## How it works

The border is an `St.Bin` added as a child of the focused window's `Meta.WindowActor`,
so the compositor moves, animates and stacks it together with the window. It's sized
from the window's frame rectangle (not the buffer, which includes CSD shadows).

Its color comes from the shell's `-st-accent-color` CSS variable, which St keeps in sync
with the `org.gnome.desktop.interface accent-color` setting. On Ubuntu this maps to the
Yaru accent colors.

The live-preview picker uses `Gtk.ColorChooserWidget`. It's deprecated since GTK 4.10
but still part of GTK 4, and unlike `Gtk.ColorDialog` it reports every change before the
user confirms.

## Troubleshooting

- **No border after installing:** log out and back in (Wayland), then check
  `gnome-extensions info accent-window-border@cbravo` shows `State: ACTIVE`.
- **"Extension doesn't have preferences":** the running shell scanned the extension before
  `prefs.js` existed. Log out and back in.
- **Errors:** `journalctl -b /usr/bin/gnome-shell | grep -i accent`
- **New GNOME version:** add it to `shell-version` in `metadata.json` and reinstall.

## Uninstall

```sh
gnome-extensions disable accent-window-border@cbravo
rm -rf ~/.local/share/gnome-shell/extensions/accent-window-border@cbravo
```

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
