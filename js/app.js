document.addEventListener("DOMContentLoaded", function() {

    // Burger Menu + Overlay
    const hamMenu = document.querySelector(".ham-menu");
    const offScreenMenu = document.querySelector(".off-screen-menu");
    const overlay = document.querySelector(".overlay");

    hamMenu.addEventListener("click", () => {
        hamMenu.classList.toggle("active");
        offScreenMenu.classList.toggle("active");
        overlay.classList.toggle("active");
    });

    overlay.addEventListener("click", () => {
        hamMenu.classList.remove("active");
        offScreenMenu.classList.remove("active");
        overlay.classList.remove("active");
    });

    document.querySelectorAll(".off-screen-menu a").forEach(link => {
        link.addEventListener("click", () => {
            hamMenu.classList.remove("active");
            offScreenMenu.classList.remove("active");
            overlay.classList.remove("active");
        });
    });

    // Header scroll background
    const header = document.querySelector("header");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) header.classList.add("scrolled");
        else header.classList.remove("scrolled");
    });

    // Slide-in Animation für Services & Why Us
    const items = document.querySelectorAll('.service-item, .why-item');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    items.forEach(item => observer.observe(item));

});
