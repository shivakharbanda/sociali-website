// ========================================
// SOCIALI - GSAP ANIMATIONS
// Bold & Immersive Single-Page Experience
// ========================================

// Check if user prefers reduced motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Feature detection for mobile devices (NO user-agent sniffing)
function isMobileDevice() {
  // Check for touch as primary input method
  const hasTouchScreen = (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0)
  );

  // Check viewport characteristics
  const hasSmallViewport = window.innerWidth < 768;

  // Check for coarse pointer (touch) as primary input - most reliable
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  // Mobile device if: touch-capable with small viewport OR coarse pointer
  // This correctly identifies real mobile devices vs browser emulation
  return (hasTouchScreen && hasSmallViewport) || hasCoarsePointer;
}

// Alias for backward compatibility
const isMobile = isMobileDevice;

// Initialize GSAP with optimal settings
gsap.config({
  force3D: true,
  nullTargetWarn: false
});

// ScrollTrigger global configuration
ScrollTrigger.config({
  limitCallbacks: true,     // Throttle callbacks during fast scroll
  syncInterval: 0,          // Sync with native refresh rate
  autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load,resize'
});

// Mobile-specific configuration
if (isMobileDevice()) {
  ScrollTrigger.config({
    ignoreMobileResize: true,  // Don't refresh on iOS address bar resize
    autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load'  // Exclude resize
  });
}

// Handle iOS address bar and viewport changes properly
// IMPORTANT: Only refresh ScrollTrigger when scrolling stops, not during scroll
let lastViewportHeight = window.innerHeight;
let viewportResizeTimeout;
let isScrolling = false;
let scrollTimeout;

// Detect when scrolling starts
window.addEventListener('scroll', () => {
  isScrolling = true;
  clearTimeout(scrollTimeout);

  // Mark scrolling as stopped after 150ms of no scroll events
  scrollTimeout = setTimeout(() => {
    isScrolling = false;
  }, 150);
}, { passive: true });

// Use visualViewport API if available (more accurate for mobile)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    // Only refresh if we're not actively scrolling
    if (!isScrolling) {
      clearTimeout(viewportResizeTimeout);
      viewportResizeTimeout = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 200);
    }
  });
} else {
  // Fallback: Monitor window height changes (orientation, address bar)
  window.addEventListener('resize', () => {
    const currentHeight = window.innerHeight;
    const heightDiff = Math.abs(currentHeight - lastViewportHeight);

    // Significant height change AND not actively scrolling
    if (heightDiff > 100 && !isScrolling) {
      lastViewportHeight = currentHeight;
      clearTimeout(viewportResizeTimeout);
      viewportResizeTimeout = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 250);
    }
  }, { passive: true });
}

// ========================================
// RESPONSIVE TRIGGER HELPERS
// ========================================

// Responsive trigger position helper
function getTriggerStart(desktopStart = 'top 80%') {
  const viewportWidth = window.innerWidth;

  // Extra small phones (iPhone SE, etc.)
  if (viewportWidth < 375) {
    return 'top 95%';  // Very late trigger
  }

  // Small phones
  if (viewportWidth < 480) {
    return 'top 92%';  // Later trigger
  }

  // Standard phones
  if (viewportWidth < 768) {
    return 'top 88%';  // Slightly later trigger
  }

  // Tablets
  if (viewportWidth < 1024) {
    return 'top 85%';
  }

  // Desktop - parse and return original value
  return desktopStart;
}

// Helper for end positions (relative to viewport)
function getTriggerEnd() {
  const viewportHeight = window.innerHeight;
  return `+=${viewportHeight * 0.3}`;  // 30% of viewport
}

// ========================================
// 1. HERO ENTRANCE ANIMATIONS (PRIORITY)
// ========================================

