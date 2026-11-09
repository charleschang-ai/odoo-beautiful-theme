import { Component, EventBus, onWillDestroy, useState, useSubEnv, xml } from "@odoo/owl";
import { useService, useBus } from "@web/core/utils/hooks";
import { browser } from "@web/core/browser/browser";
import { router } from "@web/core/browser/router";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { makeActionManager } from "@web/webclient/actions/action_service";
import { _t } from "@web/core/l10n/translation";

const STORAGE_KEY = "bt_multi_tabs";

// 标签粒度："menu" = 每个菜单一个标签；"app" = 每个应用一个标签。
// 应用根也是菜单（同一 id 空间），两种模式的 localStorage 数据互相兼容。
const TAB_GRANULARITY = "menu";

/**
 * 多标签容器（keep-alive 方案，替换官方 ActionContainer）。
 *
 * 核心架构：
 * - 每个标签 = 一个应用（app），持有自己的 makeActionManager 实例 + 独立 EventBus
 *   → 每个标签拥有独立的控制器栈/面包屑，互不污染（这是参考模块用
 *     setTimeout 偷换全局服务想达到而没达到的效果）
 * - 标签面板（TabPane）通过 useSubEnv 把 services.action 换成本标签的管理器，
 *   面板内所有组件（视图/按钮/面包屑）的动作都走本标签的栈
 * - 非激活面板仅用 CSS 隐藏，组件树保活：未保存的编辑、滚动位置都还在
 * - 菜单点击被 patch 直接路由到目标标签的管理器（单次执行）；
 *   其余全局动作（首次加载/命令面板/浏览器后退）由全局总线捕获后
 *   在对应标签内重放，全局渲染结果放入隐藏 ghost 挂载以保证 doAction 正常 resolve
 *
 * 已知边界（v1）：
 * - 关闭标签后其管理器在 rpcBus 上的监听不会移除（官方 makeActionManager 未提供
 *   销毁钩子），随开关次数轻微累积，刷新页面即清零
 * - keep-alive 状态仅存在于会话内；localStorage 只持久化标签列表（书签部分）
 */

/** 组合总线：监听走 标签bus + 全局bus，触发只进标签bus */
function makePaneBus(tabBus, globalBus) {
    return {
        addEventListener(type, fn) {
            tabBus.addEventListener(type, fn);
            globalBus.addEventListener(type, fn);
        },
        removeEventListener(type, fn) {
            tabBus.removeEventListener(type, fn);
            globalBus.removeEventListener(type, fn);
        },
        trigger(type, payload) {
            tabBus.trigger(type, payload);
        },
    };
}

export class TabPane extends Component {
    static props = { rt: Object, active: Boolean };
    static template = xml`
        <div class="o_action_manager o_bt_tab_pane" t-att-class="{ o_bt_pane_hidden: !props.active }">
            <t t-if="info.Component" t-component="info.Component" className="'o_action'" t-props="info.componentProps" t-key="info.id"/>
        </div>`;

    setup() {
        const rt = this.props.rt; // { bus, manager, info, paneRender }
        // 渲染信息存在 rt.info 上（监听器在 runtime 创建时就已挂好）：
        // doAction 可能在本面板出现之前就发出 UPDATE，面板挂载时直接渲染已有信息，
        // 否则 Blank 过渡组件永远挂不上 → doAction 死锁 → 白屏
        rt.paneRender = () => this.render();
        onWillDestroy(() => {
            rt.paneRender = null;
        });
        // 面板子树：action 服务换成本标签的管理器，bus 换成组合总线。
        // services 必须是 live Proxy 而非展开快照——懒加载模块（如 spreadsheet
        // dashboard）会在运行时往全局 env.services 注册新服务，快照会漏掉它们
        // 导致面板内 useService 报 "Service xxx is not available"
        const globalServices = this.env.services;
        const services = new Proxy(globalServices, {
            get(target, key) {
                return key === "action" ? rt.manager : target[key];
            },
            has(target, key) {
                return key === "action" || key in target;
            },
        });
        useSubEnv({
            bus: makePaneBus(rt.bus, this.env.bus),
            services,
        });
    }

    get info() {
        return this.props.rt.info;
    }
}

export class MultiTabContainer extends Component {
    static components = { TabPane, Dropdown, DropdownItem };
    static props = { fullscreen: { type: Boolean, optional: true } };
    static template = "beautiful_theme.MultiTabContainer";

