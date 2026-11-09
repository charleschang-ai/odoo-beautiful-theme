import { useState } from "@odoo/owl";
import { patch } from "@web/core/utils/patch";
import { NavBar } from "@web/webclient/navbar/navbar";
import { _t } from "@web/core/l10n/translation";
import { sidebarState, toggleSidebar } from "./app_sidebar/sidebar_state";

// 顶栏左端的侧栏折叠按钮（模板注入见 webclient_patches.xml）
patch(NavBar.prototype, {
    setup() {
        super.setup(...arguments);
        this.btSidebar = useState(sidebarState);
        // 模板 t-att-title 中的字面量不会被翻译，标签在 JS 中用 _t
        this.btSidebarLabels = { expand: _t("Expand menu"), collapse: _t("Collapse menu") };
    },

    btToggleSidebar() {
        toggleSidebar();
    },
});
