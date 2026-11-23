(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const hasG = typeof gsap !== "undefined";
  if (hasG && typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduce && typeof Lenis !== "undefined") {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    if (hasG) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const t = $(a.getAttribute("href"));
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -80 }); }
    }));
  }

  /* ---------- Header ---------- */
  const head = $("#head");
  const darkSecs = $$("[data-dark]");
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    const hh = head.offsetHeight;
    // which section is under the header?
    const overDark = darkSecs.some((s) => { const r = s.getBoundingClientRect(); return r.top <= hh * 0.5 && r.bottom >= hh * 0.5; });
    const firstDark = darkSecs[0] && darkSecs[0].getBoundingClientRect().top <= 1;
    head.classList.toggle("is-dark", overDark);
    head.classList.toggle("is-solid", y > 40 && !overDark);
    if (!document.body.classList.contains("menu-open") && !head.classList.contains("mega-open")) {
      head.classList.toggle("is-hidden", y > lastY && y > hh * 3);
    }
    lastY = y;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mega menu ---------- */
  const mega = $("#mega"), megaBtn = $("#megaBtn"), scrim = $("#scrim");
  if (mega && megaBtn) {
    let closeT;
    const open = () => { clearTimeout(closeT); mega.classList.add("is-open"); scrim.classList.add("is-on"); head.classList.add("mega-open"); megaBtn.setAttribute("aria-expanded", "true"); };
    const close = () => { mega.classList.remove("is-open"); scrim.classList.remove("is-on"); head.classList.remove("mega-open"); megaBtn.setAttribute("aria-expanded", "false"); };
    const later = () => { closeT = setTimeout(close, 180); };
    megaBtn.addEventListener("click", () => (mega.classList.contains("is-open") ? close() : open()));
    if (fine) {
      megaBtn.addEventListener("mouseenter", open);
      megaBtn.addEventListener("mouseleave", later);
      mega.addEventListener("mouseenter", () => clearTimeout(closeT));
      mega.addEventListener("mouseleave", later);
    }
    scrim.addEventListener("click", close);
    addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    const imgs = $$(".mega__media img", mega), items = $$(".mega__item", mega);
    items.forEach((it) => it.addEventListener("mouseenter", () => {
      items.forEach((x) => x.classList.toggle("is-active", x === it));
      imgs.forEach((im, i) => im.classList.toggle("is-active", i === +it.dataset.i));
    }));
  }

  /* ---------- Mobile menu ---------- */
  const burger = $("#burger");
  burger && burger.addEventListener("click", () => {
    const on = document.body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", on);
    head.classList.remove("is-hidden");
    if (lenis) on ? lenis.stop() : lenis.start();
  });

  /* ---------- Hero pulse line ---------- */
  const pulse = $("#pulse");
  let sparkTween;
  const drawPulse = () => {
    if (!pulse) return;
    const svg = $("svg", pulse), w = pulse.clientWidth, h = pulse.clientHeight, mid = h / 2;
    const amp = h * 0.42, x = w * 0.6, u = Math.max(18, h * 0.32);
    const d = `M0 ${mid}H${x}L${x + u} ${mid + amp}L${x + u * 2.5} ${mid - amp}L${x + u * 3.4} ${mid}H${w}`;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    $$("path", svg).forEach((p) => p.setAttribute("d", d));
    return $(".base", svg).getTotalLength();
  };

  /* ---------- Split helpers ---------- */
  const splitWords = (el, cls) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const s = document.createElement("span");
            s.className = cls;
            if (cls === "line-mask") { const inner = document.createElement("span"); inner.textContent = part; s.appendChild(inner); }
            else s.textContent = part;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    };
    walk(el);
  };

  /* ---------- Intro / loader ---------- */
  const start = () => {
    const len = drawPulse();
    if (!hasG || reduce) { $$(".loader").forEach((l) => l.remove()); return; }

    $$("[data-split]").forEach((el) => splitWords(el, "line-mask"));
    gsap.set("[data-split] .line-mask > span", { yPercent: 110 });

    const tl = gsap.timeline();
    const loader = $(".loader");
    if (loader && getComputedStyle(loader).display !== "none") {
      const lp = $("path", loader), ll = lp.getTotalLength();
      gsap.set(lp, { strokeDasharray: ll, strokeDashoffset: ll });
      tl.to(lp, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" })
        .to(loader, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, "+=0.1")
        .add(() => loader.remove());
      try { sessionStorage.setItem("amp-loaded", "1"); } catch (e) {}
    } else if (loader) loader.remove();

    tl.to("[data-split] .line-mask > span", { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.035 }, loader ? "-=0.45" : 0.05);

    if (pulse && len) {
      const base = $(".base", pulse), spark = $(".spark", pulse);
      gsap.set(base, { strokeDasharray: len, strokeDashoffset: len });
      gsap.set(spark, { strokeDasharray: `140 ${len}`, strokeDashoffset: 140, opacity: 0 });
      tl.to(base, { strokeDashoffset: 0, duration: 1.6, ease: "power3.inOut" }, "-=0.9")
        .add(() => {
          gsap.set(spark, { opacity: 1 });
          sparkTween = gsap.fromTo(spark, { strokeDashoffset: 140 }, { strokeDashoffset: -len, duration: 3.2, ease: "power1.inOut", repeat: -1, repeatDelay: 0.8 });
        });
    }
    setupScroll();
  };

  const setupScroll = () => {
    // Hero image expands to full bleed
    const hm = $("#heroMedia");
    if (hm) {
      const padPx = () => parseFloat(getComputedStyle($(".pad")).paddingLeft) || 20;
      gsap.fromTo(hm, { clipPath: () => `inset(0px ${padPx()}px 0px ${padPx()}px round 8px)` },
        { clipPath: "inset(0px 0px 0px 0px round 0px)", ease: "none", scrollTrigger: { trigger: hm, start: "top 85%", end: "top 15%", scrub: true, invalidateOnRefresh: true } });
      gsap.fromTo($("img", hm), { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1, ease: "none", scrollTrigger: { trigger: hm, start: "top bottom", end: "bottom top", scrub: true } });
    }

    // Reveal
    $$("[data-reveal]").forEach((el) => {
      const inView = el.getBoundingClientRect().top < innerHeight;
      gsap.fromTo(el, { y: 48, opacity: 0 }, inView
        ? { y: 0, opacity: 1, duration: 1.2, ease: "expo.out", delay: 0.5 }
        : { y: 0, opacity: 1, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 92%", once: true } });
    });

    // Statement word fill
    $$("[data-fill]").forEach((el) => {
      splitWords(el, "w");
      gsap.to($$(".w", el), { opacity: 1, ease: "none", stagger: 0.08, scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true } });
    });

    // Parallax images
    $$("[data-parallax]").forEach((img) => {
      const box = img.closest(".frame, .phero__bg, .cta__media") || img.parentElement;
      gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: "none", scrollTrigger: { trigger: box, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // Pulse icons draw
    $$(".q-item svg path").forEach((p) => {
      const l = p.getTotalLength();
      gsap.fromTo(p, { strokeDasharray: l, strokeDashoffset: l }, { strokeDashoffset: 0, duration: 1.6, ease: "power3.inOut", scrollTrigger: { trigger: p, start: "top 85%", once: true } });
    });

    // Marquee: constant drift + scroll velocity
    const mq = $("#marquee");
    if (mq) {
      const half = () => mq.scrollWidth / 2;
      let x = 0, v = 1;
      ScrollTrigger.create({ trigger: mq, start: "top bottom", end: "bottom top", onUpdate: (s) => { v = 1 + Math.min(6, Math.abs(s.getVelocity()) / 300); } });
      gsap.ticker.add(() => {
        x -= 0.9 * v; v += (1 - v) * 0.05;
        if (-x >= half()) x += half();
        mq.style.transform = `translate3d(${x}px,0,0)`;
      });
    }
    addEventListener("load", () => ScrollTrigger.refresh());
  };

  /* ---------- Services hover image ---------- */
  const list = $("#svcList"), ci = $("#cursorImg");
  if (list && ci && fine && hasG && !reduce) {
    const imgs = $$("img", ci);
    const xTo = gsap.quickTo(ci, "x", { duration: 0.6, ease: "power3" });
    const yTo = gsap.quickTo(ci, "y", { duration: 0.6, ease: "power3" });
    gsap.set(ci, { xPercent: -50, yPercent: -50, left: 0, top: 0, transform: "none" });
    list.addEventListener("mousemove", (e) => { xTo(e.clientX + 120); yTo(e.clientY); });
    $$(".svc-row", list).forEach((r) => r.addEventListener("mouseenter", () => imgs.forEach((im, i) => im.classList.toggle("is-active", i === +r.dataset.i))));
    list.addEventListener("mouseenter", (e) => { gsap.set(ci, { x: e.clientX + 120, y: e.clientY }); gsap.to(ci, { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out" }); });
    const hide = () => gsap.to(ci, { opacity: 0, scale: 0.85, duration: 0.4, overwrite: true });
    list.addEventListener("mouseleave", hide);
    addEventListener("scroll", () => { if (!list.matches(":hover")) hide(); }, { passive: true });
    gsap.set(ci, { scale: 0.85 });
  }

  /* ---------- Contact form (front-end demo) ---------- */
  const form = $("#form");
  form && form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    form.classList.add("is-sent");
    ScrollTrigger && ScrollTrigger.refresh();
  });

  let rT;
  addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { const l = drawPulse(); if (sparkTween && l) { sparkTween.kill(); const sp = $(".spark", pulse), b = $(".base", pulse); gsap.set(b, { strokeDasharray: "none", strokeDashoffset: 0 }); gsap.set(sp, { strokeDasharray: `140 ${l}` }); sparkTween = gsap.fromTo(sp, { strokeDashoffset: 140 }, { strokeDashoffset: -l, duration: 3.2, ease: "power1.inOut", repeat: -1, repeatDelay: 0.8 }); } }, 200); });

  const go = () => (document.fonts && document.fonts.ready ? document.fonts.ready.then(start) : start());
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
})();
