import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AccentWindowBorderPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings; // keep alive with the window

        const page = new Adw.PreferencesPage();
        window.add(page);

        // --- Color ---
        const colorGroup = new Adw.PreferencesGroup({title: 'Color'});
        page.add(colorGroup);

        const accentRow = new Adw.SwitchRow({
            title: 'Use system accent color',
            subtitle: 'Follows Settings › Appearance',
        });
        settings.bind('use-accent-color', accentRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        colorGroup.add(accentRow);

        // Small swatch on the button showing the current custom color.
        const css = new Gtk.CssProvider();
        const display = Gdk.Display.get_default();
        Gtk.StyleContext.add_provider_for_display(display, css,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        const updateSwatch = () => css.load_from_string(
            '.awb-swatch { min-width: 24px; min-height: 24px; border-radius: 6px;' +
            ` background: ${settings.get_string('custom-color')};` +
            ' box-shadow: inset 0 0 0 1px alpha(currentColor, 0.2); }');
        updateSwatch();

        const colorButton = new Gtk.Button({
            child: new Gtk.Box({css_classes: ['awb-swatch']}),
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Choose color',
        });
        colorButton.connect('clicked', () => openLivePicker(window, settings));

        const colorRow = new Adw.ActionRow({
            title: 'Custom color',
            subtitle: 'The border updates live while you pick',
        });
        colorRow.add_suffix(colorButton);
        colorRow.activatable_widget = colorButton;
        colorGroup.add(colorRow);

        const changedId = settings.connect('changed::custom-color', updateSwatch);
        window.connect('close-request', () => {
            settings.disconnect(changedId);
            Gtk.StyleContext.remove_provider_for_display(display, css);
            return false;
        });

        // --- Shape ---
        const shapeGroup = new Adw.PreferencesGroup({title: 'Shape'});
        page.add(shapeGroup);

        const widthRow = Adw.SpinRow.new_with_range(1, 10, 1);
        widthRow.title = 'Thickness';
        widthRow.subtitle = 'Pixels';
        settings.bind('border-width', widthRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        shapeGroup.add(widthRow);

        const radiusRow = Adw.SpinRow.new_with_range(0, 32, 1);
        radiusRow.title = 'Corner radius';
        radiusRow.subtitle = 'Pixels — 12 matches GNOME apps';
        settings.bind('border-radius', radiusRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        shapeGroup.add(radiusRow);

        const maxRow = new Adw.SwitchRow({title: 'Show on maximized windows'});
        settings.bind('show-when-maximized', maxRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        shapeGroup.add(maxRow);
    }
}

/*
 * Modal color picker that writes every change to GSettings immediately, so
 * the border (drawn around this focused dialog) previews the color live.
 * Cancel/close restores the previous state; Select keeps it.
 *
 * Gtk.ColorDialog can't do this: it only reports a color on confirm.
 * Gtk.ColorChooserWidget is deprecated since GTK 4.10 but still available
 * in GTK 4, and it notifies on every swatch click / editor change.
 */
function openLivePicker(parent, settings) {
    const prevColor = settings.get_string('custom-color');
    const prevAccent = settings.get_boolean('use-accent-color');

    const chooser = new Gtk.ColorChooserWidget({
        use_alpha: true,
        margin_top: 12, margin_bottom: 12, margin_start: 12, margin_end: 12,
    });
    const rgba = new Gdk.RGBA();
    if (rgba.parse(prevColor))
        chooser.rgba = rgba;

    chooser.connect('notify::rgba', () => {
        settings.set_string('custom-color', chooser.rgba.to_string());
        settings.set_boolean('use-accent-color', false);
    });

    const header = new Adw.HeaderBar({
        show_start_title_buttons: false,
        show_end_title_buttons: false,
    });
    const cancel = new Gtk.Button({label: 'Cancel'});
    const select = new Gtk.Button({label: 'Select', css_classes: ['suggested-action']});
    header.pack_start(cancel);
    header.pack_end(select);

    const content = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
    content.append(header);
    content.append(chooser);

    const dialog = new Adw.Window({
        title: 'Border Color',
        modal: true,
        transient_for: parent,
        resizable: false,
        content,
    });

    let accepted = false;
    select.connect('clicked', () => {
        accepted = true;
        dialog.close();
    });
    cancel.connect('clicked', () => dialog.close());
    // Double-click on a swatch = select, like the stock dialog.
    chooser.connect('color-activated', () => select.emit('clicked'));

    dialog.connect('close-request', () => {
        if (!accepted) {
            settings.set_string('custom-color', prevColor);
            settings.set_boolean('use-accent-color', prevAccent);
        }
        return false;
    });

    const esc = new Gtk.ShortcutController();
    esc.add_shortcut(new Gtk.Shortcut({
        trigger: Gtk.ShortcutTrigger.parse_string('Escape'),
        action: Gtk.CallbackAction.new(() => {
            dialog.close();
            return true;
        }),
    }));
    dialog.add_controller(esc);

    dialog.present();
}
