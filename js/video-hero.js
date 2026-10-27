/* =============================================
   BEQIRI CLEAN – VIDEO-HERO
   Blättern statt Spulen: jede Scroll-Geste springt
   genau einen Punkt weiter (Intro → Tisch → Fenster → Ende).
   Erst nach dem letzten Punkt scrollt die Seite normal weiter.
   ============================================= */
(function () {
    const hero = document.querySelector(".vhero");
    if (!hero) return;

    const video = hero.querySelector(".vhero-video");
    const cps = Array.from(hero.querySelectorAll(".vhero-cp"));
    const bar = hero.querySelector(".vhero-progress span");
    const hint = hero.querySelector(".vhero-hint");
    const header = document.getElementById("main-header");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const last = cps.length - 1;

    let duration = 0;
    let step = 0;
    let animating = false;

    // Metadaten können schon geladen sein, bevor dieses Script läuft
    const readDuration = () => { duration = video.duration || 0; };
    if (video.readyState >= 1) readDuration();
    video.addEventListener("loadedmetadata", readDuration);
    video.addEventListener("durationchange", readDuration);
    video.pause();

    // iOS/Safari erlaubt Spulen erst nach einer Interaktion
    const unlock = () => {
        const p = video.play();
        if (p && p.then) p.then(() => { if (!animating) video.pause(); }).catch(() => {});
        window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("touchstart", unlock, { passive: true });

    // Kopfzeile: über dem Video durchsichtig, danach langsam weiß
    const updateHeader = () => {
        const over = window.scrollY < hero.offsetHeight - 80;
        if (header) header.classList.toggle("is-over-hero", over);
        document.body.classList.toggle("is-over-hero", over);
    };
    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();

    if (reduced) return; // Standbild + Intro-Text, sonst nichts

    // Beim Neuladen nicht mitten auf der Seite landen, sondern beim Intro
    // (außer ein Link zielt direkt auf einen Abschnitt, z. B. #contact)
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (!location.hash) window.scrollTo(0, 0);

    function timeOf(i) {
        const t = cps[i].dataset.time;
        if (t === "end") return Math.max(0, duration - 0.05);
        return Math.min(parseFloat(t) || 0, Math.max(0, duration - 0.05));
    }

    const dots = Array.from(hero.querySelectorAll(".vhero-dot"));

    function showStep(i) {
        cps.forEach((cp, n) => cp.classList.toggle("is-active", n === i));
        dots.forEach((d, n) => {
            d.classList.toggle("is-active", n === i);
            d.setAttribute("aria-current", n === i ? "step" : "false");
        });
        if (hint) hint.classList.toggle("is-hidden", i > 0);
        if (bar) bar.style.width = (i / last * 100) + "%";
    }

    // Vorwärts läuft das Video in echter Geschwindigkeit (natürliche Bewegung),
    // rückwärts wird kurz zurückgespult
    const PLAY_RATE = 1;
    const BACK_MS = 900;
    // Der nächste Text blendet schon unterwegs ein (nach 40 % der Strecke),
    // damit der Bildschirm nicht lange leer ist
    const TEXT_AT = 0.4;

    function playTo(target, done, rate) {
        const dist = target - video.currentTime;
        rate = rate || PLAY_RATE;
        let stopped = false;
        const stop = () => {
            if (stopped) return;
            stopped = true;
            clearTimeout(guard);
            video.pause();
            done();
        };
        // Sicherheitsnetz: hängt das Video (z. B. langsames Netz), wird gesprungen
        const guard = setTimeout(() => { video.currentTime = target; stop(); },
            (dist / rate) * 1000 + 3000);
        const watch = () => {
            if (stopped) return;
            if (video.currentTime >= target - 0.04 || video.ended) stop();
            else requestAnimationFrame(watch);
        };
        video.playbackRate = rate;
        const p = video.play();
        if (p && p.then) {
            p.then(() => requestAnimationFrame(watch)).catch(() => {
                if (stopped) return;
                stopped = true;
                clearTimeout(guard);
                seekTo(target, done);
            });
        } else requestAnimationFrame(watch);
    }

    function seekTo(target, done) {
        const from = video.currentTime;
        const ms = BACK_MS;
        const start = performance.now();
        let seeking = false;
        const onSeeked = () => { seeking = false; };
        video.addEventListener("seeked", onSeeked);
        const frame = (now) => {
            const k = Math.min(1, (now - start) / ms);
            const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            if (!seeking) {
                seeking = true;
                video.currentTime = from + (target - from) * ease;
            }
            if (k < 1) requestAnimationFrame(frame);
            else {
                video.removeEventListener("seeked", onSeeked);
                video.currentTime = target;
                done();
            }
        };
        requestAnimationFrame(frame);
    }

    // Harte Sperre: solange der letzte Punkt nicht erreicht ist,
    // kann die Seite selbst gar nicht scrollen – das Hero sitzt fest.
    const root = document.documentElement;
    function updateLock() {
        root.classList.toggle("vhero-locked", atTop() && (animating || step < last));
    }

    function jumpToEnd() {
        step = last;
        if (duration) video.currentTime = timeOf(last);
        showStep(last);
        updateLock();
    }

    function go(i) {
        if (animating || i < 0 || i > last || i === step) return;
        // Sprung über mehrere Punkte (Klick auf einen Punkt) läuft entsprechend schneller
        const rate = PLAY_RATE * Math.abs(i - step);
        animating = true;
        step = i;
        updateLock();
        cps.forEach((cp) => cp.classList.remove("is-active"));
        if (hint) hint.classList.add("is-hidden");
        let textTimer = 0;
        const finish = () => {
            clearTimeout(textTimer);
            animating = false;
            showStep(step);
            updateLock();
        };
        if (!duration) { finish(); return; }
        const target = timeOf(i);
        const forward = target > video.currentTime;
        const ms = forward ? ((target - video.currentTime) / rate) * 1000 : BACK_MS;
        textTimer = setTimeout(() => showStep(step), ms * TEXT_AT);
        video.pause();
        if (forward) playTo(target, finish, rate);
        else seekTo(target, finish);
    }

    // Hero liegt ganz oben im Bild → Gesten werden zu Seiten-Sprüngen
    const atTop = () => window.scrollY <= 2;
    const wants = (dir) => atTop() && (dir > 0 ? step < last : step > 0);

    // Mausrad / Trackpad: eine Geste = ein Sprung.
    // Chrome entscheidet beim ERSTEN Wheel-Event einer Geste, ob die Seite
    // scrollt – danach lässt sich nichts mehr stoppen. Deshalb wird im Hero
    // jedes Event abgefangen, auch die winzigen ersten vom Trackpad.
    // Nachschwingen wird geschluckt, bis die Geste endet.
    let lastWheel = 0;
    let gestureUsed = false;
    let gestureBlocked = false;
    let acc = 0;
    window.addEventListener("wheel", (e) => {
        if (e.ctrlKey) return; // Pinch-Zoom
        const now = performance.now();
        if (now - lastWheel > 220) {
            // Neue Geste: im Hero oben? Dann gehört sie dem Hero,
            // außer man ist am Ende und will weiter nach unten.
            acc = 0;
            gestureUsed = false;
            gestureBlocked = atTop() && (animating || step < last || e.deltaY < 0);
        }
        lastWheel = now;
        if (!gestureBlocked) return;

        e.preventDefault();
        if (gestureUsed || animating) return;
        acc += e.deltaY;
        if (Math.abs(acc) < 12) return;
        const dir = acc > 0 ? 1 : -1;
        gestureUsed = true;
        if (wants(dir)) go(step + dir);
    }, { passive: false });

    // Touch: ein Wisch = ein Sprung
    let touchY = null;
    let touchUsed = false;
    window.addEventListener("touchstart", (e) => {
        touchY = e.touches[0].clientY;
        touchUsed = !atTop();
    }, { passive: true });
    window.addEventListener("touchmove", (e) => {
        if (touchY === null) return;
        const dy = touchY - e.touches[0].clientY;
        const dir = dy > 0 ? 1 : -1;
        if (animating || touchUsed) {
            if (atTop()) e.preventDefault();
            return;
        }
        if (!wants(dir)) return;
        e.preventDefault();
        if (Math.abs(dy) > 30) {
            touchUsed = true;
            go(step + dir);
        }
    }, { passive: false });
    window.addEventListener("touchend", () => { touchY = null; }, { passive: true });

    // Tastatur
    window.addEventListener("keydown", (e) => {
        if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
        let dir = 0;
        if (["ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && !e.shiftKey)) dir = 1;
        if (["ArrowUp", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey)) dir = -1;
        if (!dir) return;
        if (animating && atTop()) { e.preventDefault(); return; }
        if (wants(dir)) { e.preventDefault(); go(step + dir); }
    });

    // Wer am Hero vorbei ist (z. B. per „Intro überspringen“), findet
    // beim Zurückscrollen den letzten Punkt vor und blättert von dort zurück
    window.addEventListener("scroll", () => {
        if (animating || step === last) return;
        if (window.scrollY > hero.offsetHeight * 0.5) jumpToEnd();
    }, { passive: true });

    // Punkte rechts: direkt zu einem Abschnitt des Videos springen
    dots.forEach((d, n) => d.addEventListener("click", () => go(n)));

    // Links auf Abschnitte (Menü, „Intro überspringen“, Buttons) heben die Sperre auf
    document.addEventListener("click", (e) => {
        const a = e.target.closest && e.target.closest('a[href^="#"]');
        if (a && a.getAttribute("href").length > 1 && !animating) jumpToEnd();
    });

    showStep(0);
    updateLock();
})();
