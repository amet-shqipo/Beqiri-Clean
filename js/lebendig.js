/* =============================================
   BEQIRI CLEAN – LEBENDIG.JS
   Gestaffeltes Einblenden der Karten und
   hochzählende Zahlen in der Statistik-Leiste.
   ============================================= */
(function () {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Karten einer Reihe kommen nacheinander statt alle gleichzeitig
    const groups = [".services-grid", ".pain-grid", ".benefits-grid", ".solution-steps", ".steps-row", ".cities-grid"];
    const cards = ".service-card, .pain-card, .benefit-card, .solution-step, .step-item, .city-card";
    if (!reduced) {
        groups.forEach((sel) => {
            document.querySelectorAll(sel).forEach((group) => {
                Array.from(group.querySelectorAll(cards)).forEach((card, i) => {
                    card.style.setProperty("--stagger", (i * 0.09).toFixed(2) + "s");
                });
            });
        });
        // Nach dem Einblenden die Verzögerung entfernen, sonst reagiert Hover träge
        const clear = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                setTimeout(() => e.target.style.removeProperty("--stagger"), 1500);
                clear.unobserve(e.target);
            });
        }, { threshold: 0.1 });
        document.querySelectorAll(cards).forEach((card) => clear.observe(card));
    }

    // Städte-Hero: fester „Angebot anfordern“-Button erst nach dem Hero
    // (der Hero hat seinen eigenen Button; CSS blendet über body.is-over-hero aus).
    // Die Kopfzeile ist über dem Hero durchsichtig (Handy/Tablet, siehe lebendig.css).
    const splitHero = document.querySelector(".hero-split");
    const header = document.getElementById("main-header");
    if (splitHero) {
        const updateCta = () => {
            const over = splitHero.getBoundingClientRect().bottom > 80;
            document.body.classList.toggle("is-over-hero", over);
            if (header) header.classList.toggle("is-over-hero", over);
        };
        window.addEventListener("scroll", updateCta, { passive: true });
        window.addEventListener("resize", updateCta);
        updateCta();
    }

    // Zahlen zählen hoch, sobald die Leiste sichtbar wird (z. B. „24h“, „100%“)
    const nums = document.querySelectorAll(".stat-num");
    if (reduced || !nums.length) return;
    const count = (el) => {
        const m = el.textContent.trim().match(/^(\d+)(.*)$/);
        if (!m) return;
        const target = parseInt(m[1], 10);
        const suffix = m[2];
        const ms = 1400;
        const start = performance.now();
        const frame = (now) => {
            const k = Math.min(1, (now - start) / ms);
            const ease = 1 - Math.pow(1 - k, 3);
            el.textContent = Math.round(target * ease) + suffix;
            if (k < 1) requestAnimationFrame(frame);
        };
        el.textContent = "0" + suffix;
        requestAnimationFrame(frame);
    };
    const numObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            count(e.target);
            numObs.unobserve(e.target);
        });
    }, { threshold: 0.6 });
    nums.forEach((el) => numObs.observe(el));
})();
