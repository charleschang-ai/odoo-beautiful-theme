import { useState } from "@odoo/owl";
import { patch } from "@web/core/utils/patch";
import { NavBar } from "@web/webclient/navbar/navbar";
import { sidebarState, toggleSidebar } from "./app_sidebar/sidebar_state";

// 顶栏左端的侧栏折叠按钮（模板注入见 webclient_patches.xml）
patch(NavBar.prototype, {
    setup() {
        super.setup(...arguments);
        this.btSidebar = useState(sidebarState);
    },

    btToggleSidebar() {
        toggleSidebar();
    },
});
