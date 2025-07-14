// Global variables
let scene, camera, renderer, particles;
let mouseX = 0, mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

// Global cursor-following stars variables
let cursorStars = [];
let cursorX = 0, cursorY = 0;
let targetCursorX = 0, targetCursorY = 0;

// Performance optimization variables
let isScrolling = false;
let scrollTimeout;
let animationPaused = false;
let lastFrameTime = 0;
const targetFPS = 60;
const frameInterval = 1000 / targetFPS;

// Throttle function for performance
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Initialize global cursor-following stars
function initGlobalStars() {
    // Check if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }
    
    const starsContainer = document.createElement('div');
    starsContainer.id = 'global-stars';
    starsContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        overflow: hidden;
    `;
    document.body.appendChild(starsContainer);

    // Reduce star count for better performance
    createCursorStarLayer(10, 'large', starsContainer); // Reduced from 20
    createCursorStarLayer(20, 'medium', starsContainer); // Reduced from 40
    createCursorStarLayer(30, 'small', starsContainer); // Reduced from 80
    createCursorStarLayer(40, 'tiny', starsContainer); // Reduced from 120

    // Add throttled global mouse move listener
    document.addEventListener('mousemove', throttle(onGlobalMouseMove, 16)); // ~60fps
    
    // Start animation loop
    animateGlobalStars();
}

function createCursorStarLayer(count, size, container) {
    const layer = {
        stars: [],
        size: size,
        speed: getSpeedForSize(size)
    };

    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = `cursor-star cursor-star-${size}`;
        
        const starSize = getStarSize(size);
        const opacity = getStarOpacity(size);
        
        star.style.cssText = `
            position: absolute;
            width: ${starSize}px;
            height: ${starSize}px;
            background: radial-gradient(circle, rgba(255,255,255,${opacity}) 0%, transparent 70%);
            border-radius: 50%;
            transform-origin: center;
            transition: opacity 0.3s ease;
        `;

        // Random initial position
        star.style.left = Math.random() * window.innerWidth + 'px';
        star.style.top = Math.random() * window.innerHeight + 'px';

        container.appendChild(star);
        
        layer.stars.push({
            element: star,
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            baseX: Math.random() * window.innerWidth,
            baseY: Math.random() * window.innerHeight,
            speed: layer.speed * (0.5 + Math.random() * 0.5)
        });
    }

    cursorStars.push(layer);
}

function getStarSize(size) {
    switch(size) {
        case 'large': return 4 + Math.random() * 2;
        case 'medium': return 2 + Math.random() * 2;
        case 'small': return 1 + Math.random() * 1;
        case 'tiny': return 0.5 + Math.random() * 0.5;
        default: return 2;
    }
}

function getStarOpacity(size) {
    switch(size) {
        case 'large': return 0.8 + Math.random() * 0.2;
        case 'medium': return 0.6 + Math.random() * 0.2;
        case 'small': return 0.4 + Math.random() * 0.2;
        case 'tiny': return 0.2 + Math.random() * 0.2;
        default: return 0.5;
    }
}

function getSpeedForSize(size) {
    switch(size) {
        case 'large': return 0.05;
        case 'medium': return 0.03;
        case 'small': return 0.02;
        case 'tiny': return 0.01;
        default: return 0.02;
    }
}

function onGlobalMouseMove(event) {
    targetCursorX = event.clientX;
    targetCursorY = event.clientY;
}

function animateGlobalStars() {
    const currentTime = Date.now();
    
    // Skip frame if we're animating too fast or if scrolling
    if (currentTime - lastFrameTime < frameInterval || animationPaused) {
        requestAnimationFrame(animateGlobalStars);
        return;
    }
    
    lastFrameTime = currentTime;
    
    // Smooth cursor position interpolation
    cursorX += (targetCursorX - cursorX) * 0.1;
    cursorY += (targetCursorY - cursorY) * 0.1;

    cursorStars.forEach(layer => {
        layer.stars.forEach(star => {
            // Calculate distance from cursor
            const dx = cursorX - star.x;
            const dy = cursorY - star.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Influence radius
            const influenceRadius = 150; // Reduced from 200
            const influence = Math.max(0, 1 - distance / influenceRadius);
            
            // Move towards cursor with smooth interpolation
            if (influence > 0) {
                star.x += dx * star.speed * influence * 0.3; // Reduced from 0.5
                star.y += dy * star.speed * influence * 0.3;
            } else {
                // Slowly return to base position when not influenced
                star.x += (star.baseX - star.x) * 0.01;
                star.y += (star.baseY - star.y) * 0.01;
            }

            // Keep stars within bounds
            star.x = Math.max(0, Math.min(window.innerWidth, star.x));
            star.y = Math.max(0, Math.min(window.innerHeight, star.y));

            // Use transform3d for hardware acceleration instead of left/top
            star.element.style.transform = `translate3d(${star.x}px, ${star.y}px, 0)`;
            
            // Simplified opacity calculation
            const baseOpacity = getStarOpacity(layer.size);
            const dynamicOpacity = baseOpacity * (0.5 + influence * 0.5);
            star.element.style.opacity = dynamicOpacity;
        });
    });

    requestAnimationFrame(animateGlobalStars);
}

// Handle window resize for global stars
function onGlobalResize() {
    cursorStars.forEach(layer => {
        layer.stars.forEach(star => {
            // Update base positions proportionally
            star.baseX = (star.baseX / window.innerWidth) * window.innerWidth;
            star.baseY = (star.baseY / window.innerHeight) * window.innerHeight;
        });
    });
}

// Initialize Three.js scene
function initThreeJS() {
    const canvas = document.getElementById('three-canvas');
    
    // Initialize window dimensions
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        alpha: true, 
        antialias: false, // Disable antialiasing for better performance
        powerPreference: "high-performance" 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    
    // Reduce pixel ratio for better performance on high-DPI displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create particles with reduced count
    createParticles();

    // Position camera
    camera.position.z = 100;

    // Animation loop
    animate();

    // Handle resize with throttling
    window.addEventListener('resize', throttle(onWindowResize, 100));
    document.addEventListener('mousemove', throttle(onDocumentMouseMove, 16));
}

function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    
    // Reduce particle count for better performance
    const particleCount = 200; // Reduced from 400
    
    for (let i = 0; i < particleCount; i++) {
        vertices.push(
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000
        );
        
        colors.push(
            0.3 + Math.random() * 0.7,
            0.5 + Math.random() * 0.5,
            1.0
        );
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6 // Reduced opacity for less GPU load
    });
    
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function animate() {
    // Pause animation during scroll for better performance
    if (animationPaused) {
        requestAnimationFrame(animate);
        return;
    }
    
    requestAnimationFrame(animate);
    
    // Reduce rotation speed for smoother performance
    particles.rotation.x += 0.0005; // Reduced from 0.001
    particles.rotation.y += 0.001;  // Reduced from 0.002
    
    // Mouse interaction with reduced sensitivity
    camera.position.x += (mouseX - camera.position.x) * 0.03; // Reduced from 0.05
    camera.position.y += (-mouseY - camera.position.y) * 0.03;
    camera.lookAt(scene.position);
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Handle global stars resize
    onGlobalResize();
}

function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) / 100;
    mouseY = (event.clientY - windowHalfY) / 100;
}

// Custom cursor functionality
function initCustomCursor() {
    const cursor = document.createElement('div');
    cursor.id = 'custom-cursor';
    cursor.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, rgba(96, 165, 250, 0.6) 0%, rgba(96, 165, 250, 0.2) 40%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        transition: transform 0.1s ease, scale 0.2s ease;
        mix-blend-mode: screen;
    `;
    document.body.appendChild(cursor);

    let cursorTimeout;

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        
        // Show cursor
        cursor.style.opacity = '1';
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        
        // Clear existing timeout
        clearTimeout(cursorTimeout);
        
        // Hide cursor after 2 seconds of no movement
        cursorTimeout = setTimeout(() => {
            cursor.style.opacity = '0.3';
            cursor.style.transform = 'translate(-50%, -50%) scale(0.5)';
        }, 2000);
    });

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
    });

    // Show cursor when entering window
    document.addEventListener('mouseenter', () => {
        cursor.style.opacity = '1';
    });
}

