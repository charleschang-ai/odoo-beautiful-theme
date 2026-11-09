import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { user } from "@web/core/user";
import { browser } from "@web/core/browser/browser";
import { cookie } from "@web/core/browser/cookie";

// 官方暗色模式的伪主题 id（不写入 ui_theme，走企业版 color_scheme 通道）
const DARK_ID = "__dark__";

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
        subtitle: "企业版默认",
        // 企业版默认是白色顶栏 + 企业紫 #714B67
        preview: "linear-gradient(120deg, #FFFFFF 0%, #F3EFF2 100%)",
        dots: ["#714B67", "#017E84", "#F8F9FA"],
        ink: "dark",
    },
    {
        id: DARK_ID,
        name: "Odoo Dark",
        subtitle: "官方暗色模式",
        preview: "linear-gradient(120deg, #262A36 0%, #1E212B 100%)",
        dots: ["#262A36", "#714B67", "#E7E9ED"],
        ink: "light",
    },
    {
        id: "pearl",
        name: "Pearl",
        subtitle: "珍珠白 · 企业风",
        preview: "linear-gradient(120deg, #FFFFFF 0%, #F1EDF2 100%)",
        dots: ["#714B67", "#017E84", "#F8F7F9"],
        ink: "dark",
    },
    {
        id: "platinum",
        name: "Platinum",
        subtitle: "铂金 · 科技白",
        preview: "linear-gradient(120deg, #FFFFFF 0%, #E9F0FA 100%)",
        dots: ["#2563EB", "#0F172A", "#F5F8FC"],
        ink: "dark",
    },
    {
        id: "emerald",
        name: "Emerald",
        subtitle: "翠绿 · 清爽薄荷",
        preview: "linear-gradient(120deg, #FFFFFF 0%, #E4F7EC 100%)",
        dots: ["#059669", "#10B981", "#F2FAF5"],
        ink: "dark",
    },
    {
        id: "obsidian",
        name: "Obsidian Gold",
        subtitle: "曜金 · 黑金奢华",
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

    /** 企业版暗色模式是否生效（服务端按同一 cookie 选择 dark 资源包） */
    get isDarkActive() {
        return cookie.get("color_scheme") === "dark";
    }

    toggle() {
        this.state.open = !this.state.open;
    }

    close() {
        this.state.open = false;
    }

    isActive(themeId) {
        if (themeId === DARK_ID) {
            return this.isDarkActive;
        }
        // 暗色模式下 webclient_bootstrap 的 dark 分支优先，主题包不加载
        return !this.isDarkActive && this.currentTheme === themeId;
    }

    async onSelect(themeId) {
        if (this.state.saving !== null || this.isActive(themeId)) {
            return;
        }
        this.state.saving = themeId;
        try {
            if (themeId === DARK_ID) {
                // 官方暗色模式：写企业版 color_scheme，ui_theme 保留
                // （回到浅色时原主题自动恢复）
                await user.setUserSettings("color_scheme", "dark");
            } else {
                // 写入 res.users.settings.ui_theme（按用户持久化），
                // 刷新后服务端 webclient_rendering_context 按新值挂载主题资源包
                await user.setUserSettings("ui_theme", themeId || false);
                // 暗色模式生效中（cookie 或用户设置为 dark）时必须切回浅色，
                // 否则模板的 dark 分支优先、主题包永远不加载
                if (this.isDarkActive || user.settings.color_scheme === "dark") {
                    await user.setUserSettings("color_scheme", "light");
                }
            }
            browser.location.reload();
        } catch (error) {
            this.state.saving = null;
            throw error;
        }
    }
}

export const systrayItem = { Component: ThemeSwitcher };

registry.category("systray").add("beautiful_theme.ThemeSwitcher", systrayItem, { sequence: 100 });
