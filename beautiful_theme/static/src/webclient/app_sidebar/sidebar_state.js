import { reactive } from "@odoo/owl";
import { browser } from "@web/core/browser/browser";

const COLLAPSED_KEY = "bt_sidebar_collapsed";

/**
 * 侧栏折叠状态：顶栏按钮（NavBar patch）与 AppSidebar 共享。
 * 组件内用 useState(sidebarState) 订阅即可联动。
 */
export const sidebarState = reactive({
    collapsed: browser.localStorage.getItem(COLLAPSED_KEY) === "1",
});

export function toggleSidebar() {
    sidebarState.collapsed = !sidebarState.collapsed;
    browser.localStorage.setItem(COLLAPSED_KEY, sidebarState.collapsed ? "1" : "0");
}