function initHeroAnimations() {
  if (prefersReducedMotion) {
    // Show everything immediately if reduced motion is preferred
    gsap.set(['.hero .logo-name', '.hero .subtitle'], { opacity: 1 });
    return;
  }

  const tl = gsap.timeline({
    defaults: { ease: 'power4.out' }
  });

  // Background focus effect - GPU accelerated (scale + opacity + light filter)
  tl.from('.hero-bg', {
    scale: 1.15,               // Start zoomed in
    opacity: 0.2,              // Start dim
    filter: 'saturate(0.8)',   // Start desaturated
    duration: 1.5,
    ease: 'power3.out'
  }, 0)
    .to('.hero-bg', {
      filter: 'saturate(1.2)',  // Boost saturation (final state)
      opacity: 0.85,             // Brighten (final state)
      duration: 1.5,
      ease: 'power3.out'
    }, 0)

    // Hero text elements come in together (tagline is hidden via CSS)
    .from(['.hero .logo-name img', '.hero .subtitle'], {
      opacity: 0,
      y: 40,
      duration: 1.2,
      ease: 'power3.out',
      stagger: 0
    }, 0.3);

  // Ken Burns effect on hero background (starts after blur clears)
  gsap.to('.hero-bg', {
    scale: 1.05,
    duration: 20,
    ease: 'none',
    repeat: -1,
    yoyo: true,
    delay: 1.5
  });
}

// ========================================
// 2. PARALLAX EFFECTS
// ========================================

function initParallaxEffects() {
  if (prefersReducedMotion || isMobile()) return;

  // Hero background parallax - REMOVED to prevent gap bug
  // Background stays fixed, Ken Burns provides motion

  // Case study images parallax - DISABLED
  // document.querySelectorAll('.case-row img').forEach((img, index) => {
  //   gsap.to(img, {
  //     yPercent: 20,
  //     ease: 'none',
  //     scrollTrigger: {
  //       trigger: img,
  //       start: 'top bottom',
  //       end: 'bottom top',
  //       scrub: 1
  //     }
  //   });
  // });
}

// ========================================
// 3. SMOOTH SCROLL NAVIGATION
// ========================================

function initSmoothScroll() {
  // Get nav links only (exclude brand logo)
  const navLinks = document.querySelectorAll('nav a[href^="#"], .mobile-nav a[href^="#"]');

  console.log(`🔗 Found ${navLinks.length} navigation links`);

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');

      console.log(`🖱️ Clicked: ${href}`);

      // Always prevent default first
      e.preventDefault();

      // Skip if it's just "#"
      if (href === '#') {
        console.log('⚠️ Skipped: href is just "#"');
        return;
      }

      const target = document.querySelector(href);
      if (!target) {
        console.log(`❌ Target not found: ${href}`);
        return;
      }

      // Get header height for offset
      const headerHeight = document.querySelector('header').offsetHeight;

      console.log(`✅ Scrolling to: ${href} (offset: ${headerHeight}px)`);

      // Smooth scroll with GSAP
      gsap.to(window, {
        duration: 0.8,
        scrollTo: {
          y: target,
          offsetY: headerHeight
        },
        ease: 'power2.out'
      });

      // Close mobile menu if open
      const toggle = document.getElementById('mobileToggle');
      const mobileNav = document.getElementById('mobile-nav');
      if (toggle && mobileNav) {
        toggle.setAttribute('aria-expanded', 'false');
        mobileNav.style.display = 'none';
        mobileNav.setAttribute('aria-hidden', 'true');
      }
    });
  });

  // Active section indicator
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('nav a[href^="#"]:not(.cta)');

  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: () => {
      let current = '';

      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        const scrollPosition = window.pageYOffset + 100;

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          current = section.getAttribute('id');
        }
      });

      navItems.forEach(item => {
        item.style.color = '';
        item.style.fontWeight = '';
        if (item.getAttribute('href') === `#${current}`) {
          item.style.color = 'var(--social-orange)';
          item.style.fontWeight = '700';
        }
      });
    }
  });
}

// ========================================
// 4. MOBILE MENU ANIMATIONS
// ========================================

