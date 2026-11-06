import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const ALLOWED_TYPES = [
    Meta.WindowType.NORMAL,
    Meta.WindowType.DIALOG,
    Meta.WindowType.MODAL_DIALOG,
];

function isMaximized(win) {
    // GNOME 49+ replaced get_maximized() with is_maximized()
    if (typeof win.is_maximized === 'function')
        return win.is_maximized();
    return win.get_maximized() === Meta.MaximizeFlags.BOTH;
}

export default class AccentWindowBorder extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._border = null;
        this._window = null;
        this._actor = null;
        this._winSignals = [];
        this._actorDestroyId = 0;
        this._idleId = 0;

        this._focusId = global.display.connect('notify::focus-window',
            () => this._track(global.display.focus_window));
        this._settingsId = this._settings.connect('changed', () => this._update());
        this._overviewIds = [
            Main.overview.connect('showing', () => this._update()),
            Main.overview.connect('hidden', () => this._update()),
        ];

        this._track(global.display.focus_window);
    }

    disable() {
        this._untrack();
        global.display.disconnect(this._focusId);
        this._overviewIds.forEach(id => Main.overview.disconnect(id));
        this._settings.disconnect(this._settingsId);
        this._settings = null;
    }

    _track(win) {
        this._untrack();
        if (!win || !ALLOWED_TYPES.includes(win.get_window_type()))
            return;

        this._window = win;
        const actor = win.get_compositor_private();
        if (actor) {
            this._attach(actor);
        } else {
            // A freshly mapped window may not have its actor yet.
            this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                this._idleId = 0;
                const a = this._window?.get_compositor_private();
                if (a)
                    this._attach(a);
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _attach(actor) {
        this._actor = actor;
        // Child of the window actor: follows moves, workspace switches,
        // minimize/map animations and stacking for free.
        this._border = new St.Bin({
            style_class: 'accent-window-border',
            reactive: false,
        });
        actor.add_child(this._border);

        const w = this._window;
        this._winSignals = [
            w.connect('position-changed', () => this._update()),
            w.connect('size-changed', () => this._update()),
            w.connect('notify::fullscreen', () => this._update()),
            w.connect('notify::maximized-horizontally', () => this._update()),
            w.connect('notify::maximized-vertically', () => this._update()),
        ];
        this._actorDestroyId = actor.connect('destroy', () => {
            this._actorDestroyId = 0;
            this._actor = null;
            this._border = null;
            this._untrack();
        });

        this._update();
    }

    _untrack() {
        if (this._idleId) {
            GLib.source_remove(this._idleId);
            this._idleId = 0;
        }
        if (this._window) {
            this._winSignals.forEach(id => this._window.disconnect(id));
            this._winSignals = [];
        }
        if (this._actor && this._actorDestroyId)
            this._actor.disconnect(this._actorDestroyId);
        this._actorDestroyId = 0;
        this._border?.destroy();
        this._border = null;
        this._actor = null;
        this._window = null;
    }

    _update() {
        if (!this._border || !this._window)
            return;

        const win = this._window;
        const hide = Main.overview.visible ||
            win.is_fullscreen() ||
            (isMaximized(win) && !this._settings.get_boolean('show-when-maximized'));
        this._border.visible = !hide;
        if (hide)
            return;

        const bw = this._settings.get_int('border-width');
        const radius = isMaximized(win) ? 0 : this._settings.get_int('border-radius');
        const frame = win.get_frame_rect();
        const buffer = win.get_buffer_rect();

        // Draw just outside the visible frame so no content is covered.
        this._border.set_position(frame.x - buffer.x - bw, frame.y - buffer.y - bw);
        this._border.set_size(frame.width + 2 * bw, frame.height + 2 * bw);
        let style = `border-width: ${bw}px; border-radius: ${radius ? radius + bw : 0}px;`;
        if (!this._settings.get_boolean('use-accent-color'))
            style += ` border-color: ${this._settings.get_string('custom-color')};`;
        this._border.style = style;
    }
}
