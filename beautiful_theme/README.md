# Beautiful Backend Theme (Odoo 19 Enterprise)

Odoo 19 后台多主题切换模块（企业版）。复刻官方深色模式（`web.assets_web_dark`）的
资源包机制，把「二选一」扩展成「N 选一」，深度适配 `web_enterprise`。

## 特性

- **秒级切换**：每套主题是一个预编译 CSS 包，切换 = 写用户设置 + 刷新，无需重编译资源
- **按用户持久化**：主题存在 `res.users.settings.ui_theme`，换设备也记得
- **systray 抽屉**：顶栏调色板按钮 → 右侧滑出抽屉 → 点卡片切换（纯 OWL，无 jQuery）
- **官方暗色模式入口**：抽屉里的 "Odoo Dark" 卡片直接写企业版
  `res.users.settings.color_scheme`；选浅色主题时自动切回 light（dark 分支优先于主题包）
- **企业版主屏幕（Home Menu）无缝集成**：九宫格按钮、全屏应用网格、返回箭头照常工作，
  多标签树在主屏幕下层保活
- 内置主题：
  - **Pearl 珍珠白** — 官方企业版配色（白渐变顶栏 + 企业紫 #714B67 + 行动青 #017E84）
  - **Platinum 铂金** — 科技白（霜银渐变顶栏 + 冷石板灰阶 + 电光蓝 #2563EB），Stripe/Vercel 式质感
  - **Emerald 翠绿** — 清爽薄荷（白绿渐变顶栏 + 翡翠绿 #059669）
  - **Obsidian Gold 曜金** — 黑金奢华（曜石渐变顶栏 + 香槟金 #B8860B，主屏幕曜石深底）
- 系统级覆盖：顶栏、页面渐变背景、控制面板磨砂、Form 白卡片（圆角+投影）、
  List 表头着色+行悬停、Kanban 卡片、弹窗圆角、纤细滚动条、主屏幕背景/应用名配色

## 机制（一条链路）

```
抽屉点卡片
  → user.setUserSettings("ui_theme", ...)   # 写 res.users.settings（按用户）
  → location.reload()
  → ir.http.webclient_rendering_context()   # 服务端注入 qcontext.ui_theme
  → web.webclient_bootstrap 模板 t-elif 分支  # 按主题挂载对应 CSS 资源包
  → 资源包用 ('before', web_enterprise/.../primary_variables.scss, ...) 注入主题变量
    压过官方（含企业版）所有 !default 声明 → 全站换肤
```

JS 只加载一份（`web.assets_web` 的 JS），主题包只替换 CSS（`t-js="false"`）。

## 企业版适配要点（踩坑记录）

1. **变量锚点必须是 `web_enterprise/static/src/scss/primary_variables.scss`**（它自己
   插在 `web/primary_variables.scss` 之前）。企业版在该文件里用 `map-merge` 派生按钮
   配色（取当时的 `$o-brand-primary`），主题变量若不排在它前面，主按钮永远是企业紫。
2. **组件注册挂 `WebClientEnterprise`**：它的 `static components` 在类定义时就展开
   复制了 `WebClient.components`，本模块资源在其后加载，改基类不会传导（原社区版
   写法在企业版直接白屏）。
3. **NavBar 扩展必须针对 `web_enterprise.EnterpriseNavBar`**：primary 派生模板只应用
   blockId 不大于它自己的扩展，对 `web.NavBar` 的扩展进不了企业版导航栏；且企业版
   xpath 会 replace 品牌 DropdownItem，社区版写法先删该节点会让企业版模板编译崩溃。
4. **Home Menu 是全局管理器上的客户端动作（tag="menu"）**：多标签容器把它可见挂载为
   全屏覆盖层（不路由进标签）；用户选中应用后，全局管理器切到空白动作
   `beautiful_theme.tab_desk` 让 `HomeMenuAction` 卸载（复原 `hasHomeMenu`/body 类/
   导航栏形态），该空白动作同时充当再次打开主屏幕时的"背景动作"（返回箭头可退）。
5. **暗色模式互斥**：`webclient_bootstrap` 的 dark 分支排在主题 t-elif 之前，dark
   cookie 生效时主题包不加载 → 选主题时自动把 `color_scheme` 写回 light。

## 新增一套主题（4 步）

1. `static/src/scss/themes/<id>/variables.scss` + `style.scss`
2. `__manifest__.py` 加 `beautiful_theme.assets_web_<id>` 资源包
3. `views/webclient_templates.xml` 加一个 `t-elif` 分支
4. `models/res_users_settings.py` 的 selection 加值，
   `theme_switcher.js` 的 THEMES 加卡片

## 版本兼容

**仅限企业版（Enterprise）**：`depends` 含 `web_enterprise`。社区版请使用本模块的
社区版分支（改动点即上面「企业版适配要点」的反向操作）。

## 注意事项

- 品牌变量（`$o-brand-primary` 等）必须是**纯色**，官方会对其做 `darken()/mix()`
  派生计算；渐变只放 `$o-navbar-background` 和 `style.scss` 的规则
- 每套主题会多编译一份完整 CSS（约数百 KB），3~5 套为宜