    setup() {
        this.menuService = useService("menu");
        this.actionService = useService("action"); // 全局管理器（用于 loadState 拦截）
        this.state = useState({
            tabs: [],        // [{ id: appId, name, icon, lastActionId }]
            activeId: null,
            ghost: {},       // 全局管理器的渲染结果（隐藏挂载，保证其 doAction resolve）
        });
        // 运行时对象（管理器/总线）不进 reactive，避免代理干扰
        this.runtime = new Map(); // id -> { bus, manager, started }

        this._restore();

        // 全局动作捕获：首次加载 / 命令面板 / 浏览器后退等
        useBus(this.env.bus, "ACTION_MANAGER:UPDATE", ({ detail: info }) => {
            this.state.ghost = info || {};
            this._routeGlobal(info || {});
        });

        // 菜单点击直接路由到目标标签（单次执行，不经过全局管理器）
        const menuSvc = this.menuService;
        const origSelectMenu = menuSvc.selectMenu.bind(menuSvc);
        this._origSelectMenu = origSelectMenu;
        menuSvc.selectMenu = async (menu) => {
            menu = typeof menu === "number" ? menuSvc.getMenu(menu) : menu;
            if (!menu || !menu.actionID) {
                return;
            }
            const tab = this._ensureTab(menu);
            const rt = this._ensureRuntime(tab);
            this.state.activeId = tab.id;
            rt.started = true;
            tab.lastActionId = menu.actionID;
            this._persist();
            await rt.manager.doAction(menu.actionID, {
                clearBreadcrumbs: true,
                onActionReady: () => menuSvc.setCurrentMenu(menu),
            });
        };

        // URL 状态恢复（刷新 / 浏览器后退）：先解析 URL 属于哪个菜单/标签，
        // 激活它，再交给它的管理器执行 loadState（虚拟栈/多级面包屑原样恢复）。
        // 不能无脑给"当前激活标签"——激活标签和 URL 内容可能属于不同应用。
        // 返回 false 时 webclient 自然走 _loadDefaultApp → 上面 patch 过的 selectMenu
        const globalAction = this.actionService;
        this._origLoadState = globalAction.loadState.bind(globalAction);
        globalAction.loadState = async (...args) => {
            const state = args[0] || router.current;
            const firstAction = state.actionStack && state.actionStack[0] && state.actionStack[0].action;
            let menu = null;
            if (firstAction) {
                menu = this.menuService
                    .getAll()
                    .find((m) => m.actionID === firstAction || m.actionPath === firstAction) || null;
            }
            const tab = menu
                ? this._ensureTab(menu)
                : this.state.tabs.find((t) => t.id === this.state.activeId);
            if (!tab) {
                return false;
            }
            this.state.activeId = tab.id;
            if (menu) {
                this.menuService.setCurrentMenu(menu);
            }
            const rt = this._ensureRuntime(tab);
            const loaded = await rt.manager.loadState(...args);
            if (loaded) {
                rt.started = true;
                this._persist();
            }
            return loaded;
        };
    }

    // ------------------------------------------------------------------
    // 标签管理
    // ------------------------------------------------------------------

    /**
     * 由菜单（或应用根菜单）取得/创建标签。
     * menu 粒度：标签锚定被点击的菜单本身；app 粒度：锚定其所属应用根。
     * 图标始终用所属应用的图标。
     */
    _ensureTab(menuOrApp) {
        let anchor = menuOrApp;
        let app = menuOrApp;
        if (menuOrApp && menuOrApp.appID) {
            app = this.menuService.getMenu(menuOrApp.appID) || menuOrApp;
            if (TAB_GRANULARITY === "app") {
                anchor = app;
            }
        }
        const id = anchor ? anchor.id : 0;
        let tab = this.state.tabs.find((t) => t.id === id);
        if (!tab) {
            tab = {
                id,
                name: anchor ? anchor.name : _t("Workspace"),
                icon: (app && app.webIconData) || false,
                lastActionId: (anchor && anchor.actionID) || (app && app.actionID) || false,
            };
            this.state.tabs.push(tab);
            this._persist();
        }
        return tab;
    }

    _ensureRuntime(tab) {
        if (!this.runtime.has(tab.id)) {
            const bus = new EventBus();
            // 管理器专属 env：原型链继承真实 env（services/isSmall），bus 换成标签总线。
            // env 被 OWL 冻结（bus 只读），必须用属性描述符定义而非 Object.assign 赋值
            const managerEnv = Object.create(this.env, {
                bus: { value: bus, configurable: true },
            });
            const rt = {
                bus,
                manager: makeActionManager(managerEnv),
                started: false,
                info: {},        // 本标签最后一次渲染信息（面板可能晚于事件出现）
                paneRender: null,
            };
            // 监听器随 runtime 创建即挂载，先于任何 doAction，事件不丢
            bus.addEventListener("ACTION_MANAGER:UPDATE", ({ detail: info }) => {
                rt.info = info || {};
                if (rt.paneRender) {
                    rt.paneRender();
                }
            });
            this.runtime.set(tab.id, rt);
        }
        return this.runtime.get(tab.id);
    }

