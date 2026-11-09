import re

# Default prefix applied on installation (stored in ir.config_parameter
# "web_url_prefix.prefix", editable in Settings > URL & Branding).
DEFAULT_PREFIX = "app"

# Words that already own a route namespace in Odoo core. Using one of them as
# a prefix would shadow core routes (e.g. "/web/assets/...") and break asset
# or action loading, so they are rejected at validation time.
RESERVED_PREFIXES = {
    'web', 'odoo', 'scoped_app', 'website', 'my', 'shop', 'web_editor',
    'base', 'bus', 'mail', 'calendar', 'im_livechat', 'longpolling',
}

_PREFIX_RE = re.compile(r'^[A-Za-z0-9_-]+$')


def get_url_prefix(env):
    """Return the validated URL prefix, or None when disabled/invalid."""
    prefix = (env['ir.config_parameter'].sudo()
              .get_param('web_url_prefix.prefix') or '').strip().strip('/')
    if not prefix or prefix in RESERVED_PREFIXES or not _PREFIX_RE.match(prefix):
        return None
    return prefix
