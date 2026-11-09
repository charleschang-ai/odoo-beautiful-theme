# Part of AstaCRM. See LICENSE file for full copyright and licensing details.
{
    'name': 'Web URL Prefix & Branding',
    'summary': 'Custom backend URL prefix, browser tab title and favicon, configurable in Settings',
    'description': """
Replace the hardcoded "/odoo" prefix in backend URLs (e.g. /odoo/action-123)
with a custom prefix, and customize the browser tab title and favicon.

Everything is configured in Settings > URL & Branding and applied on save,
no server restart needed. Legacy /odoo URLs keep working: they are
permanently redirected (301) to the new prefix, so links in old emails,
bookmarks, etc. are not broken.
    """,
    'version': '19.0.2.0.0',
    'category': 'Hidden',
     "author": "Don Shan",
    "license": "LGPL-3",
    'price': 39,
    'currency': "USD",
    'license': 'LGPL-3',
    'depends': ['web', 'base_setup'],
    'data': [
        'data/defaults.xml',
        'views/res_config_settings_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'web_url_prefix/static/src/router_prefix.js',
            'web_url_prefix/static/src/patches.js',
        ],
    },
    'installable': True,
    'application': False,
}
