/*
 * Shared site behavior, loaded on every page as a classic deferred script so it
 * also works when pages are opened directly from the file system.
 *
 * The inline script in partials/head.html applies the saved theme and direction
 * before first paint; this file wires up the controls that change them.
 */
(function () {
  "use strict";

  var root = document.documentElement;

  // Must match the `xl` breakpoint where the desktop navigation appears.
  var DESKTOP_QUERY = "(min-width: 80rem)";
  var THEME_COLORS = { light: "#F7F3EB", dark: "#1C1B19" };

  // localStorage can be unavailable (privacy modes, blocked storage); fail quietly.
  var storage = {
    get: function (key) {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    },
    set: function (key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        /* The choice still applies for this page view. */
      }
    },
  };

  /* ---- Theme ------------------------------------------------------------- */

  function initTheme() {
    var toggles = document.querySelectorAll("[data-theme-toggle]");
    var themeColor = document.querySelector("[data-theme-color]");
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

    function apply(theme) {
      root.setAttribute("data-theme", theme);
      if (themeColor) themeColor.setAttribute("content", THEME_COLORS[theme]);
      var label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
      toggles.forEach(function (toggle) {
        toggle.setAttribute("aria-label", label);
        toggle.setAttribute("title", label);
      });
    }

    apply(root.getAttribute("data-theme") === "dark" ? "dark" : "light");

    toggles.forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        apply(next);
        storage.set("theme", next);
      });
    });

    // Follow system changes until the visitor picks a theme explicitly.
    systemDark.addEventListener("change", function (event) {
      if (!storage.get("theme")) apply(event.matches ? "dark" : "light");
    });
  }

  /* ---- Text direction ---------------------------------------------------- */

  function initDirection() {
    var options = document.querySelectorAll("[data-dir-option]");
    // Single-button toggle in the mobile/tablet header bar (below xl); see partials/header.html.
    var toggles = document.querySelectorAll("[data-dir-toggle]");

    function apply(dir) {
      root.setAttribute("dir", dir);
      options.forEach(function (option) {
        option.setAttribute("aria-pressed", String(option.getAttribute("data-dir-option") === dir));
      });
      var next = dir === "rtl" ? "ltr" : "rtl";
      var label = "Switch to " + (next === "rtl" ? "right-to-left" : "left-to-right") + " layout";
      toggles.forEach(function (toggle) {
        toggle.setAttribute("aria-label", label);
        toggle.setAttribute("title", label);
      });
    }

    apply(root.getAttribute("dir") === "rtl" ? "rtl" : "ltr");

    options.forEach(function (option) {
      option.addEventListener("click", function () {
        var dir = option.getAttribute("data-dir-option");
        apply(dir);
        storage.set("dir", dir);
      });
    });

    toggles.forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        var next = root.getAttribute("dir") === "rtl" ? "ltr" : "rtl";
        apply(next);
        storage.set("dir", next);
      });
    });
  }

  /* ---- Mobile navigation ------------------------------------------------- */

  function initMobileNav() {
    var toggle = document.querySelector("[data-menu-toggle]");
    var menu = document.querySelector("[data-mobile-menu]");
    if (!toggle || !menu) return;

    var header = document.querySelector("[data-site-header]");
    // Content behind the open menu is made inert so focus stays in the header.
    var background = document.querySelectorAll("main, [data-site-footer]");
    var desktop = window.matchMedia(DESKTOP_QUERY);

    function isOpen() {
      return toggle.getAttribute("aria-expanded") === "true";
    }

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.setAttribute("data-open", String(open));
      root.classList.toggle("menu-open", open);
      background.forEach(function (el) {
        el.inert = open;
      });
    }

    function close(options) {
      if (!isOpen()) return;
      setOpen(false);
      if (options && options.returnFocus) toggle.focus();
    }

    toggle.addEventListener("click", function () {
      setOpen(!isOpen());
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen()) close({ returnFocus: true });
    });

    // Close when a link inside the menu is followed (including in-page anchors).
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) close();
    });

    // Close when clicking outside the header while the menu is open.
    document.addEventListener("click", function (event) {
      if (isOpen() && header && !header.contains(event.target)) close();
    });

    // Reset when the viewport grows into the desktop layout.
    desktop.addEventListener("change", function (event) {
      if (event.matches) close();
    });
  }

  /* ---- Disclosures: desktop Home dropdown and mobile Home accordion ------- */

  function initDisclosures() {
    var HOVER_CLOSE_DELAY = 150;
    var desktop = window.matchMedia(DESKTOP_QUERY);
    var hoverCapable = window.matchMedia("(hover: hover)");
    var roots = document.querySelectorAll("[data-disclosure]");

    roots.forEach(function (root) {
      var trigger = root.querySelector("[data-disclosure-trigger]");
      var panel = root.querySelector("[data-disclosure-panel]");
      if (!trigger || !panel) return;

      var isDropdown = root.hasAttribute("data-dropdown");
      var links = panel.querySelectorAll("a");
      var hoverOpened = false;
      var closeTimer;

      function isOpen() {
        return trigger.getAttribute("aria-expanded") === "true";
      }

      function setOpen(open) {
        trigger.setAttribute("aria-expanded", String(open));
        panel.setAttribute("data-open", String(open));
        if (!open) hoverOpened = false;
      }

      function focusLink(index) {
        if (links.length) links[(index + links.length) % links.length].focus();
      }

      // The mobile accordion starts expanded when the current page is inside it.
      if (!isDropdown && panel.querySelector('[aria-current="page"]')) setOpen(true);

      trigger.addEventListener("click", function () {
        if (hoverOpened) {
          // A click on a dropdown opened by hover pins it open until dismissed.
          hoverOpened = false;
          return;
        }
        setOpen(!isOpen());
      });

      if (!isDropdown) return;

      // Mouse hover (not touch): open on enter, close shortly after leaving.
      root.addEventListener("pointerenter", function (event) {
        if (event.pointerType !== "mouse" || !hoverCapable.matches) return;
        clearTimeout(closeTimer);
        if (!isOpen()) {
          setOpen(true);
          hoverOpened = true;
        }
      });

      root.addEventListener("pointerleave", function (event) {
        if (event.pointerType !== "mouse" || !hoverOpened) return;
        closeTimer = setTimeout(function () {
          if (hoverOpened) setOpen(false);
        }, HOVER_CLOSE_DELAY);
      });

      trigger.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setOpen(true);
          focusLink(0);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
          focusLink(-1);
        }
      });

      panel.addEventListener("keydown", function (event) {
        var index = Array.prototype.indexOf.call(links, document.activeElement);
        if (event.key === "ArrowDown") {
          event.preventDefault();
          focusLink(index + 1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          focusLink(index - 1);
        } else if (event.key === "Home") {
          event.preventDefault();
          focusLink(0);
        } else if (event.key === "End") {
          event.preventDefault();
          focusLink(-1);
        }
      });

      // Escape closes the dropdown; focus goes back to the trigger if it was inside.
      document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape" || !isOpen()) return;
        var focusInside = root.contains(document.activeElement);
        setOpen(false);
        if (focusInside) trigger.focus();
      });

      // Clicking or tapping outside closes it.
      document.addEventListener("click", function (event) {
        if (isOpen() && !root.contains(event.target)) setOpen(false);
      });

      // Tabbing (or focus moving) out of the dropdown closes it.
      root.addEventListener("focusout", function (event) {
        if (isOpen() && event.relatedTarget && !root.contains(event.relatedTarget)) setOpen(false);
      });

      // Following a link closes it (the page is about to change, but not for in-page anchors).
      panel.addEventListener("click", function (event) {
        if (event.target.closest("a")) setOpen(false);
      });

      // Reset when the desktop navigation is hidden.
      desktop.addEventListener("change", function () {
        setOpen(false);
      });
    });
  }

  /* ---- Contact details from site.json ------------------------------------- */
  /* Fills in [data-contact-method] rows (email, phone, address) wherever they
     appear — the shared footer on every page, and the Contact page's own
     sections — and reveals each row only once site.json → contact has a value. */

  function initContactDetails() {
    document.querySelectorAll("[data-contact-method]").forEach(function (row) {
      var value = (row.getAttribute("data-value") || "").trim();
      if (!value) return;

      var type = row.getAttribute("data-contact-method");
      var link = row.querySelector("[data-contact-link]");
      var text = row.querySelector("[data-contact-text]");

      if (link && type === "email") link.setAttribute("href", "mailto:" + value);
      if (link && type === "phone") link.setAttribute("href", "tel:" + value.replace(/[^\d+]/g, ""));
      (link || text).textContent = value;
      row.hidden = false;
    });
  }

  /* ---- Footer year ------------------------------------------------------- */

  function updateCurrentYear() {
    var year = String(new Date().getFullYear());
    document.querySelectorAll("[data-current-year]").forEach(function (el) {
      el.textContent = year;
    });
  }

  /* ---- Scroll to top ------------------------------------------------------ */
  /* Public pages only (see partials/scroll-top.html); the dashboard has its
     own sidebar nav instead, so this is a no-op there. */

  var SCROLL_SHOW_AT = 560; // px scrolled before the button appears

  function initScrollTop() {
    var button = document.querySelector("[data-scroll-top]");
    if (!button) return;

    var footer = document.querySelector("[data-site-footer]");
    var pastThreshold = window.scrollY > SCROLL_SHOW_AT;
    var footerVisible = false;
    var ticking = false;

    function render() {
      button.setAttribute("data-visible", String(pastThreshold && !footerVisible));
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        pastThreshold = window.scrollY > SCROLL_SHOW_AT;
        render();
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });

    // Hides the button once the footer scrolls into view, so it never sits over footer links.
    if (footer && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        footerVisible = entries[0].isIntersecting;
        render();
      }).observe(footer);
    }

    button.addEventListener("click", function () {
      // Omitting `behavior` defers to the html { scroll-behavior } set in main.css,
      // which already switches from smooth to auto under prefers-reduced-motion.
      window.scrollTo({ top: 0 });
    });

    render();
  }

  initTheme();
  initDirection();
  initMobileNav();
  initDisclosures();
  initContactDetails();
  updateCurrentYear();
  initScrollTop();
})();