    /** 全局管理器渲染了一个真实动作 → 在对应标签内重放 */
    _routeGlobal(info) {
        const props = info.componentProps || {};
        if (!info.Component || !props.action) {
            return; // 空事件或 Blank 过渡：ghost 挂载即可，无需路由
        }
        // 优先用动作 id 精确匹配菜单（决定标签归属），退而求其次用当前应用根
        let menu = null;
        if (props.action.id) {
            menu = this.menuService.getAll().find((m) => m.actionID === props.action.id) || null;
        }
        if (!menu) {
            menu = this.menuService.getCurrentApp() || null;
        }
        const tab = this._ensureTab(menu);
        const rt = this._ensureRuntime(tab);
        this.state.activeId = tab.id;
        // 优先按 id 重放（干净上下文）；URL 虚拟动作可能没有 id（path 型），
        // 此时直接重放已加载的动作对象，否则刷新后标签内一片空白
        const request = props.action.id || props.action.xml_id || props.action;
        rt.started = true;
        if (props.action.id) {
            tab.lastActionId = props.action.id;
        }
        this._persist();
        rt.manager.doAction(request, { clearBreadcrumbs: true });
    }

    activateTab(id) {
        if (this.state.activeId === id) {
            return;
        }
        this.state.activeId = id;
        const tab = this.state.tabs.find((t) => t.id === id);
        const menu = this.menuService.getAll().find((m) => m.id === id);
        if (menu) {
            this.menuService.setCurrentMenu(menu); // 同步侧栏/顶栏高亮
        }
        const rt = this._ensureRuntime(tab);
        if (!rt.started && tab.lastActionId) {
            rt.started = true;
            rt.manager.doAction(tab.lastActionId, { clearBreadcrumbs: true });
        }
        this._persist();
    }

    // ------------------------------------------------------------------
    // 标签拖拽换位（HTML5 drag & drop）
    // ------------------------------------------------------------------

    onTabDragStart(ev, index) {
        this._dragIndex = index;
        ev.dataTransfer.effectAllowed = "move";
    }

    onTabDrop(ev, index) {
        const from = this._dragIndex;
        this._dragIndex = null;
        if (from === null || from === undefined || from === index) {
            return;
        }
        const [moved] = this.state.tabs.splice(from, 1);
        this.state.tabs.splice(index, 0, moved);
        this._persist();
    }

    closeTab(id) {
        const index = this.state.tabs.findIndex((t) => t.id === id);
        if (index < 0) {
            return;
        }
        this.state.tabs.splice(index, 1);
        this.runtime.delete(id); // 管理器交给 GC（见文件头已知边界）
        if (this.state.activeId === id) {
            const next = this.state.tabs[index] || this.state.tabs[index - 1];
            if (next) {
                this.activateTab(next.id);
            } else {
                this.state.activeId = null;
            }
        }
        this._persist();
    }

    // ------------------------------------------------------------------
    // 持久化（仅标签列表；keep-alive 状态不跨刷新）
    // ------------------------------------------------------------------

    _persist() {
        const data = {
            tabs: this.state.tabs.map((t) => ({ id: t.id, lastActionId: t.lastActionId })),
            activeId: this.state.activeId,
        };
        browser.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    _restore() {
        let data;
        try {
            data = JSON.parse(browser.localStorage.getItem(STORAGE_KEY) || "null");
        } catch {
            data = null;
        }
        if (!data || !Array.isArray(data.tabs)) {
            return;
        }
        const allMenus = this.menuService.getAll();
        for (const saved of data.tabs) {
            const menu = allMenus.find((m) => m.id === saved.id);
            if (menu) {
                const tab = this._ensureTab(menu);
                tab.lastActionId = saved.lastActionId || tab.lastActionId;
            }
        }
        if (data.activeId && this.state.tabs.some((t) => t.id === data.activeId)) {
            this.state.activeId = data.activeId;
        }
        // 激活标签不在此启动：首次加载的 URL 动作会经 _routeGlobal 归位
    }

    get tabs() {
        return this.state.tabs;
    }

    get activeTab() {
        return this.state.tabs.find((t) => t.id === this.state.activeId);
    }

    // ------------------------------------------------------------------
    // 标签栏右侧功能菜单
    // ------------------------------------------------------------------

    /** 重新执行当前标签的根动作（keep-alive 页面驻留久了拉新数据用） */
    reloadActiveTab() {
        const tab = this.activeTab;
        if (!tab || !tab.lastActionId) {
            return;
        }
        const rt = this._ensureRuntime(tab);
        rt.started = true;
        rt.manager.doAction(tab.lastActionId, { clearBreadcrumbs: true });
    }

    /** 当前页面弹到真正的浏览器新标签（等效"复制标签"的双开场景） */
    openInNewWindow() {
        browser.open(browser.location.href, "_blank");
    }

    closeOthers() {
        const keep = this.activeTab;
        if (!keep) {
            return;
        }
        for (const tab of this.state.tabs) {
            if (tab.id !== keep.id) {
                this.runtime.delete(tab.id);
            }
        }
        this.state.tabs.splice(0, this.state.tabs.length, keep);
        this._persist();
    }

    closeAll() {
        this.state.tabs.splice(0);
        this.runtime.clear();
        this.state.activeId = null;
        this._persist();
    }
}
