# Part of AstaCRM. See LICENSE file for full copyright and licensing details.
from odoo import _, fields, models
from odoo.exceptions import ValidationError

from ..const import RESERVED_PREFIXES, _PREFIX_RE


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    backend_url_prefix = fields.Char(
        string="Backend URL Prefix",
        config_parameter='web_url_prefix.prefix',
        help="Replaces the '/odoo' prefix in backend URLs, e.g. 'app' gives "
             "/app/action-123. Leave empty to keep the standard '/odoo'. "
             "Applied immediately on save, no restart needed.")
    web_app_name = fields.Char(
        string="Web App Name",
        config_parameter='web.web_app_name',
        help="Shown as the browser tab title and as the installed PWA name. "
             "Leave empty to keep 'Odoo'.")
    backend_favicon = fields.Binary(
        string="Favicon",
        help="Icon shown in the browser tab (PNG or ICO). "
             "Leave empty to keep the Odoo favicon.")

    def get_values(self):
        res = super().get_values()
        icp = self.env['ir.config_parameter'].sudo()
        res['backend_favicon'] = icp.get_param('web_url_prefix.favicon') or False
        return res

    def set_values(self):
        prefix = (self.backend_url_prefix or '').strip().strip('/')
        if prefix:
            if prefix in RESERVED_PREFIXES:
                raise ValidationError(_(
                    "'%s' is reserved by Odoo and cannot be used as URL "
                    "prefix. Pick an unused word such as 'app', 'workspace' "
                    "or 'hq'.", prefix))
            if not _PREFIX_RE.match(prefix):
                raise ValidationError(_(
                    "The URL prefix may only contain letters, digits, "
                    "'-' and '_'."))
        self.backend_url_prefix = prefix

        icp = self.env['ir.config_parameter'].sudo()
        old_prefix = icp.get_param('web_url_prefix.prefix') or ''
        super().set_values()
        icp.set_param('web_url_prefix.favicon', self.backend_favicon or False)
        if (icp.get_param('web_url_prefix.prefix') or '') != old_prefix:
            # Rebuild the HTTP routing map so the new prefix routes exist
            # right away (works across workers through registry signaling).
            self.env.registry.clear_cache('routing')
