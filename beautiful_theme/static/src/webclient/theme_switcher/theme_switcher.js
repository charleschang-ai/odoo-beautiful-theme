import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { user } from "@web/core/user";
import { browser } from "@web/core/browser/browser";
import { _t } from "@web/core/l10n/translation";

/**
 * 主题注册表。新增主题时：
 *  1. 在此加一项（id 与 res.users.settings.ui_theme 的 selection 值一致）
 *  2. 在 __manifest__.py 加一个 beautiful_theme.assets_web_<id> 资源包
 *  3. 在 views/webclient_templates.xml 加一个 t-elif 分支
 *  4. 在 models/res_users_settings.py 的 selection 里加对应值
 */
const THEMES = [
    {
        id: "",
        name: "Odoo Standard",
        subtitle: _t("Community default"),
        // 社区版默认顶栏是 #71639e（不是企业版的 #714B67）
        preview: "linear-gradient(120deg, #71639E 0%, #857AB3 100%)",
        dots: ["#71639E", "#017E84", "#F8F9FA"],
        ink: "light",
    },
    {
        id: "pearl",
        name: "Pearl",
        subtitle: _t("Pearl white · Enterprise look"),
        preview: "linear-gradient(120deg, #FFFFFF 0%, #F1EDF2 100%)",
        dots: ["#714B67", "#017E84", "#F8F7F9"],
        ink: "dark",
    },
    {
        id: "platinum",
        name: "Platinum",
        subtitle: _t("Platinum · Tech white"),
        preview: "linear-gradient(120deg, #FFFFFF 0%, #E9F0FA 100%)",
        dots: ["#2563EB", "#0F172A", "#F5F8FC"],
        ink: "dark",
    },
    {
        id: "emerald",
        name: "Emerald",
        subtitle: _t("Emerald · Fresh mint"),
        preview: "linear-gradient(120deg, #FFFFFF 0%, #E4F7EC 100%)",
        dots: ["#059669", "#10B981", "#F2FAF5"],
        ink: "dark",
    },
    {
        id: "obsidian",
        name: "Obsidian Gold",
        subtitle: _t("Obsidian · Black gold luxury"),
        preview: "linear-gradient(120deg, #0B0F19 0%, #1F2430 55%, #B8860B 100%)",
        dots: ["#1F2937", "#D4AF37", "#F6F2E9"],
        ink: "light",
    },
];

export class ThemeSwitcher extends Component {
    static template = "beautiful_theme.ThemeSwitcher";
    static props = {};

    setup() {
        this.themes = THEMES;
        this.state = useState({
            open: false,
            saving: null, // 正在切换的主题 id，用于显示 spinner
        });
    }

    get currentTheme() {
        return user.settings.ui_theme || "";
    }

    toggle() {
        this.state.open = !this.state.open;
    }

    close() {
        this.state.open = false;
    }

    isActive(themeId) {
        return this.currentTheme === themeId;
    }

    async onSelect(themeId) {
        if (this.state.saving !== null || this.isActive(themeId)) {
            return;
        }
        this.state.saving = themeId;
        try {
            // 写入 res.users.settings.ui_theme（按用户持久化），
            // 刷新后服务端 webclient_rendering_context 按新值挂载主题资源包
            await user.setUserSettings("ui_theme", themeId || false);
            browser.location.reload();
        } catch (error) {
            this.state.saving = null;
            throw error;
        }
    }
}

export const systrayItem = { Component: ThemeSwitcher };

registry.category("systray").add("beautiful_theme.ThemeSwitcher", systrayItem, { sequence: 100 });