function initMobileMenuAnimations() {
  const toggle = document.getElementById('mobileToggle');
  const mobileNav = document.getElementById('mobile-nav');
  const mobileLinks = mobileNav.querySelectorAll('a');

  // Override the default mobile menu behavior
  const originalToggle = toggle.cloneNode(true);
  toggle.parentNode.replaceChild(originalToggle, toggle);

  originalToggle.addEventListener('click', () => {
    const expanded = originalToggle.getAttribute('aria-expanded') === 'true';
    originalToggle.setAttribute('aria-expanded', String(!expanded));

    if (!expanded) {
      // Open animation
      mobileNav.style.display = 'block';
      mobileNav.setAttribute('aria-hidden', 'false');

      gsap.fromTo(mobileNav,
        {
          opacity: 0,
          height: 0,
          y: -20
        },
        {
          opacity: 1,
          height: 'auto',
          y: 0,
          duration: 0.5,
          ease: 'power3.out'
        }
      );

      // Stagger links
      gsap.from(mobileLinks, {
        opacity: 0,
        x: -30,
        stagger: 0.08,
        duration: 0.4,
        ease: 'power2.out',
        delay: 0.2
      });
    } else {
      // Close animation
      gsap.to(mobileNav, {
        opacity: 0,
        height: 0,
        y: -20,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          mobileNav.style.display = 'none';
          mobileNav.setAttribute('aria-hidden', 'true');
        }
      });
    }
  });

  // Close on link click
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      gsap.to(mobileNav, {
        opacity: 0,
        height: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          originalToggle.setAttribute('aria-expanded', 'false');
          mobileNav.style.display = 'none';
          mobileNav.setAttribute('aria-hidden', 'true');
        }
      });
    });
  });
}

// ========================================
// 5. EXPERTISE CARDS SCROLL ANIMATIONS
// ========================================

function initExpertiseAnimations() {
  const cards = document.querySelectorAll('.expertise-col');

  cards.forEach((card, index) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: getTriggerStart('top 85%'),
        end: getTriggerEnd(),
        toggleActions: 'play none none reverse'
      },
      opacity: 0,
      y: 60,
      duration: 0.8,
      delay: index * 0.15,
      ease: 'power2.out'
    });

    // Subtle hover effect on desktop
    if (!isMobile()) {
      card.addEventListener('mouseenter', () => {
        gsap.to(card, {
          y: -8,
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          y: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      // 3D tilt based on mouse position
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        gsap.to(card, {
          rotationX: rotateX,
          rotationY: rotateY,
          transformPerspective: 1000,
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotationX: 0,
          rotationY: 0,
          duration: 0.5,
          ease: 'power2.out'
        });
      });
    }
  });
}

// ========================================
// 6. PROCESS TIMELINE ANIMATIONS
// ========================================

function isVerticalLayout() {
  return window.innerWidth <= 1200;
}

// Store timeline globally so we can kill it if needed
let processTimeline = null;

function playTimelineAnimation() {
  const dots = document.querySelectorAll('.dot');
  const stages = document.querySelectorAll('.stage');
  const lineFill = document.getElementById('lineFill');

  if (!dots.length || !stages.length || !lineFill) return;

  const isVertical = isVerticalLayout();

  // Kill previous timeline if it exists
  if (processTimeline) {
    processTimeline.kill();
  }

  // Reset everything first
  dots.forEach(dot => dot.classList.remove('active'));
  stages.forEach(stage => stage.classList.remove('active'));

  if (isVertical) {
    gsap.set(lineFill, { height: '0%', width: '100%' });
  } else {
    gsap.set(lineFill, { width: '0%', height: '100%' });
  }

  // Create GSAP timeline (replaces setTimeout + CSS transitions)
  processTimeline = gsap.timeline();

  // Animate dots and line sequentially with GSAP
  dots.forEach((dot, index) => {
    const progress = ((index + 1) / dots.length) * 100;

    processTimeline.add(() => {
      dot.classList.add('active');
    }, index * 0.7);

    // Animate line fill with GSAP (not direct style manipulation)
    if (isVertical) {
      processTimeline.to(lineFill, {
        height: progress + '%',
        duration: 0.5,
        ease: 'power2.out'
      }, index * 0.7);
    } else {
      processTimeline.to(lineFill, {
        width: progress + '%',
        duration: 0.5,
        ease: 'power2.out'
      }, index * 0.7);
    }
  });

  // Animate stages sequentially with GSAP
  stages.forEach((stage, index) => {
    processTimeline.add(() => {
      stage.classList.add('active');
    }, 0.75 + (index * 0.7));
  });
}

