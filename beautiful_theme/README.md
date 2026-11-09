# Beautiful Backend Theme (Odoo 19 Community)

Odoo 19 后台多主题切换模块。复刻官方深色模式（`web.assets_web_dark`）的资源包机制，
把「二选一」扩展成「N 选一」，社区版可用。

## 特性

- **秒级切换**：每套主题是一个预编译 CSS 包，切换 = 写用户设置 + 刷新，无需重编译资源
- **按用户持久化**：主题存在 `res.users.settings.ui_theme`，换设备也记得
- **systray 抽屉**：顶栏调色板按钮 → 右侧滑出抽屉 → 点卡片切换（纯 OWL，无 jQuery）
- 内置主题：
  - **Pearl 珍珠白** — 官方企业版配色（白渐变顶栏 + 企业紫 #714B67 + 行动青 #017E84 + 企业版灰阶），社区版呈现企业版观感
  - **Platinum 铂金** — 科技白（霜银渐变顶栏 + 冷石板灰阶 + 电光蓝 #2563EB + 右上角辉光），Stripe/Vercel 式质感
- 系统级覆盖：顶栏、页面渐变背景、控制面板磨砂、Form 白卡片（圆角+投影）、List 表头着色+行悬停、Kanban 卡片、弹窗圆角、纤细滚动条

## 机制（一条链路）

```
抽屉点卡片
  → user.setUserSettings("ui_theme", ...)   # 写 res.users.settings（按用户）
  → location.reload()
  → ir.http.webclient_rendering_context()   # 服务端注入 qcontext.ui_theme
  → web.webclient_bootstrap 模板 t-elif 分支  # 按主题挂载对应 CSS 资源包
  → 资源包用 ('before', primary_variables.scss, ...) 注入主题变量
    压过官方所有 !default 声明 → 全站换肤
```

JS 只加载一份（`web.assets_web` 的 JS），主题包只替换 CSS（`t-js="false"`）。

## 新增一套主题（4 步）

1. `static/src/scss/themes/<id>/variables.scss` + `style.scss`
2. `__manifest__.py` 加 `beautiful_theme.assets_web_<id>` 资源包
3. `views/webclient_templates.xml` 加一个 `t-elif` 分支
4. `models/res_users_settings.py` 的 selection 加值，
   `theme_switcher.js` 的 THEMES 加卡片

## 版本兼容

**仅限社区版（Community）。** 装到企业版会白屏崩溃：`WebClientEnterprise` 在
web_enterprise 加载时快照了 `WebClient.components`（不含我们后注册的 AppSidebar），
而它复用的 `web.WebClient` 模板已被本模块注入 `<AppSidebar/>` → OWL 找不到组件定义。
另有 Home Menu 与侧栏的导航范式冲突。若需企业版支持，按标准做法新建
`beautiful_theme_enterprise` 桥接模块（depends 两者 + auto_install）补注册组件并适配。

## 注意事项

- 品牌变量（`$o-brand-primary` 等）必须是**纯色**，官方会对其做 `darken()/mix()`
  派生计算；渐变只放 `$o-navbar-background` 和 `style.scss` 的规则
- 每套主题会多编译一份完整 CSS（约数百 KB），3~5 套为宜
