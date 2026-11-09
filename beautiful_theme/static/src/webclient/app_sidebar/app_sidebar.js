import { Component, useState } from "@odoo/owl";
import { useService, useBus } from "@web/core/utils/hooks";
import { user } from "@web/core/user";
import { _t } from "@web/core/l10n/translation";
import { sidebarState } from "./sidebar_state";

/**
 * 左侧应用/菜单侧边栏。
 *
 * 数据全部来自 menu 服务（与顶部菜单同源）：
 *   - getApps()                        一级应用（含 webIconData 图标）
 *   - getMenuAsTree(appId).childrenTree 当前应用的二级/三级菜单树
 *   - selectMenu(menu)                 跳转
 *
 * 折叠状态存 localStorage，收起后变成 56px 图标窄条。
 * 小屏（<md）由 CSS 隐藏，继续使用官方内置的手机滑出菜单。
 */
export class AppSidebar extends Component {
    static template = "beautiful_theme.AppSidebar";
    static props = {};

    setup() {
        this.menuService = useService("menu");
        // 模板里 t-att-title 的字符串字面量不会被翻译，故在 JS 中用 _t
        this.labels = { collapse: _t("Collapse"), expand: _t("Expand") };
        // 折叠状态与顶栏按钮共享（见 sidebar_state.js / navbar_patch.js）
        this.sb = useState(sidebarState);
        this.state = useState({
            // 手风琴开合状态：menuId -> bool；undefined 时按 depth 取默认值
            openSections: {},
            // 一级应用菜单树开合：appId -> bool；undefined 时当前应用默认展开
            openApps: {},
        });
        // 应用切换（点击顶栏/侧栏/手机抽屉）后重渲染菜单树
        useBus(this.env.bus, "MENUS:APP-CHANGED", () => this.render());
    }

    get apps() {
        return this.menuService.getApps();
    }

    get companyName() {
        return (user.activeCompany && user.activeCompany.name) || "";
    }

    get currentApp() {
        return this.menuService.getCurrentApp();
    }

    /** 任意应用的二级菜单树（任意 App 均可展开浏览，无需先切换） */
    appSections(app) {
        return (app && this.menuService.getMenuAsTree(app.id).childrenTree) || [];
    }

    isCurrentApp(app) {
        return this.currentApp && this.currentApp.id === app.id;
    }

    /** 应用菜单树是否展开：显式操作优先，否则当前应用默认展开 */
    isAppOpen(app) {
        const explicit = this.state.openApps[app.id];
        return explicit === undefined ? this.isCurrentApp(app) : explicit;
    }

    toggleApp(app) {
        this.state.openApps[app.id] = !this.isAppOpen(app);
    }

    /** 二级分组默认展开，更深层默认收起 */
    isOpen(item, depth) {
        const explicit = this.state.openSections[item.id];
        return explicit === undefined ? depth === 0 : explicit;
    }

    toggleSection(item, depth) {
        this.state.openSections[item.id] = !this.isOpen(item, depth);
    }

    onAppClick(app) {
        // 点应用名 = 跳转并展开它的菜单树
        this.state.openApps[app.id] = true;
        this.menuService.selectMenu(app);
    }

    onMenuClick(menu) {
        this.menuService.selectMenu(menu);
    }
}