// Simplified Footer Animations
function initFooterAnimations() {
    const footer = document.querySelector('.footer');
    const footerSections = document.querySelectorAll('.footer-main, .footer-nav, .footer-connect');
    const contactRows = document.querySelectorAll('.contact-row');
    const socialButtons = document.querySelectorAll('.social-button');
    const footerBottom = document.querySelector('.footer-bottom');
    
    // Create intersection observer for footer entrance
    const footerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'footerSlideUp 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
                
                // Animate sections with stagger
                footerSections.forEach((section, index) => {
                    setTimeout(() => {
                        section.style.animation = `fadeInUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.1}s forwards`;
                        section.style.opacity = '1';
                        section.style.transform = 'translateY(0)';
                    }, index * 100);
                });
                
                // Animate contact rows
                contactRows.forEach((row, index) => {
                    setTimeout(() => {
                        row.style.animation = `fadeInRight 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.05}s forwards`;
                    }, 300 + index * 50);
                });
                
                // Animate social buttons with slight delay
                socialButtons.forEach((button, index) => {
                    setTimeout(() => {
                        button.style.animation = `fadeInScale 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.05}s forwards`;
                    }, 500 + index * 50);
                });
                
                // Animate footer bottom with delay
                if (footerBottom) {
                    setTimeout(() => {
                        footerBottom.style.animation = 'fadeIn 0.8s ease forwards';
                    }, 600);
                }
                
                footerObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    if (footer) {
        footerObserver.observe(footer);
    }
    
    // Add subtle hover effects for social buttons
    socialButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
    
    // Subtle floating animation for footer contact icons
    const contactIcons = document.querySelectorAll('.contact-icon');
    contactIcons.forEach((icon, index) => {
        setTimeout(() => {
            icon.style.animation = `float 3s ease-in-out ${index * 0.3}s infinite`;
        }, 800);
    });
}

