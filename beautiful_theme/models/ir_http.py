# -*- coding: utf-8 -*-
from odoo import models


class IrHttp(models.AbstractModel):
    _inherit = "ir.http"

    def _get_ui_theme(self):
        """当前用户选择的后台主题名，未选择返回 False（标准外观）。

        注意：不要用 odoo.http.request —— 在非 HTTP 上下文（shell/cron/测试）
        它是 unbound proxy，连真值判断都会抛 RuntimeError。HTTP 分发时
        self.env.user 即当前登录用户，足够了。
        """
        user = self.env.user
        if user and not user._is_public():
            settings = user.sudo().res_users_settings_id
            if settings and settings.ui_theme:
                return settings.ui_theme
        return False

    def webclient_rendering_context(self):
        # 注入 qcontext，供 web.webclient_bootstrap 模板按主题选择资源包
        res = super().webclient_rendering_context()
        res["ui_theme"] = self._get_ui_theme()
        return res
