import { browser } from "@web/core/browser/browser";
import { router, startRouter } from "@web/core/browser/router";
import { session } from "@web/session";

// Single source of truth is const.py, exposed through session_info().
const PREFIX = session.web_url_prefix || "odoo";
// Reserved words collide with core routes; never rewrite for those.
const RESERVED = ["web", "odoo", "scoped_app"];

if (PREFIX && !RESERVED.includes(PREFIX)) {
    const PREFIX_PATH = `/${PREFIX}`;
    const { stateToUrl, urlToState } = router;

    router.stateToUrl = function (state) {
        const url = stateToUrl.call(this, state);
        return url === "/odoo" || url.startsWith("/odoo/") || url.startsWith("/odoo?")
            ? PREFIX_PATH + url.slice("/odoo".length)
            : url;
    };

    router.urlToState = function (urlObj) {
        // Present a legacy pathname to the original parser, which only
        // understands the "odoo" and "scoped_app" prefixes.
        if (urlObj.pathname === PREFIX_PATH || urlObj.pathname.startsWith(`${PREFIX_PATH}/`)) {
            urlObj = new URL(urlObj.href);
            urlObj.pathname = "/odoo" + urlObj.pathname.slice(PREFIX_PATH.length);
        }
        return urlToState.call(this, urlObj);
    };

    // router.js already parsed the initial URL with the unpatched functions
    // when it was loaded: parse it again now that the prefix is understood.
    // Safe at this point: addLockedKey/hideKeyFromUrl consumers only run
    // later, at service startup.
    startRouter();

    // The click handler in router.js only intercepts internal links when
    // location.pathname starts with "/odoo", so it is inert on the custom
    // prefix: replicate it here. The router state in router.js is private,
    // so navigation goes through the history + popstate machinery, whose
    // handler updates that state and triggers ROUTE_CHANGE for us.
    browser.addEventListener("click", (ev) => {
        if (ev.defaultPrevented || ev.target.closest("[contenteditable]")) {
            return;
        }
        const a = ev.target.closest("a");
        const href = a?.getAttribute("href");
        if (href && !href.startsWith("#")) {
            let url;
            try {
                url = new URL(a.href);
            } catch {
                return;
            }
            if (
                browser.location.host === url.host &&
                browser.location.pathname.startsWith(PREFIX_PATH) &&
                (["/web", "/odoo", PREFIX_PATH].includes(url.pathname) ||
                    url.pathname.startsWith("/odoo/") ||
                    url.pathname.startsWith(`${PREFIX_PATH}/`)) &&
                a.target !== "_blank"
            ) {
                ev.preventDefault();
                // Rewrite legacy hrefs so the address bar shows the new prefix.
                if (url.pathname === "/odoo" || url.pathname.startsWith("/odoo/")) {
                    url.pathname = PREFIX_PATH + url.pathname.slice("/odoo".length);
                }
                browser.history.pushState({}, "", url.href);
                window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
            }
        }
    });
}
