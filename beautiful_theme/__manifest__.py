# -*- coding: utf-8 -*-
{
    "name": "Beautiful Backend Theme",
    "version": "19.0.2.0.0",
    "category": "Themes/Backend",
    "summary": "Premium multi-theme switcher for Odoo 19 backend (Enterprise Edition)",
    "description": """
Odoo 19 后台多主题切换模块（企业版）
====================================
- 复刻官方深色模式的资源包机制：每套主题一个预编译 CSS 包，切换秒级生效
- 按用户持久化（res.users.settings），换设备也记得
- systray 调色板按钮 + 右侧抽屉选择主题（含官方暗色模式入口）
- 内置四套商务高端主题：Pearl / Platinum / Emerald / Obsidian Gold
- 深度适配企业版：EnterpriseNavBar、全屏主屏幕（Home Menu）、color_scheme 暗色模式
    """,
    "author": "AstaCRM",
    "website": "https://www.astacrm.com",
    "license": "LGPL-3",
    "depends": ["web", "web_enterprise"],
    "data": [
        "views/webclient_templates.xml",
    ],
    "assets": {
        # 切换器 UI（JS/XML/SCSS）进主包 —— 所有主题包都 include web.assets_web，
        # 因此这些文件在任何主题下都可用
        "web.assets_backend": [
            "beautiful_theme/static/src/webclient/**/*",
        ],
        # ------------------------------------------------------------------
        # 每套主题 = 一个完整的 web 资源包（复刻官方 web.assets_web_dark 的做法）
        # 锚点必须是 web_enterprise 的 primary_variables.scss（它自己插在
        # web/primary_variables.scss 之前）：企业版在该文件里用 map-merge 派生
        # 按钮配色（$o-btns-bs-override 取当时的 $o-brand-primary），主题变量
        # 若不排在它前面，主按钮永远是企业紫而不是主题主色
        # ------------------------------------------------------------------
        "beautiful_theme.assets_web_pearl": [
            ("include", "web.assets_web"),
            ("before", "web_enterprise/static/src/scss/primary_variables.scss",
                       "beautiful_theme/static/src/scss/themes/pearl/variables.scss"),
            "beautiful_theme/static/src/scss/themes/pearl/style.scss",
        ],
        "beautiful_theme.assets_web_platinum": [
            ("include", "web.assets_web"),
            ("before", "web_enterprise/static/src/scss/primary_variables.scss",
                       "beautiful_theme/static/src/scss/themes/platinum/variables.scss"),
            "beautiful_theme/static/src/scss/themes/platinum/style.scss",
        ],
        "beautiful_theme.assets_web_emerald": [
            ("include", "web.assets_web"),
            ("before", "web_enterprise/static/src/scss/primary_variables.scss",
                       "beautiful_theme/static/src/scss/themes/emerald/variables.scss"),
            "beautiful_theme/static/src/scss/themes/emerald/style.scss",
        ],
        "beautiful_theme.assets_web_obsidian": [
            ("include", "web.assets_web"),
            ("before", "web_enterprise/static/src/scss/primary_variables.scss",
                       "beautiful_theme/static/src/scss/themes/obsidian/variables.scss"),
            "beautiful_theme/static/src/scss/themes/obsidian/style.scss",
        ],
    },
    'images': ['static/description/icon.png'],
    "installable": True,
    "application": False,
}