function initProcessAnimations() {
  const timeline = document.querySelector('.timeline-wrapper');
  if (!timeline) return;

  let hasPlayed = false;

  // Trigger animation on scroll using ScrollTrigger
  ScrollTrigger.create({
    trigger: timeline,
    start: 'top 70%',
    onEnter: () => {
      if (!hasPlayed) {
        playTimelineAnimation();
        hasPlayed = true;
      }
    }
  });

  // Replay on window resize to handle layout changes
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (hasPlayed) {
        playTimelineAnimation();
      }
    }, 250);
  });
}

// ========================================
// 7. CLIENT LOGOS ANIMATIONS
// ========================================

function initClientAnimations() {
  const clientBoxes = document.querySelectorAll('.client-box');
  const clientImages = document.querySelectorAll('.client-box img');

  if (isMobileDevice()) {
    // MOBILE: Batch animations into groups
    const batchSize = 6;  // Animate 6 at a time

    for (let batch = 0; batch < Math.ceil(clientBoxes.length / batchSize); batch++) {
      const startIdx = batch * batchSize;
      const endIdx = Math.min(startIdx + batchSize, clientBoxes.length);
      const batchBoxes = Array.from(clientBoxes).slice(startIdx, endIdx);

      if (batchBoxes.length > 0) {
        gsap.from(batchBoxes, {
          scrollTrigger: {
            trigger: batchBoxes[0],  // Trigger on first in batch
            start: getTriggerStart('top 85%'),
            toggleActions: 'play none none none'  // Don't reverse on mobile
          },
          opacity: 0,
          scale: 0.85,  // Less dramatic scale
          rotation: 0,   // No rotation (expensive on mobile)
          duration: 0.5,
          stagger: 0.08,  // Stagger within batch
          ease: 'power2.out'  // Simpler easing
        });
      }
    }

    // MOBILE: Set images to color immediately (skip expensive animation)
    // CSS sets grayscale(100%) by default, so we override it to show color
    clientImages.forEach(img => {
      img.style.filter = 'grayscale(0%)';
    });

  } else {
    // DESKTOP: Keep existing fancy animations

    // Shuffle/randomized entrance
    const shuffledIndexes = Array.from({ length: clientBoxes.length }, (_, i) => i)
      .sort(() => Math.random() - 0.5);

    clientBoxes.forEach((box, index) => {
      gsap.from(box, {
        scrollTrigger: {
          trigger: box,
          start: getTriggerStart('top 85%'),
          end: getTriggerEnd(),
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        scale: 0.7,
        rotation: shuffledIndexes.indexOf(index) % 2 === 0 ? 10 : -10,
        duration: 0.8,
        delay: shuffledIndexes.indexOf(index) * 0.08,
        ease: 'back.out(1.5)'
      });
    });

    // Desaturate to color on scroll
    clientImages.forEach(img => {
      gsap.to(img, {
        scrollTrigger: {
          trigger: img,
          start: getTriggerStart('top 80%'),
          end: getTriggerEnd(),
          toggleActions: 'play none none reverse'
        },
        filter: 'grayscale(0%)',
        duration: 1,
        ease: 'power2.out'
      });

      // Scale on hover
      img.parentElement.addEventListener('mouseenter', () => {
        gsap.to(img, {
          scale: 1.1,
          filter: 'grayscale(0%)',
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      img.parentElement.addEventListener('mouseleave', () => {
        gsap.to(img, {
          scale: 1,
          filter: 'grayscale(100%)',
          duration: 0.3,
          ease: 'power2.out'
        });
      });
    });
  }
}

// ========================================
// 8. CASE STUDIES ANIMATIONS
// ========================================

function initCaseStudiesAnimations() {
  const caseRows = document.querySelectorAll('.case-row');

  caseRows.forEach((row, index) => {
    const img = row.querySelector('img');
    const brand = row.querySelector('.case-brand');
    const textBlocks = row.querySelectorAll('.case-text-block');

    if (isMobileDevice()) {
      // MOBILE: Batch all elements in row into ONE ScrollTrigger for performance
      const allElements = [img, brand, ...Array.from(textBlocks)].filter(Boolean);

      if (allElements.length > 0) {
        gsap.from(allElements, {
          scrollTrigger: {
            trigger: row,
            start: getTriggerStart('top 80%'),
            toggleActions: 'play none none none'
          },
          opacity: 0,
          y: 20,  // Simple upward movement
          stagger: 0.08,  // Quick stagger
          duration: 0.5,
          ease: 'power2.out'
        });
      }

    } else {
      // DESKTOP: Keep existing fancy animations

      // Image entrance with blur
      gsap.from(img, {
        scrollTrigger: {
          trigger: row,
          start: getTriggerStart('top 80%'),
          end: getTriggerEnd(),
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        scale: 1.2,
        filter: 'blur(20px)',
        duration: 1.2,
        ease: 'power3.out'
      });

      // Brand header animation
      if (brand) {
        gsap.from(brand, {
          scrollTrigger: {
            trigger: brand,
            start: getTriggerStart('top 80%'),
            end: getTriggerEnd(),
            toggleActions: 'play none none reverse'
          },
          opacity: 0,
          y: 40,
          duration: 0.8,
          ease: 'power3.out'
        });
      }

      // Text blocks staggered animation
      if (textBlocks.length > 0) {
        textBlocks.forEach((block, blockIndex) => {
          gsap.from(block, {
            scrollTrigger: {
              trigger: block,
              start: getTriggerStart('top 80%'),
              end: getTriggerEnd(),
              toggleActions: 'play none none reverse'
            },
            opacity: 0,
            y: 30,
            duration: 0.8,
            delay: blockIndex * 0.15,
            ease: 'power2.out'
          });
        });
      }

      // Dramatic hover effect (desktop only)
      row.addEventListener('mouseenter', () => {
        gsap.to(img, {
          scale: 1.05,
          filter: 'grayscale(0%) brightness(1.1)',
          duration: 0.6,
          ease: 'power2.out'
        });

        gsap.to(row, {
          boxShadow: '0 30px 60px rgba(0,0,0,0.2)',
          duration: 0.6,
          ease: 'power2.out'
        });
      });

      row.addEventListener('mouseleave', () => {
        gsap.to(img, {
          scale: 1,
          filter: 'grayscale(100%)',
          duration: 0.6,
          ease: 'power2.out'
        });

        gsap.to(row, {
          boxShadow: '0 0 0 rgba(0,0,0,0)',
          duration: 0.6,
          ease: 'power2.out'
        });
      });
    }
  });
}

// ========================================
// 9. ABOUT SECTION ANIMATIONS
// ========================================

function initAboutAnimations() {
  const aboutSection = document.querySelector('#about');
  const aboutContent = aboutSection.querySelectorAll('h2, p');
  const aboutImage = aboutSection.querySelector('img');

  // Content fade in
  gsap.from(aboutContent, {
    scrollTrigger: {
      trigger: aboutSection,
      start: getTriggerStart('top 75%'),
      end: getTriggerEnd(),
      toggleActions: 'play none none reverse'
    },
    opacity: 0,
    y: 40,
    stagger: 0.2,
    duration: 1,
    ease: 'power3.out'
  });

  // Image reveal with scale
  gsap.from(aboutImage, {
    scrollTrigger: {
      trigger: aboutImage,
      start: getTriggerStart('top 80%'),
      end: getTriggerEnd(),
      toggleActions: 'play none none reverse'
    },
    opacity: 0,
    scale: 1.1,
    filter: 'grayscale(100%) blur(10px)',
    duration: 1.2,
    ease: 'power3.out'
  });
}

// ========================================
// 10. AWARDS SECTION ANIMATIONS
// ========================================

function initAwardsAnimations() {
  // Accessibility check
  if (prefersReducedMotion) {
    gsap.set(['#awards .process-header', '.awards-image img', '.award-item', '.award-icon svg'], { opacity: 1 });
    return;
  }

  const awardsSection = document.querySelector('#awards');
  if (!awardsSection) return;

  const header = awardsSection.querySelector('.process-header');
  const image = awardsSection.querySelector('.awards-image img');
  const awardItems = awardsSection.querySelectorAll('.award-item');
  const trophyIcons = awardsSection.querySelectorAll('.award-icon svg');

  if (isMobileDevice()) {
    // MOBILE: Batch ALL awards section elements into ONE ScrollTrigger
    const allElements = [header, image, ...Array.from(awardItems)].filter(Boolean);

    if (allElements.length > 0) {
      gsap.from(allElements, {
        scrollTrigger: {
          trigger: awardsSection,
          start: getTriggerStart('top 80%'),
          toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 20,
        stagger: 0.1,
        duration: 0.6,
        ease: 'power2.out'
      });
    }

  } else {
    // DESKTOP: Keep fancy individual animations

    // Header animation - fade + scale + slide-up
    if (header) {
      gsap.from(header, {
        scrollTrigger: {
          trigger: header,
          start: getTriggerStart('top 85%'),
          end: getTriggerEnd(),
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        y: 30,
        scale: 0.9,
        duration: 0.8,
        ease: 'back.out(1.5)'
      });
    }

    // Image animation - blur-to-clear + scale + fade
    if (image) {
      gsap.from(image, {
        scrollTrigger: {
          trigger: image,
          start: getTriggerStart('top 80%'),
          end: getTriggerEnd(),
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        scale: 1.2,
        filter: 'blur(20px)',
        duration: 1.2,
        ease: 'power3.out'
      });
    }

    // Award items animation - staggered slide-up + fade
    if (awardItems.length > 0) {
      awardItems.forEach((item, index) => {
        gsap.from(item, {
          scrollTrigger: {
            trigger: item,
            start: getTriggerStart('top 85%'),
            end: getTriggerEnd(),
            toggleActions: 'play none none reverse'
          },
          opacity: 0,
          y: 40,
          duration: 0.8,
          delay: index * 0.12,
          ease: 'power2.out'
        });
      });
    }

    // Trophy icons animation - scale bounce effect
    if (trophyIcons.length > 0) {
      trophyIcons.forEach((icon, index) => {
        gsap.from(icon, {
          scrollTrigger: {
            trigger: icon.closest('.award-item'),
            start: getTriggerStart('top 85%'),
            end: getTriggerEnd(),
            toggleActions: 'play none none reverse'
          },
          scale: 0,
          duration: 0.6,
          delay: (index * 0.12) + 0.2,
          ease: 'back.out(1.7)'
        });
      });
    }
  }
}

// ========================================
// 11. MAGNETIC CURSOR EFFECT (Desktop)
// ========================================

function initMagneticCursor() {
  if (isMobile() || prefersReducedMotion) return;

  const magneticElements = document.querySelectorAll('.cta, .card, .client-box');

  magneticElements.forEach(el => {
    el.classList.add('magnetic');

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      // Limit translation to ±15px to prevent overflow
      const maxTranslate = 15;
      const translateX = Math.max(-maxTranslate, Math.min(maxTranslate, x * 0.3));
      const translateY = Math.max(-maxTranslate, Math.min(maxTranslate, y * 0.3));

      gsap.to(el, {
        x: translateX,
        y: translateY,
        duration: 0.3,
        ease: 'power2.out'
      });
    });

    el.addEventListener('mouseleave', () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.3)'
      });
    });
  });
}

// ========================================
// 11. BUTTON & LINK MICRO-INTERACTIONS
// ========================================

function initMicroInteractions() {
  // CTA button effects
  const ctaButtons = document.querySelectorAll('.cta');

  ctaButtons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      gsap.to(btn, {
        scale: 1.08,
        boxShadow: '0 10px 30px rgba(240, 70, 0, 0.4)',
        duration: 0.3,
        ease: 'power2.out'
      });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        scale: 1,
        boxShadow: '0 0 0 rgba(240, 70, 0, 0)',
        duration: 0.3,
        ease: 'power2.out'
      });
    });

    btn.addEventListener('click', () => {
      gsap.to(btn, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut'
      });
    });
  });

  // Nav link hover effects
  const navLinks = document.querySelectorAll('nav.desktop a:not(.cta)');

  navLinks.forEach(link => {
    link.addEventListener('mouseenter', () => {
      gsap.to(link, {
        y: -2,
        duration: 0.3,
        ease: 'power2.out'
      });
    });

    link.addEventListener('mouseleave', () => {
      gsap.to(link, {
        y: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
    });
  });
}

// ========================================
// 12. FOOTER ANIMATIONS
// ========================================

function initFooterAnimations() {
  const footer = document.querySelector('footer');
  const footerElements = footer.querySelectorAll('.footer-inner > *');

  gsap.from(footerElements, {
    scrollTrigger: {
      trigger: footer,
      start: getTriggerStart('top 90%'),
      end: getTriggerEnd(),
      toggleActions: 'play none none reverse'
    },
    opacity: 0,
    y: 30,
    stagger: 0.15,
    duration: 0.8,
    ease: 'power3.out'
  });
}

// ========================================
// 13. CONTACT SECTION ANIMATIONS
// ========================================

function initContactAnimations() {
  if (prefersReducedMotion) {
    gsap.set(['#contact-section .contact-title', '#contact-section .contact-name-first', '#contact-section .contact-name-last', '.contact-phone', '.contact-email', '.contact-instagram', '.contact-image img'], { opacity: 1 });
    return;
  }

  const contactSection = document.querySelector('#contact-section');
  if (!contactSection) return;

  const title = contactSection.querySelector('.contact-title');
  const firstName = contactSection.querySelector('.contact-name-first');
  const lastName = contactSection.querySelector('.contact-name-last');
  const contactLinks = contactSection.querySelectorAll('.contact-phone, .contact-email, .contact-instagram');
  const contactImage = contactSection.querySelector('.contact-image img');

  // Title fade + slide-up
  if (title) {
    gsap.from(title, {
      scrollTrigger: { trigger: title, start: getTriggerStart('top 85%'), end: getTriggerEnd(), toggleActions: 'play none none reverse' },
      opacity: 0, y: 30, duration: 0.8, ease: 'power3.out'
    });
  }

  // Names staggered entrance
  if (firstName && lastName) {
    gsap.from([firstName, lastName], {
      scrollTrigger: { trigger: firstName, start: getTriggerStart('top 85%'), end: getTriggerEnd(), toggleActions: 'play none none reverse' },
      opacity: 0, y: 40, stagger: 0.15, duration: 1, ease: 'power3.out'
    });
  }

  // Contact links slide-in from left
  if (contactLinks.length > 0) {
    contactLinks.forEach((link, index) => {
      gsap.from(link, {
        scrollTrigger: { trigger: link, start: getTriggerStart('top 85%'), end: getTriggerEnd(), toggleActions: 'play none none reverse' },
        opacity: 0, x: -30, duration: 0.8, delay: index * 0.12, ease: 'power2.out'
      });
    });
  }

  // Image blur-to-clear + scale
  if (contactImage) {
    gsap.from(contactImage, {
      scrollTrigger: { trigger: contactImage, start: getTriggerStart('top 80%'), end: getTriggerEnd(), toggleActions: 'play none none reverse' },
      opacity: 0, scale: 1.1, filter: 'blur(10px)', duration: 1.2, ease: 'power3.out'
    });
  }
}

// ========================================
// 14. SECTION HEADING ANIMATIONS
// ========================================

function initHeadingAnimations() {
  const sectionHeadings = document.querySelectorAll('#expertise h2, #clients h2, #case-studies h2:not(.case-brand):not(.process-heading)');

  sectionHeadings.forEach(heading => {
    gsap.from(heading, {
      scrollTrigger: {
        trigger: heading,
        start: getTriggerStart('top 85%'),
        end: getTriggerEnd(),
        toggleActions: 'play none none reverse'
      },
      opacity: 0,
      y: 30,
      scale: 0.9,
      duration: 0.8,
      ease: 'back.out(1.5)'
    });
  });

  // Animate process title separately
  const processLabel = document.querySelector('.process-label');
  const processHeading = document.querySelector('.process-heading');

  if (processLabel && processHeading) {
    gsap.from([processLabel, processHeading], {
      scrollTrigger: {
        trigger: '.process-header',
        start: getTriggerStart('top 80%'),
        end: getTriggerEnd(),
        toggleActions: 'play none none reverse'
      },
      opacity: 0,
      y: 30,
      stagger: 0.2,
      duration: 1,
      ease: 'power3.out'
    });
  }
}

// ========================================
// 14. INITIALIZE ALL ANIMATIONS
// ========================================

function init() {
  // Mark body as GSAP ready to show content
  document.body.classList.add('gsap-ready');

  // Initialize all animation modules
  initHeroAnimations();
  initParallaxEffects();
  initSmoothScroll();
  initMobileMenuAnimations();
  initExpertiseAnimations();
  initProcessAnimations();
  initClientAnimations();
  initAwardsAnimations();
  initCaseStudiesAnimations();
  initAboutAnimations();
  initMagneticCursor();
  initMicroInteractions();
  initContactAnimations();
  initFooterAnimations();
  initHeadingAnimations();

  // CRITICAL: Wait for images to load BEFORE refreshing ScrollTrigger
  // This ensures trigger positions are calculated correctly
  refreshAfterImages();
  observeDOMChanges();
}

// ========================================
// START ANIMATIONS WHEN DOM IS READY
// ========================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Wait for all images to load before finalizing ScrollTrigger positions
function refreshAfterImages() {
  const images = document.querySelectorAll('img');
  let loadedCount = 0;
  const totalImages = images.length;

  if (totalImages === 0) {
    return;
  }

  const onImageLoad = () => {
    loadedCount++;
    if (loadedCount === totalImages) {
      console.log('All images loaded, refreshing ScrollTrigger');
      ScrollTrigger.refresh();
    }
  };

  images.forEach(img => {
    if (img.complete) {
      onImageLoad();
    } else {
      img.addEventListener('load', onImageLoad);
      img.addEventListener('error', onImageLoad);
    }
  });

  // Fallback timeout
  setTimeout(() => ScrollTrigger.refresh(), 3000);
}

// Watch for DOM changes (lazy loaded images, dynamic content)
function observeDOMChanges() {
  let mutationTimeout;

  const observer = new MutationObserver(() => {
    clearTimeout(mutationTimeout);
    mutationTimeout = setTimeout(() => {
      console.log('DOM changed, refreshing ScrollTrigger');
      ScrollTrigger.refresh();
    }, 500);  // Debounce refreshes
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'style']  // Watch for image src/style changes
  });
}

// Refresh ScrollTrigger on window resize (debounced)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    ScrollTrigger.refresh();
  }, 250);
});

console.log('🎨 GSAP Animations Loaded - Bold & Immersive Experience Active');