// Add CSS animations for footer
const footerAnimationStyles = `
    @keyframes footerSlideUp {
        from {
            opacity: 0;
            transform: translateY(50px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeInScale {
        from {
            opacity: 0;
            transform: scale(0.8);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
    
    @keyframes float {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-5px);
        }
    }
    
    .footer-contact,
    .footer-links,
    .footer-professional,
    .footer-social-section {
        opacity: 0;
        transform: translateY(30px);
    }
`;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Three.js
    initThreeJS();
    
    // Initialize global cursor-following stars
    initGlobalStars();
    
    // Initialize custom cursor
    initCustomCursor();
    
    // Loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.body.style.overflow = 'auto';
    }, 2000);
    
    // Mobile navigation
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
    
    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Active navigation link with throttled scroll listener
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    function updateActiveLink() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }
    
    // Throttled scroll listener for better performance
    window.addEventListener('scroll', throttle(updateActiveLink, 100));
    
    // Pause animations during scroll
    window.addEventListener('scroll', () => {
        animationPaused = true;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            animationPaused = false;
        }, 150);
    });

    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.timeline-item, .project-card, .skill-category, .about-stats');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // Enhanced footer animations
    const footerElements = document.querySelectorAll('.footer .contact-item, .footer .social-link, .download-cv, .download-cover');
    footerElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        
        const footerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });
        
        footerObserver.observe(el);
    });
    
    // Typing animation for hero title
    function typeWriter() {
        const titles = ['DevOps Engineer', 'Cloud Architect', 'AI Enthusiast', 'Infrastructure Expert'];
        const titleElement = document.querySelector('.hero-title');
        let titleIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        
        function type() {
            const currentTitle = titles[titleIndex];
            
            if (isDeleting) {
                titleElement.textContent = currentTitle.substring(0, charIndex - 1);
                charIndex--;
            } else {
                titleElement.textContent = currentTitle.substring(0, charIndex + 1);
                charIndex++;
            }
            
            let typeSpeed = isDeleting ? 50 : 100;
            
            if (!isDeleting && charIndex === currentTitle.length) {
                typeSpeed = 2000; // Pause at end
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                titleIndex = (titleIndex + 1) % titles.length;
                typeSpeed = 500; // Pause before next title
            }
            
            setTimeout(type, typeSpeed);
        }
        
        type();
    }
    
    // Start typing animation
    setTimeout(typeWriter, 3000);
    
    // Add scroll-triggered animations for skill items
    const skillItems = document.querySelectorAll('.skill-item');
    skillItems.forEach((item, index) => {
        item.style.animationDelay = `${index * 0.1}s`;
        observer.observe(item);
    });
    
    // Navbar background on scroll with throttling
    window.addEventListener('scroll', throttle(() => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(15, 23, 42, 0.98)';
        } else {
            navbar.style.background = 'rgba(15, 23, 42, 0.95)';
        }
    }, 100));
    
    // Optimized hover effects with CSS classes instead of inline styles
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.classList.add('project-card-hover');
        });
        
        card.addEventListener('mouseleave', function() {
            this.classList.remove('project-card-hover');
        });
    });
    
    // Add ripple effect to buttons
    function createRipple(event) {
        const button = event.currentTarget;
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
        circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
        circle.classList.add('ripple');
        
        const ripple = button.getElementsByClassName('ripple')[0];
        if (ripple) {
            ripple.remove();
        }
        
        button.appendChild(circle);
    }
    
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', createRipple);
    });
    
    // Add CSS for ripple effect
    const rippleStyle = document.createElement('style');
    rippleStyle.textContent = `
        .btn {
            position: relative;
            overflow: hidden;
        }
        
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            pointer-events: none;
        }
        
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(rippleStyle);
    
    // Add footer animation styles
    const footerStyleSheet = document.createElement('style');
    footerStyleSheet.textContent = footerAnimationStyles;
    document.head.appendChild(footerStyleSheet);
    
    // Initialize footer animations
    setTimeout(initFooterAnimations, 500);
});

// Performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced resize handler
const debouncedResize = debounce(() => {
    onWindowResize();
}, 250);

window.addEventListener('resize', debouncedResize);
