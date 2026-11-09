# -*- coding: utf-8 -*-
from odoo import fields, models


class ResUsersSettings(models.Model):
    _inherit = "res.users.settings"

    # 按用户存储的后台主题。
    # 该字段会被 base 的 _res_users_settings_format() 自动格式化进
    # session_info["user_settings"]，前端通过 user.settings.ui_theme 读取、
    # user.setUserSettings("ui_theme", value) 写入 —— 无需自定义 RPC。
    ui_theme = fields.Selection(
        selection=[
            ("pearl", "Pearl White"),
            ("platinum", "Platinum Tech"),
            ("emerald", "Emerald Fresh"),
            ("obsidian", "Obsidian Gold"),
        ],
        string="Backend Theme",
        help="Personal backend theme. Empty means the standard Odoo look.",
    )
