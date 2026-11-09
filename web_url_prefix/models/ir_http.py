# Part of AstaCRM. See LICENSE file for full copyright and licensing details.
from odoo import models

from ..const import get_url_prefix


class IrHttp(models.AbstractModel):
    _inherit = 'ir.http'

    def _generate_routing_rules(self, modules, converters):
        # Duplicate every "/odoo..." route under the configured prefix, so all
        # backend deep links (webclient, offline page, any other module's
        # /odoo/* route) work with the new prefix. The routing map is cached
        # (cache='routing') and rebuilt when the setting changes.
        prefix = get_url_prefix(self.env)
        for url, endpoint in super()._generate_routing_rules(modules, converters):
            yield url, endpoint
            if prefix and (url == '/odoo' or url.startswith('/odoo/')):
                yield f'/{prefix}' + url[len('/odoo'):], endpoint

    def session_info(self):
        # Expose the branding values to the JS side (read via @web/session).
        info = super().session_info()
        icp = self.env['ir.config_parameter'].sudo()
        info['web_url_prefix'] = get_url_prefix(self.env) or 'odoo'
        info['web_app_name'] = icp.get_param('web.web_app_name') or False
        return info

    def webclient_rendering_context(self):
        # Inject the custom favicon and initial tab title into the webclient
        # page (the "x_icon" and "title" qcontext keys of web.layout).
        ctx = super().webclient_rendering_context()
        icp = self.env['ir.config_parameter'].sudo()
        if icp.get_param('web_url_prefix.favicon'):
            ctx['x_icon'] = '/web_url_prefix/favicon'
        app_name = icp.get_param('web.web_app_name')
        if app_name:
            ctx['title'] = app_name
        return ctx
