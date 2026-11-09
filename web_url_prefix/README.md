# Web URL Prefix & Branding

把 Odoo 19 後台網址中的 `/odoo` 前綴替換成自訂前綴,並可自訂瀏覽器分頁的
標題與圖示(favicon)。全部在 **設定 → URL & Branding** 中配置,儲存即生效,
**無需重啟服務**。

```
http://localhost:8069/odoo/action-123   ->   http://localhost:8069/app/action-123
瀏覽器分頁: "Settings - Odoo"           ->   "Settings - 你的品牌"
```

## 設定項(設定頁最下方 "URL & Branding")

| 設定 | 說明 |
|---|---|
| **URL Prefix** | 替換 `/odoo` 的前綴(預設 `app`)。留空 = 恢復標準 `/odoo`。儲存即生效 |
| **Web App Name** | 瀏覽器分頁標題、PWA 應用名稱。留空 = 保持 "Odoo" |
| **Favicon** | 瀏覽器分頁圖示(PNG/ICO,建議 32x32 或 64x64)。留空 = 保持 Odoo 圖示 |

> ⚠️ **保留字**:`web`、`odoo`、`website`、`my`、`shop` 等核心命名空間不能用作
> 前綴(會覆蓋核心路由導致資源載入失敗),儲存時會直接報錯拒絕。

## 原理:`/odoo` 前綴來自哪裡

Odoo 17.2 起後台從 `/web`(hash 路由)遷移到 `/odoo`(path 路由),寫死在:

| 位置 | 作用 |
|---|---|
| `addons/web/controllers/home.py` | `/`、`/web`、`/odoo`、`/odoo/<path>` 的 HTTP 路由與重定向 |
| `addons/web/static/src/core/browser/router.js` | 前端路由:`stateToUrl()` 生成 `/odoo/...`、`urlToState()` 解析,以及內部連結點擊攔截 |
| `addons/web/controllers/utils.py` | 登入後重定向 `/odoo` |
| `addons/web/controllers/session.py` | 登出重定向 `/odoo` |
| `addons/web/controllers/webmanifest.py` | PWA manifest 的 scope/start_url、service worker |

## 本模組的做法

- **動態路由**:覆寫 `ir.http._generate_routing_rules`,把所有 `/odoo...` 路由
  (包括其它模組註冊的)自動複製一份到自訂前綴下;路由表帶 `routing` 快取,
  設定變更時呼叫 `registry.clear_cache('routing')` 立即重建(多 worker 透過
  registry signaling 同步)——這就是免重啟的原因。
- **301 重定向**:舊 `/odoo/...` 網址永久重定向到新前綴,舊郵件連結、書籤不失效。
- **前端**:包裝 `router.stateToUrl` / `router.urlToState`(核心明確標註可 patch),
  重跑 `startRouter()` 讓初始 URL 以新前綴解析;補一個內部連結點擊攔截器
  (核心的攔截器只在路徑以 `/odoo` 開頭時生效)。前綴透過 `session_info`
  傳給前端,單一資料來源。
- **分頁標題**:包裝 `title` service,把 Web App Name 註冊為常駐標題後綴。
- **Favicon**:`webclient_rendering_context()` / 登入頁 qcontext 注入
  `x_icon`(`web.layout` 模板原生支援),由 `/web_url_prefix/favicon` 提供圖檔。
- **PWA**:webmanifest 的 scope/start_url/名稱、service worker 註冊 scope 與
  離線頁一併改寫。

## 為什麼不能「完全去掉」前綴

後台動作路徑(如 `/action-123`、`/crm`)若直接掛在根路徑,會與 website、portal
以及所有其他模組的根路由(`/shop`、`/my` 等)衝突,需要 catch-all 路由,風險
極高。因此採用「替換為短前綴」方案;想更短可設為單字母,例如 `a`。
