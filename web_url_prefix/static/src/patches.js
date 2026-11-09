import { registry } from "@web/core/registry";
import { patch } from "@web/core/utils/patch";
import { session } from "@web/session";
import { WebClient } from "@web/webclient/webclient";

const PREFIX = session.web_url_prefix || "odoo";
const RESERVED = ["web", "odoo", "scoped_app"];
const serviceRegistry = registry.category("services");

// --- Browser tab title branding (independent from the URL prefix) ---------
// The title service joins its parts and falls back to "Odoo"; register the
// configured app name as a permanent part so the tab reads e.g.
// "Settings - MyBrand" and "MyBrand" when idle.
if (session.web_app_name && serviceRegistry.contains("title")) {
    const titleService = serviceRegistry.get("title");
    const originalStart = titleService.start;
    titleService.start = function (...args) {
        const api = originalStart.apply(this, args);
        api.setParts({ zopenerp: session.web_app_name });
        return api;
    };
}

// --- URL prefix related patches -------------------------------------------
if (PREFIX && !RESERVED.includes(PREFIX)) {
    const PREFIX_PATH = `/${PREFIX}`;

    // webclient.js registers the service worker with a hardcoded
    // { scope: "/odoo" }: intercept the register() call to fix the scope.
    patch(WebClient.prototype, {
        registerServiceWorker() {
            if (!navigator.serviceWorker) {
                return;
            }
            const container = navigator.serviceWorker;
            const originalRegister = container.register.bind(container);
            container.register = (url, options) =>
                originalRegister(url, { ...options, scope: PREFIX_PATH });
            try {
                super.registerServiceWorker();
            } finally {
                delete container.register;
            }
        },
    });

    // pwa_service.js hardcodes startUrl: "/odoo" (used for the PWA install
    // prompt state and the post-install redirect).
    // Guarded: must never throw at import time.
    if (serviceRegistry.contains("pwa")) {
        const pwaService = serviceRegistry.get("pwa");
        const originalStart = pwaService.start;
        pwaService.start = function (env, deps) {
            const state = originalStart.call(this, env, deps);
            if (state.startUrl === "/odoo") {
                state.startUrl = PREFIX_PATH;
            }
            return state;
        };
    }
}
