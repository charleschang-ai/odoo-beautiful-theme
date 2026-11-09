# Part of AstaCRM. See LICENSE file for full copyright and licensing details.
import base64

from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.home import Home
from odoo.addons.web.controllers.session import Session
from odoo.addons.web.controllers.utils import ensure_db, is_user_internal
from odoo.addons.web.controllers.webmanifest import WebManifest
from odoo.tools.mimetypes import guess_mimetype

from ..const import get_url_prefix


def _prefix():
    """Validated prefix for the current request's database, or None."""
    if not request.db:
        return None
    return get_url_prefix(request.env)


class HomeUrlPrefix(Home):

    @http.route()
    def index(self, s_action=None, db=None, **kw):
        if request.db and request.session.uid and not is_user_internal(request.session.uid):
            return request.redirect_query('/web/login_successful', query=request.params)
        prefix = _prefix() or 'odoo'
        return request.redirect_query(f'/{prefix}', query=request.params)

    # The prefixed routes themselves are generated dynamically in
    # ir.http._generate_routing_rules (every "/odoo..." rule is duplicated
    # under the configured prefix), so the parent's routes are inherited
    # unchanged here.
    @http.route()
    def web_client(self, s_action=None, **kw):
        ensure_db()
        prefix = _prefix()
        path = request.httprequest.path
        # Permanently redirect legacy /odoo URLs (old emails, bookmarks,
        # links generated server-side by other modules) to the new prefix.
        if prefix and (path == '/odoo' or path.startswith('/odoo/')):
            new_path = f'/{prefix}{path[len("/odoo"):]}'
            query = request.httprequest.query_string.decode()
            return request.redirect(f'{new_path}?{query}' if query else new_path, code=301)
        return super().web_client(s_action=s_action, **kw)

    @http.route()
    def web_login(self, redirect=None, **kw):
        response = super().web_login(redirect=redirect, **kw)
        # Apply the custom favicon / tab title on the login page as well.
        if getattr(response, 'qcontext', None) is not None and request.db:
            icp = request.env['ir.config_parameter'].sudo()
            if icp.get_param('web_url_prefix.favicon'):
                response.qcontext.setdefault('x_icon', '/web_url_prefix/favicon')
            app_name = icp.get_param('web.web_app_name')
            if app_name:
                response.qcontext.setdefault('title', app_name)
        return response

    def _login_redirect(self, uid, redirect=None):
        url = super()._login_redirect(uid, redirect=redirect)
        prefix = _prefix()
        if prefix and url == '/odoo':
            url = f'/{prefix}'
        return url


class SessionUrlPrefix(Session):

    @http.route()
    def logout(self, redirect=None):
        if not redirect:
            redirect = f"/{_prefix() or 'odoo'}"
        return super().logout(redirect=redirect)


class WebManifestUrlPrefix(WebManifest):

    def _get_webmanifest(self):
        manifest = super()._get_webmanifest()
        prefix = _prefix()
        if not prefix:
            return manifest
        manifest['scope'] = f'/{prefix}'
        manifest['start_url'] = f'/{prefix}'
        for shortcut in manifest.get('shortcuts', []):
            shortcut['url'] = shortcut['url'].replace('/odoo?', f'/{prefix}?', 1)
        return manifest

    @http.route()
    def service_worker(self):
        response = super().service_worker()
        prefix = _prefix()
        if prefix:
            response.headers['Service-Worker-Allowed'] = f'/{prefix}'
        return response

    def _get_service_worker_content(self):
        # Rewrites homepageURL ("/odoo") and the share_target redirect
        # ("/odoo?share_target=trigger") inside service_worker.js.
        content = super()._get_service_worker_content()
        prefix = _prefix()
        if not prefix:
            return content
        return content.replace('"/odoo', f'"/{prefix}')


class UrlPrefixBranding(http.Controller):

    @http.route('/web_url_prefix/favicon', type='http', auth='public',
                methods=['GET'], readonly=True)
    def custom_favicon(self):
        icon = request.env['ir.config_parameter'].sudo().get_param('web_url_prefix.favicon')
        if not icon:
            return request.redirect('/web/static/img/favicon.ico', code=302)
        data = base64.b64decode(icon)
        return request.make_response(data, [
            ('Content-Type', guess_mimetype(data, default='image/x-icon')),
            ('Cache-Control', 'public, max-age=3600'),
        ])
