/*
 * Student portal behavior (loaded only by dashboard.html).
 *
 * - One state object (current level, enrollments, milestone progress, showcase
 *   interest, activity, display name) saved in localStorage. Every view renders
 *   from it, so the overview, classes, progress, showcase and account always agree.
 * - Sidebar: sticky from 64rem, a drawer below (Escape, backdrop and links close it).
 * - Scroll spy: the sidebar and top bar follow the section in view.
 * - All feedback goes through one polite live region (the toast).
 *
 * Theme, text direction and the account dropdown use the shared hooks in main.js.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "portal-state";
  const DESKTOP_QUERY = "(min-width: 64rem)";
  const MAX_ACTIVITY = 25;

  /* ---- Course content --------------------------------------------------- */
  /* Learning focus only: no durations, prices, prerequisites or outcomes. */

  const LEVELS = [
    {
      id: "beginner",
      name: "Beginner",
      focus: "Warm-up and listening games, “yes, and”, and simple two-person scenes.",
      guidance: "Start here. No experience needed.",
      milestones: [
        ["Warm-up and listening games", "Get loose and learn to really hear your scene partner."],
        ["Saying “yes, and”", "Accept an offer and build on it."],
        ["Simple two-person scenes", "Start a scene with nothing prepared."],
        ["Characters", "Find a clear point of view and commit to it."],
        ["Group games", "Play as an ensemble, not as a solo act."],
        ["Class showcase", "Take your scenes in front of a live audience."],
      ],
    },
    {
      id: "intermediate",
      name: "Intermediate",
      focus: "Scene work, characters with a point of view, and working with notes.",
      guidance: "A natural next step after Beginner.",
      milestones: [
        ["Scene work", "Build scenes with a clear who, what and where."],
        ["Characters with a point of view", "Play characters truthfully, even absurd ones."],
        ["Working with notes", "Take a note, then try the scene again."],
        ["Group scenes", "Keep a scene clear with more people on stage."],
        ["Introduction to long-form", "Connect scenes into a longer piece."],
        ["Class showcase", "Perform your work for a live audience."],
      ],
    },
    {
      id: "advanced",
      name: "Advanced",
      focus: "Long-form, ensemble work, and writing original sketches for an audience.",
      guidance: "For performers ready to go beyond the basics.",
      milestones: [
        ["Long-form formats", "Sustain a full set built from one suggestion."],
        ["Ensemble work", "Support the group and edit scenes with purpose."],
        ["Writing sketches", "Turn a funny idea into a script."],
        ["Rewriting and table reads", "Read it aloud, then rewrite until it works."],
        ["Rehearsing original material", "Get a sketch ready for an audience."],
        ["Showcase set", "Perform original material live."],
      ],
    },
  ];

  /* General participation options; no dates or venues are confirmed here. */
  const OPPORTUNITIES = [
    {
      id: "class-showcase",
      label: "Every term",
      title: "End-of-term class showcase",
      text: "Perform with your class for friends, family and anyone curious.",
      withClass: true,
    },
    {
      id: "improv-sets",
      label: "Improvised",
      title: "Improvised sets",
      text: "Scenes made up on the spot from audience suggestions.",
    },
    {
      id: "sketch-revues",
      label: "Written in class",
      title: "Sketch revues",
      text: "Original sketches, rehearsed and performed live.",
    },
  ];

  const CHECK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  const levelById = (id) => LEVELS.find((level) => level.id === id);
  const opportunityById = (id) => OPPORTUNITIES.find((item) => item.id === id);

  /* ---- State ------------------------------------------------------------- */

  const storage = {
    get() {
      try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      } catch (error) {
        return null;
      }
    },
    set(value) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch (error) {
        /* Changes still apply for this visit. */
      }
    },
  };

  function defaultState() {
    return {
      name: "",
      currentLevel: "beginner",
      enrolled: ["beginner"],
      progress: { beginner: 0, intermediate: 0, advanced: 0 },
      showcase: [],
      activity: [],
    };
  }

  // Accepts only known ids and in-range values, so stale or edited storage cannot break the views.
  function loadState() {
    const saved = storage.get();
    const state = defaultState();
    if (!saved || typeof saved !== "object") return state;

    if (typeof saved.name === "string") state.name = saved.name.slice(0, 40);
    if (Array.isArray(saved.enrolled)) {
      const enrolled = saved.enrolled.filter((id, index, list) => levelById(id) && list.indexOf(id) === index);
      if (enrolled.length) state.enrolled = enrolled;
    }
    state.currentLevel = state.enrolled.includes(saved.currentLevel) ? saved.currentLevel : state.enrolled[0];
    LEVELS.forEach((level) => {
      const done = Number(saved.progress && saved.progress[level.id]);
      if (Number.isInteger(done)) state.progress[level.id] = Math.min(Math.max(done, 0), level.milestones.length);
    });
    if (Array.isArray(saved.showcase)) {
      state.showcase = saved.showcase.filter((id, index, list) => opportunityById(id) && list.indexOf(id) === index);
    }
    if (Array.isArray(saved.activity)) {
      state.activity = saved.activity
        .filter((entry) => entry && typeof entry.text === "string" && Number.isFinite(entry.at))
        .slice(0, MAX_ACTIVITY);
    }
    return state;
  }

  const state = loadState();
  let viewLevel = state.currentLevel; // level shown in Course progress
  const openDetails = new Set(); // levels with "View level details" expanded

  const doneIn = (id) => state.progress[id];
  const totalIn = (id) => levelById(id).milestones.length;
  const percentIn = (id) => Math.round((doneIn(id) / totalIn(id)) * 100);
  const stepOf = (id) => LEVELS.findIndex((level) => level.id === id) + 1;
  const firstName = () => state.name.trim().split(/\s+/)[0] || "";

  function log(text) {
    state.activity.unshift({ text, at: Date.now() });
    state.activity.length = Math.min(state.activity.length, MAX_ACTIVITY);
  }

  /* ---- DOM helpers ------------------------------------------------------- */

  const $ = (selector) => document.querySelector(selector);

  // Creates an element; strings become text nodes, so user input is never parsed as HTML.
  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === false || value === null || value === undefined) return;
      if (key === "class") node.className = value;
      else if (key === "html") node.innerHTML = value; // only for the static check icon
      else node.setAttribute(key, value === true ? "" : value);
    });
    children.flat().forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  // replaceChildren() would print false/null as text, so conditional children are dropped first.
  function fill(node, ...children) {
    node.replaceChildren(...children.flat().filter((child) => child !== false && child !== null && child !== undefined));
  }

  function progressBar(id, large) {
    const pct = percentIn(id);
    const fill = h("span", { class: "progress-fill" });
    fill.style.width = pct + "%";
    return h(
      "span",
      {
        class: "progress-track" + (large ? " progress-track-lg" : ""),
        role: "progressbar",
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(pct),
        "aria-label": levelById(id).name + " progress",
      },
      fill
    );
  }

  /* ---- Feedback ------------------------------------------------------------ */

  const toastEl = $("[data-toast]");
  let toastTimer;

  function toast(message) {
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.hidden = false;
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 5000);
  }

  /* ---- Rendering --------------------------------------------------------- */

  const avatarEl = $("[data-avatar]");
  const avatarIcon = avatarEl.innerHTML;
  const timeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

  function nextLevelAfter(id) {
    return LEVELS[stepOf(id)] || null;
  }

  function renderOverview() {
    const id = state.currentLevel;
    const level = levelById(id);
    const done = doneIn(id);
    const total = totalIn(id);
    const complete = done === total;
    const next = nextLevelAfter(id);

    $("[data-greeting]").textContent = firstName() ? `Welcome back, ${firstName()}!` : "Welcome back!";
    $("[data-overview-line]").textContent = complete
      ? `Every milestone in ${level.name} is marked complete. Ready for what’s next?`
      : `Pick up where you left off. Next milestone: ${level.milestones[done][0]}.`;

    const action = $("[data-next-action]");
    const label = $("[data-next-action-label]");
    if (!complete) {
      action.setAttribute("href", "#progress");
      label.textContent = "Continue learning";
    } else if (next && !state.enrolled.includes(next.id)) {
      action.setAttribute("href", "#levels");
      label.textContent = `Explore ${next.name}`;
    } else {
      action.setAttribute("href", "#showcase");
      label.textContent = "See showcase options";
    }

    $('[data-stat="level"]').textContent = level.name;
    $('[data-stat="level-note"]').textContent = `Level ${stepOf(id)} of ${LEVELS.length}`;
    $('[data-stat="percent"]').textContent = percentIn(id) + "%";
    $('[data-stat="bar"]').style.width = percentIn(id) + "%";
    $('[data-stat="milestones"]').textContent = `${done} of ${total}`;
    $('[data-stat="next"]').textContent = complete ? "All milestones complete" : level.milestones[done][0];
    const shows = state.showcase.length;
    $('[data-stat="showcase-note"]').textContent = shows
      ? `Showcase interest: ${shows} registered`
      : "No showcase registrations yet";
  }

  function renderTopbar() {
    const name = firstName();
    $("[data-topbar-greeting]").textContent = name ? `Hi, ${name}` : "Hi there";
    $("[data-profile-name]").textContent = state.name.trim() || "Student account";
    const initials = state.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("");
    if (initials) avatarEl.textContent = initials;
    else avatarEl.innerHTML = avatarIcon;
  }

  function renderCurrentClass() {
    const id = state.currentLevel;
    const level = levelById(id);
    const done = doneIn(id);
    const total = totalIn(id);

    const panel = $("[data-current-class]");
    fill(panel,
      h(
        "figure",
        { class: "hidden sm:block" }, // phones go straight to the class details
        h("img", {
          class: "aspect-[4/3] w-full rounded-sm object-cover",
          src: "assets/images/classes-improv-beginner.jpg",
          width: "1280",
          height: "720",
          alt: "Adults in a rehearsal room playing an improv game.",
          loading: "lazy",
          decoding: "async",
        })
      ),
      h(
        "div",
        { class: "grid gap-3" },
        h("span", { class: "chip chip-current" }, "Current level"),
        h("h3", { class: "app-h2" }, level.name),
        h("p", { class: "text-fg-soft" }, level.focus),
        h(
          "div",
          { class: "grid gap-2" },
          h(
            "div",
            { class: "flex items-baseline justify-between gap-3 text-meta" },
            h("span", { class: "text-fg-soft" }, `${done} of ${total} milestones`),
            h("span", { class: "font-heading font-bold" }, percentIn(id) + "%")
          ),
          progressBar(id)
        ),
        h(
          "p",
          { class: "text-[0.9375rem]" },
          h("span", { class: "text-fg-muted" }, done === total ? "Status: " : "Next: "),
          h("span", { class: "font-semibold" }, done === total ? "All milestones complete" : level.milestones[done][0])
        ),
        h(
          "div",
          { class: "mt-1 flex flex-wrap gap-2" },
          h("a", { class: "btn btn-primary btn-sm", href: "#progress", "data-action": "continue", "data-level": id }, "Continue learning"),
          h("button", { class: "btn btn-outline btn-sm", type: "button", "data-action": "open-details", "data-level": id }, "View level details")
        )
      )
    );

    // Other enrolled levels, with a quick switch.
    const others = state.enrolled.filter((other) => other !== id);
    const wrap = $("[data-other-classes]");
    if (!others.length) {
      fill(wrap);
      return;
    }
    fill(wrap,
      h("h3", { class: "stat-label mb-1" }, "Also enrolled"),
      h(
        "ul",
        { class: "account-summary" },
        others.map((other) =>
          h(
            "li",
            { class: "flex flex-wrap items-center justify-between gap-3 border-b border-line py-3" },
            h(
              "span",
              { class: "flex items-center gap-3" },
              h("span", { class: "font-heading font-semibold" }, levelById(other).name),
              h("span", { class: "text-meta text-fg-muted" }, `${percentIn(other)}% complete`)
            ),
            h("button", { class: "btn btn-ghost btn-sm", type: "button", "data-action": "make-current", "data-level": other }, "Make current level")
          )
        )
      )
    );
  }

  function renderLevels() {
    const list = $("[data-levels]");
    fill(list,
      ...LEVELS.map((level, index) => {
        const enrolled = state.enrolled.includes(level.id);
        const current = state.currentLevel === level.id;
        const stateName = current ? "current" : enrolled ? "enrolled" : "available";
        const detailsId = `level-details-${level.id}`;
        const open = openDetails.has(level.id);

        let primary;
        if (current) {
          primary = h("a", { class: "btn btn-secondary btn-sm", href: "#progress", "data-action": "continue", "data-level": level.id }, "Continue learning");
        } else if (enrolled) {
          primary = h("button", { class: "btn btn-secondary btn-sm", type: "button", "data-action": "make-current", "data-level": level.id }, "Make current level");
        } else {
          primary = h("button", { class: "btn btn-primary btn-sm", type: "button", "data-action": "enroll", "data-level": level.id }, "Enroll in this level");
        }

        return h(
          "li",
          { class: "level-step", "data-state": stateName, id: `level-${level.id}` },
          h("span", { class: "level-marker", "aria-hidden": "true" }, String(index + 1)),
          h(
            "div",
            { class: "flex flex-wrap items-center gap-x-3 gap-y-1.5" },
            h("h3", { class: "app-h3" }, level.name),
            h(
              "span",
              { class: "chip" + (current ? " chip-current" : enrolled ? " chip-done" : "") },
              current ? "Current level" : enrolled ? "Enrolled" : "Not enrolled"
            )
          ),
          h("p", { class: "text-[0.9375rem] text-fg-soft" }, level.focus),
          h("p", { class: "text-meta text-fg-muted" }, level.guidance),
          h(
            "div",
            { class: "mt-1 flex flex-wrap items-center gap-x-4 gap-y-1" },
            primary,
            h(
              "button",
              { class: "text-link text-[0.9375rem]", type: "button", "aria-expanded": String(open), "aria-controls": detailsId, "data-action": "toggle-details", "data-level": level.id },
              open ? "Hide details" : "View level details"
            )
          ),
          h(
            "ul",
            { class: "level-details", id: detailsId, hidden: !open, "aria-label": `${level.name} milestones` },
            level.milestones.map(([title]) => h("li", {}, title))
          )
        );
      })
    );
  }

  function renderProgress() {
    if (!state.enrolled.includes(viewLevel)) viewLevel = state.currentLevel;
    const id = viewLevel;
    const level = levelById(id);
    const done = doneIn(id);
    const total = totalIn(id);
    const complete = done === total;

    // Level picker, only when there is more than one enrolled level.
    const switcher = $("[data-progress-switch]");
    switcher.hidden = state.enrolled.length < 2;
    fill(switcher,
      ...LEVELS.filter((item) => state.enrolled.includes(item.id)).map((item) =>
        h("button", { type: "button", "aria-pressed": String(item.id === id), "data-action": "view-level", "data-level": item.id }, item.name)
      )
    );

    let nextStep;
    if (!complete) {
      const [title, detail] = level.milestones[done];
      nextStep = h(
        "div",
        { class: "next-step" },
        h("p", { class: "stat-label" }, "Next milestone"),
        h("p", { class: "app-h3" }, title),
        h("p", { class: "text-[0.9375rem] text-fg-soft" }, detail),
        h(
          "div",
          { class: "flex flex-wrap gap-2" },
          h("button", { class: "btn btn-primary btn-sm", type: "button", "data-action": "complete", "data-level": id }, "Mark as complete"),
          done > 0 && h("button", { class: "btn btn-ghost btn-sm", type: "button", "data-action": "undo", "data-level": id }, "Undo last")
        )
      );
    } else {
      const next = nextLevelAfter(id);
      nextStep = h(
        "div",
        { class: "next-step" },
        h("p", { class: "stat-label" }, "Level complete"),
        h("p", { class: "app-h3" }, `Every ${level.name} milestone is marked complete.`),
        h(
          "div",
          { class: "flex flex-wrap gap-2" },
          next && !state.enrolled.includes(next.id)
            ? h("a", { class: "btn btn-primary btn-sm", href: "#levels" }, `Explore ${next.name}`)
            : h("a", { class: "btn btn-primary btn-sm", href: "#showcase" }, "See showcase options"),
          h("button", { class: "btn btn-ghost btn-sm", type: "button", "data-action": "undo", "data-level": id }, "Undo last")
        )
      );
    }

    fill($("[data-progress-summary]"),
      h(
        "div",
        { class: "flex flex-wrap items-center gap-3" },
        h("h3", { class: "app-h3" }, level.name),
        h("span", { class: "chip" + (id === state.currentLevel ? " chip-current" : "") }, id === state.currentLevel ? "Current level" : `Level ${stepOf(id)} of ${LEVELS.length}`)
      ),
      h("p", { class: "progress-percent" }, percentIn(id) + "%"),
      progressBar(id, true),
      h("p", { class: "text-fg-soft" }, `${done} of ${total} milestones complete`),
      nextStep,
      id !== state.currentLevel &&
        h("button", { class: "btn btn-outline btn-sm w-fit", type: "button", "data-action": "make-current", "data-level": id }, "Make this my current level")
    );

    fill($("[data-milestones]"),
      ...level.milestones.map(([title, detail], index) => {
        const status = index < done ? "done" : index === done ? "current" : "upcoming";
        const statusText = { done: "Completed", current: "Next up", upcoming: "Upcoming" }[status];
        return h(
          "li",
          { class: "milestone", "data-state": status, "aria-current": status === "current" ? "step" : false },
          h("span", { class: "milestone-marker", "aria-hidden": "true", html: status === "done" ? CHECK_ICON : false }, status === "done" ? null : String(index + 1)),
          h(
            "div",
            { class: "milestone-body" },
            h(
              "div",
              { class: "flex flex-wrap items-center gap-x-3 gap-y-1" },
              h("p", { class: "milestone-title font-heading font-semibold" }, title),
              h("span", { class: "chip" + (status === "done" ? " chip-done" : status === "current" ? " chip-current" : "") }, statusText)
            ),
            h("p", { class: "text-[0.9375rem] text-fg-soft" }, detail)
          )
        );
      })
    );
  }

  function renderShowcase() {
    fill($("[data-opportunities]"),
      ...OPPORTUNITIES.map((item) => {
        const registered = state.showcase.includes(item.id);
        const meta = item.withClass ? `Date to be announced · With your ${levelById(state.currentLevel).name} class` : "Date to be announced";
        return h(
          "li",
          { class: "opportunity" },
          h(
            "div",
            { class: "grid gap-1.5" },
            h("p", { class: "label text-accent-text" }, item.label),
            h("h3", { class: "app-h3" }, item.title),
            h("p", { class: "text-[0.9375rem] text-fg-soft" }, item.text),
            h("p", { class: "text-meta text-fg-muted" }, meta)
          ),
          h(
            "div",
            { class: "flex flex-wrap items-center gap-3 sm:justify-end" },
            registered && h("span", { class: "chip chip-done" }, "Interest registered"),
            h(
              "button",
              {
                class: "btn btn-sm " + (registered ? "btn-outline" : "btn-primary"),
                type: "button",
                "data-action": "showcase",
                "data-opportunity": item.id,
                "aria-label": `${registered ? "Withdraw interest in" : "Register interest in"} ${item.title}`,
              },
              registered ? "Withdraw" : "Register interest"
            )
          )
        );
      })
    );
  }

  function renderActivity() {
    const list = $("[data-activity-list]");
    const empty = !state.activity.length;
    $("[data-activity-empty]").hidden = !empty;
    $("[data-clear-activity]").hidden = empty;
    list.hidden = empty;
    fill(list,
      ...state.activity.map((entry) => {
        const date = new Date(entry.at);
        const seconds = (Date.now() - entry.at) / 1000;
        return h(
          "li",
          { class: "activity-item" },
          h("p", { class: "text-[0.9375rem]" }, entry.text),
          h("time", { class: "activity-time", datetime: date.toISOString() }, seconds < 60 ? "Just now" : timeFormat.format(date))
        );
      })
    );
  }

  function renderAccount() {
    const input = $("#display-name");
    if (document.activeElement !== input) input.value = state.name;

    const milestonesDone = state.enrolled.reduce((sum, id) => sum + doneIn(id), 0);
    const rows = [
      ["Current level", levelById(state.currentLevel).name],
      ["Enrolled levels", LEVELS.filter((level) => state.enrolled.includes(level.id)).map((level) => level.name).join(", ")],
      ["Milestones completed", String(milestonesDone)],
      ["Showcase interest", state.showcase.length ? `${state.showcase.length} registered` : "None"],
    ];
    fill($("[data-account-summary]"), ...rows.map(([term, value]) => h("div", {}, h("dt", {}, term), h("dd", {}, value))));
  }

  function render() {
    renderOverview();
    renderTopbar();
    renderCurrentClass();
    renderLevels();
    renderProgress();
    renderShowcase();
    renderActivity();
    renderAccount();
  }

  function commit() {
    storage.set(state);
    render();
  }

  /* ---- Actions ----------------------------------------------------------- */

  const actions = {
    enroll(id) {
      const level = levelById(id);
      if (state.enrolled.includes(id)) {
        toast(`You’re already enrolled in ${level.name}.`);
        return;
      }
      state.enrolled.push(id);
      state.currentLevel = id;
      viewLevel = id;
      log(`Enrolled in ${level.name}`);
      commit();
      toast(`You’re enrolled in ${level.name}. It’s now your current level.`);
    },

    "make-current"(id) {
      if (!state.enrolled.includes(id) || state.currentLevel === id) return;
      state.currentLevel = id;
      viewLevel = id;
      log(`Switched current level to ${levelById(id).name}`);
      commit();
      toast(`${levelById(id).name} is now your current level.`);
    },

    continue(id) {
      viewLevel = id;
      renderProgress();
    },

    "view-level"(id) {
      viewLevel = id;
      renderProgress();
    },

    "toggle-details"(id) {
      if (openDetails.has(id)) openDetails.delete(id);
      else openDetails.add(id);
      renderLevels();
      $(`[data-action="toggle-details"][data-level="${id}"]`).focus();
    },

    "open-details"(id) {
      openDetails.add(id);
      renderLevels();
      const step = document.getElementById(`level-${id}`);
      step.scrollIntoView({ block: "start" });
      step.querySelector('[data-action="toggle-details"]').focus({ preventScroll: true });
    },

    complete(id) {
      const level = levelById(id);
      const done = doneIn(id);
      if (done >= totalIn(id)) return;
      state.progress[id] = done + 1;
      log(`Completed milestone: ${level.milestones[done][0]} (${level.name})`);
      commit();
      toast(
        state.progress[id] === totalIn(id)
          ? `Every ${level.name} milestone is marked complete.`
          : `Milestone complete. ${level.name} is now ${percentIn(id)}% done.`
      );
      $(`[data-milestones] .milestone:nth-child(${Math.min(state.progress[id] + 1, totalIn(id))})`).scrollIntoView({ block: "nearest" });
    },

    undo(id) {
      const level = levelById(id);
      const done = doneIn(id);
      if (done <= 0) return;
      state.progress[id] = done - 1;
      log(`Reopened milestone: ${level.milestones[done - 1][0]} (${level.name})`);
      commit();
      toast(`${level.milestones[done - 1][0]} is no longer marked complete.`);
    },

    showcase(id) {
      const item = opportunityById(id);
      if (state.showcase.includes(id)) {
        state.showcase = state.showcase.filter((other) => other !== id);
        log(`Withdrew interest in ${item.title}`);
        commit();
        toast(`Interest in ${item.title} withdrawn.`);
      } else {
        state.showcase.push(id);
        log(`Registered interest in ${item.title}`);
        commit();
        toast(`Interest registered for ${item.title}. Dates are confirmed on the Shows page.`);
      }
      // Re-rendering replaced the button; keep keyboard focus on its replacement.
      $(`[data-action="showcase"][data-opportunity="${id}"]`).focus();
    },
  };

  function initActions() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-action]");
      if (!trigger) return;
      const handler = actions[trigger.getAttribute("data-action")];
      if (!handler) return;
      // Links (Continue learning) still follow their href; buttons do not navigate.
      handler(trigger.getAttribute("data-level") || trigger.getAttribute("data-opportunity"));
    });

    $("[data-clear-activity]").addEventListener("click", () => {
      state.activity = [];
      commit();
      toast("Activity cleared.");
      $("#activity-title").focus({ preventScroll: true });
    });
  }

  /* ---- Account form ------------------------------------------------------ */

  const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

  function initAccountForm() {
    const form = $("[data-account-form]");
    const input = $("#display-name");
    const error = $("[data-name-error]");

    function showError(message) {
      error.textContent = message;
      error.hidden = !message;
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }

    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid")) showError("");
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = input.value.trim().replace(/\s+/g, " ");
      if (value.length < 2) return showError("Enter at least 2 characters."), input.focus();
      if (value.length > 40) return showError("Use 40 characters or fewer."), input.focus();
      if (!NAME_PATTERN.test(value)) return showError("Use letters, spaces, hyphens or apostrophes."), input.focus();
      showError("");
      if (value === state.name) {
        toast("Your display name is unchanged.");
        return;
      }
      state.name = value;
      log("Updated your display name");
      input.blur();
      commit();
      toast("Display name saved.");
    });
  }

  /* ---- Sidebar drawer ------------------------------------------------------ */

  function initDrawer() {
    const root = document.documentElement;
    const sidebar = $("[data-sidebar]");
    const toggle = $("[data-sidebar-toggle]");
    const close = $("[data-sidebar-close]");
    const backdrop = $("[data-sidebar-backdrop]");
    const column = $(".app-column");
    const desktop = window.matchMedia(DESKTOP_QUERY);

    const isOpen = () => sidebar.getAttribute("data-open") === "true";

    function setOpen(open, options = {}) {
      sidebar.setAttribute("data-open", String(open));
      backdrop.setAttribute("data-open", String(open));
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      root.classList.toggle("drawer-open", open);
      column.inert = open;
      if (open) sidebar.querySelector(".app-nav-link").focus();
      else if (options.returnFocus) toggle.focus();
    }

    toggle.addEventListener("click", () => setOpen(!isOpen()));
    close.addEventListener("click", () => setOpen(false, { returnFocus: true }));
    backdrop.addEventListener("click", () => setOpen(false, { returnFocus: true }));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen() && !desktop.matches) setOpen(false, { returnFocus: true });
    });

    sidebar.addEventListener("click", (event) => {
      if (!desktop.matches && isOpen() && event.target.closest("a")) setOpen(false);
    });

    // The sidebar is a plain column on desktop: never leave the page inert there.
    desktop.addEventListener("change", () => {
      if (isOpen()) setOpen(false);
    });
  }

  /* ---- Scroll spy ---------------------------------------------------------- */

  function initScrollSpy() {
    const links = [...document.querySelectorAll("[data-nav-target]")];
    const targets = links.map((link) => document.getElementById(link.getAttribute("data-nav-target")));
    const title = $("[data-topbar-title]");
    let ticking = false;

    function setActive(id) {
      links.forEach((link) => {
        if (link.getAttribute("data-nav-target") === id) {
          link.setAttribute("aria-current", "location");
          title.textContent = link.textContent.trim();
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    // The last section whose top has passed the line just below the top bar is active.
    function update() {
      ticking = false;
      const line = $(".app-topbar").offsetHeight + 24;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let active = targets[0];
      targets.forEach((target) => {
        if (target.getBoundingClientRect().top <= line) active = target;
      });
      setActive(atBottom ? targets[targets.length - 1].id : active.id);
    }

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", update);
    update();
  }

  render();
  initActions();
  initAccountForm();
  initDrawer();
  initScrollSpy();
})();
