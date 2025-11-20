# Mobile Animation Issues - Comprehensive Fix Guide

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Complete Problem Breakdown](#complete-problem-breakdown)
3. [Root Cause Analysis](#root-cause-analysis)
4. [Detailed Fix Specifications](#detailed-fix-specifications)
5. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

The Social.i website has **8 critical mobile animation issues** causing inconsistent, jittery, and broken scroll-triggered animations on mobile devices. These stem from:

- **60+ ScrollTrigger instances** using desktop-optimized configurations
- **No mobile-specific trigger adjustments** for viewport differences
- **Performance bottlenecks** from simultaneous animations
- **Timing issues** from dynamic viewport height changes (address bar)
- **Missing optimizations** for mobile GPU rendering

**Impact**: Poor mobile user experience with animations that don't trigger, trigger too early/late, or cause stuttering during scroll.

---

## Complete Problem Breakdown

### Issue #1: Dynamic Viewport Height (CRITICAL)
**Severity**: CRITICAL
**Affected**: All 60+ ScrollTrigger instances
**User Impact**: Inconsistent trigger points, animations firing at wrong times

**What happens**:
- Mobile browser address bars appear/disappear during scroll
- Viewport height changes by 50-100px dynamically
- `'top 85%'` trigger point shifts by ~82px mid-scroll
- Elements suddenly cross trigger threshold
- Animations fire earlier/later than expected

**Example**:
```
iPhone (667px tall):
- Address bar visible: viewport = 570px → trigger at 484px
- Address bar hidden: viewport = 667px → trigger at 567px
- Difference: 83px shift while scrolling!
```

---

### Issue #2: No Mobile-Specific Trigger Positions (CRITICAL)
**Severity**: CRITICAL
**Affected**: All ScrollTrigger configurations
**User Impact**: Animations trigger too early or too late

**What happens**:
- Desktop viewport: ~900px height, sees more content
- Mobile viewport: ~500-600px height, sees less content
- Same trigger `'top 80%'` means different things:
  - Desktop: Element triggers at 720px from top
  - Mobile: Element triggers at 533px from top
- BUT mobile content is more compact/taller
- Result: Mobile triggers fire before elements are properly visible

**Code example (animations.js:272)**:
```javascript
scrollTrigger: {
  trigger: card,
  start: 'top 85%',  // ← Same for all screen sizes!
  toggleActions: 'play none none reverse'
}
```

---

### Issue #3: Too Many Simultaneous Animations (HIGH)
**Severity**: HIGH
**Affected**: Client logos (18×2=36 triggers), Case studies (8+ triggers)
**User Impact**: Jittery scrolling, dropped frames, stuttering

**What happens**:
- Client section has 18 logos
- Each logo has 2 ScrollTriggers (entrance + desaturate)
- Total: 36 animations fire when section enters viewport
- Each with stagger delays (up to 1.44s of overlapping animations)
- Mobile GPUs can't handle this load
- Result: Dropped frames, jittery scroll

**Code (animations.js:431-457)**:
```javascript
// 18 boxes × entrance animation
gsap.from(box, {
  scrollTrigger: { trigger: box, start: 'top 85%' },
  opacity: 0, scale: 0.7, rotation: ±10,
  delay: shuffledIndexes.indexOf(index) * 0.08  // Overlapping delays
});

// 18 images × desaturate animation
gsap.to(img, {
  scrollTrigger: { trigger: img, start: 'top 80%' },
  filter: 'grayscale(0%)'  // Expensive filter operation
});
```

---

### Issue #4: Images Load After ScrollTrigger Init (HIGH)
**Severity**: HIGH
**Affected**: Case studies, Awards, About sections
**User Impact**: Animations don't trigger at all

**What happens**:
1. Page loads → ScrollTrigger initializes → calculates trigger positions
2. Images load asynchronously → page height increases
3. ScrollTrigger positions are now WRONG (calculated on shorter page)
4. User scrolls past old trigger points
5. Animations never fire because elements already passed their triggers

**Timeline**:
```
T=0ms:  Page loads, height = 3000px
T=50ms: ScrollTrigger.refresh() runs (animations.js:946)
        → Trigger for case study at scroll position 2400px

T=500ms: Images load, height = 4500px (1500px taller!)
         → Case study now at scroll position 3900px
         → But trigger still thinks it's at 2400px

T=1000ms: User scrolls to 2500px → past old trigger (2400px)
          → Animation doesn't fire
          → User scrolls to 3900px → sees unanimated content
```

**Current refresh logic (animations.js:946-965)**:
```javascript
ScrollTrigger.refresh();  // ← Only runs once at init

window.addEventListener('resize', () => {
  setTimeout(() => ScrollTrigger.refresh(), 250);
});
// ← No refresh on image load!
```

---

### Issue #5: Incomplete will-change Declarations (HIGH)
**Severity**: HIGH
**Affected**: 50+ animated elements
**User Impact**: Dropped frames, janky animations, repaints

**What happens**:
- `will-change` CSS property tells browser to pre-optimize elements
- Current CSS only declares 7 element types (index.html:352-354)
- But 60+ different elements animate across the page
- Browser doesn't pre-optimize unlisted elements
- Result: Repaints during animation = jank = dropped frames

**Current declarations (index.html:352-354)**:
```css
.hero-inner, .card, .client-box, .case-row, .dot, .stage, .connecting-line-fill {
  will-change: transform, opacity;
}
```

**Missing from will-change**:
- `.expertise-col` (5+ elements)
- `.award-item` (5+ elements)
- `.award-icon svg` (5+ elements)
- Contact section elements (5+ elements)
- Footer elements (3+ elements)
- Section headings (5+ elements)
- ALL elements with `filter` animations (blur, grayscale) ← especially expensive

**Filter animations without will-change**:
```javascript
// animations.js:502 - Case study images
filter: 'blur(20px)' → 'blur(0px)'

// animations.js:455 - Client images
filter: 'grayscale(100%)' → 'grayscale(0%)'

// animations.js:608 - About image
filter: 'grayscale(100%) blur(10px)' → no filter
```

These are GPU-intensive operations that NEED `will-change: filter` for smooth mobile performance.

---

### Issue #6: Percentage Triggers Without Mobile Context (MEDIUM)
**Severity**: MEDIUM
**Affected**: All ScrollTrigger instances
**User Impact**: Poor timing, animations feel disconnected from scroll

**What happens**:
- Mobile has different aspect ratio (9:16 vs desktop 16:9)
- Mobile content stacks vertically (elements closer together)
- Touch scrolling has momentum (faster than mouse wheel)
- Percentage-based triggers don't account for these differences

**Example**:
```
Desktop (1920×1080):
- Section spacing: 3rem ≈ 48px
- Element height: flexible, side-by-side layouts
- Scroll speed: controlled (mouse wheel)
- Trigger 'top 80%' = 864px → works great

Mobile (375×667):
- Section spacing: same 3rem ≈ 48px (but visually bigger)
- Element height: taller, vertical stacking
- Scroll speed: fast (momentum scrolling)
- Trigger 'top 80%' = 533px → fires too early for tall content
```

---

### Issue #7: Mixed CSS Transitions + GSAP Timeline (MEDIUM)
**Severity**: MEDIUM
**Affected**: Process timeline section
**User Impact**: Inconsistent animation states, broken on fast scroll

**What happens**:
- Timeline animation uses `setTimeout` + CSS classes (animations.js:364-385)
- NOT pure GSAP timelines
- If user scrolls away during animation:
  - `setTimeout` timers continue running
  - CSS transitions keep playing off-screen
  - Animation completes while element is not visible
- When user scrolls back:
  - `hasPlayed` flag prevents replay (line 392)
  - Timeline stuck in incomplete state

**Current implementation (animations.js:364-385)**:
```javascript
function playTimelineAnimation() {
  // Uses setTimeout instead of GSAP timeline
  dots.forEach((dot, index) => {
    setTimeout(() => {
      dot.classList.add('active');  // ← CSS transition
    }, index * 700);
  });

  stages.forEach((stage, index) => {
    setTimeout(() => {
      stage.classList.add('active');  // ← CSS transition
    }, 300 + (index * 700));
  });

  // Line fill animation also uses setTimeout
  // ...
}
```

**Problem scenario**:
```
1. User scrolls to timeline section
2. ScrollTrigger fires playTimelineAnimation()
3. setTimeout schedules 4 animations over 2.8 seconds
4. User scrolls away after 1 second (only 1-2 dots animated)
5. setTimeout timers STILL RUNNING (can't be cancelled)
6. Remaining dots animate off-screen
7. User scrolls back → hasPlayed = true → animation won't replay
8. Timeline stuck in weird partial state
```

---

### Issue #8: Animation Delays on Fast Scroll (MEDIUM)
**Severity**: MEDIUM
**Affected**: Expertise cards, client logos, case studies
**User Impact**: Animations play too late or missed entirely

**What happens**:
- Many animations use stagger delays:
  ```javascript
  delay: index * 0.15  // Expertise: up to 0.75s delay
  delay: shuffledIndexes.indexOf(index) * 0.08  // Clients: up to 1.44s
  delay: blockIndex * 0.15  // Case studies: up to 1.2s
  ```
- Mobile users scroll FAST with momentum
- By the time delayed animation starts, element is off-screen
- User never sees the animation
- Or sees it "late" as elements are scrolling away

**Example**:
```
T=0ms:   Element enters viewport at 'top 85%'
T=0ms:   ScrollTrigger fires animation
T=0ms:   Animation starts with delay: 0.75s
T=400ms: User's fast scroll moves element to 'top 20%'
T=750ms: Delay ends, animation plays
         → But element is already 65% up the screen!
         → User barely sees it or misses it entirely
```

---

## Root Cause Analysis

### Why Desktop Works But Mobile Doesn't

| Factor | Desktop | Mobile | Impact |
|--------|---------|--------|--------|
| **Viewport Height** | Fixed (~900-1080px) | Dynamic (570-667px) | Trigger point shifts |
| **Aspect Ratio** | 16:9 landscape | 9:16 portrait | Different content layout |
| **Content Density** | Side-by-side layouts | Vertical stacking | Elements closer together |
| **Scroll Method** | Mouse wheel (controlled) | Touch (momentum) | Faster, harder to control |
| **GPU Power** | Powerful | Limited | Can't handle many animations |
| **Address Bar** | Doesn't exist | Appears/disappears | Viewport resizes mid-scroll |
| **Image Loading** | Fast (better connection) | Slower (mobile data) | More layout shift |

### Animation Trigger Calculation Issue

**Desktop calculation (works)**:
```
Viewport height: 1080px
Trigger position: 'top 80%' = 0.8 × 1080 = 864px
Element at scroll position: 2000px
Distance to trigger: 2000 - 864 = 1136px

User scrolls 1136px → element hits trigger → animation fires ✓
```

**Mobile calculation (broken)**:
```
Initial viewport: 667px (address bar hidden)
Initial trigger: 0.8 × 667 = 533px

User scrolls → address bar appears
New viewport: 570px
New trigger: 0.8 × 570 = 456px (shifted 77px!)

Element at 1500px
User at scroll: 1000px
Distance to trigger: 1500 - 456 = 1044px
But user thinks distance is: 1500 - 533 = 967px

Element crosses trigger 77px early! Animation fires unexpectedly.
```

### Performance Calculation

**Client logos section**:
```
18 logo boxes × 2 animations each = 36 ScrollTriggers
Each animation:
- Transform (translate, scale, rotate)
- Opacity
- Filter (grayscale) ← GPU intensive

Properties changed per frame:
- 18 × transform = 18 GPU layers
- 18 × opacity = 18 compositing operations
- 18 × filter = 18 GPU filter passes

Total: 54 GPU operations per frame
Target: 60 FPS = 16.67ms per frame
Available: 16.67ms / 54 = 0.3ms per operation

Mobile GPU: Can't keep up → drops to 30 FPS → jittery
```

---

## Detailed Fix Specifications

### FIX #1: Mobile-Aware Trigger Positions

**Priority**: CRITICAL
**Complexity**: Low
**Files**: `animations.js`
**Effort**: 1-2 hours

**Objective**: Adjust trigger positions based on device type and viewport size.

**Implementation**:

**Step 1**: Add helper function at top of animations.js (after line 15):

```javascript
// Responsive trigger position helper
function getTriggerStart(desktopStart = 'top 80%') {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

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
```

**Step 2**: Update ALL ScrollTrigger configurations to use helper:

**Before**:
```javascript
scrollTrigger: {
  trigger: card,
  start: 'top 85%',
  toggleActions: 'play none none reverse'
}
```

**After**:
```javascript
scrollTrigger: {
  trigger: card,
  start: getTriggerStart('top 85%'),
  end: getTriggerEnd(),
  toggleActions: 'play none none reverse'
}
```

**Locations to update**:
- Line 272: Expertise cards
- Line 432: Client boxes
- Line 449: Client images
- Line 496: Case study images
- Line 511: Case study brands
- Line 527: Case study text blocks
- Line 587: About content
- Line 601: About image
- Line 635-698: Awards section (4 instances)
- Line 811: Footer
- Line 846-875: Contact section (5 instances)
- Line 887-917: Section headings (5 instances)

**Expected result**:
- Mobile triggers fire later (when element is more visible)
- Reduced early triggering from viewport height changes
- More consistent animation timing across devices

---

### FIX #2: Add ScrollTrigger Configuration for Mobile

**Priority**: CRITICAL
**Complexity**: Low
**Files**: `animations.js`
**Effort**: 30 minutes

**Objective**: Configure ScrollTrigger globally to handle mobile-specific behaviors.

**Implementation**:

Add after line 19 (after `gsap.config`):

```javascript
// Detect mobile device
function isMobileDevice() {
  return window.innerWidth < 768 ||
         /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

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
```

**Additional: Manual viewport change handling**:

Add after config:

```javascript
// Handle iOS address bar appearing/disappearing
let lastViewportHeight = window.innerHeight;
let resizeTimeout;

window.addEventListener('scroll', () => {
  const currentHeight = window.innerHeight;

  // Significant height change (> 80px) = address bar toggle
  if (Math.abs(currentHeight - lastViewportHeight) > 80) {
    lastViewportHeight = currentHeight;

    // Debounce refresh
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);
  }
}, { passive: true });
```

**Expected result**:
- Throttled callbacks reduce jitter during fast scroll
- Address bar changes trigger refresh (with debounce)
- Fewer unnecessary refreshes on minor viewport changes

---

### FIX #3: Fix Image Load Issues

**Priority**: HIGH
**Complexity**: Medium
**Files**: `animations.js`
**Effort**: 1 hour

**Objective**: Ensure ScrollTrigger refreshes after all images load and page height stabilizes.

**Implementation**:

**Step 1**: Add image load detection function after line 25:

```javascript
// Wait for all images to load before finalizing ScrollTrigger positions
function refreshAfterImages() {
  const images = document.querySelectorAll('img');
  const imagePromises = [];

  images.forEach(img => {
    if (img.complete) {
      // Image already loaded
      return;
    }

    // Create promise for each loading image
    const promise = new Promise((resolve) => {
      img.addEventListener('load', resolve);
      img.addEventListener('error', resolve);  // Resolve even on error

      // Timeout after 10 seconds
      setTimeout(resolve, 10000);
    });

    imagePromises.push(promise);
  });

  // Wait for all images
  if (imagePromises.length > 0) {
    Promise.all(imagePromises).then(() => {
      console.log('All images loaded, refreshing ScrollTrigger');
      ScrollTrigger.refresh();
    });
  }
}
```

**Step 2**: Call function in init:

Replace line 946-947:

**Before**:
```javascript
ScrollTrigger.refresh();
```

**After**:
```javascript
ScrollTrigger.refresh();
refreshAfterImages();  // Refresh again after images load
```

**Step 3**: Add mutation observer for dynamic content:

Add after refreshAfterImages function:

```javascript
// Watch for DOM changes (lazy loaded images, dynamic content)
function observeDOMChanges() {
  let mutationTimeout;

  const observer = new MutationObserver(() => {
    clearTimeout(mutationTimeout);
    mutationTimeout = setTimeout(() => {
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
```

**Step 4**: Call in init (after line 947):

```javascript
observeDOMChanges();
```

**Expected result**:
- ScrollTrigger positions recalculated after images load
- No more missed animations due to incorrect trigger positions
- Handles dynamically loaded content (if any)

---

### FIX #4: Reduce Simultaneous Animations on Mobile

**Priority**: HIGH
**Complexity**: Medium
**Files**: `animations.js`
**Effort**: 2-3 hours

**Objective**: Batch animations and simplify effects on mobile to reduce GPU load.

**Implementation**:

**Step 1**: Update `initClientAnimations` function (lines 421-467):

**Before (lines 431-443)**:
```javascript
clientBoxes.forEach((box, index) => {
  gsap.from(box, {
    scrollTrigger: {
      trigger: box,
      start: 'top 85%',
      toggleActions: 'play none none reverse'
    },
    opacity: 0,
    scale: 0.7,
    rotation: shuffledIndexes[index] % 2 === 0 ? 10 : -10,
    duration: 0.6,
    delay: shuffledIndexes.indexOf(index) * 0.08,
    ease: 'back.out(1.5)'
  });
});
```

**After**:
```javascript
// MOBILE: Batch animations into groups
if (isMobileDevice()) {
  const batchSize = 6;  // Animate 6 at a time

  for (let batch = 0; batch < Math.ceil(clientBoxes.length / batchSize); batch++) {
    const startIdx = batch * batchSize;
    const endIdx = Math.min(startIdx + batchSize, clientBoxes.length);
    const batchBoxes = Array.from(clientBoxes).slice(startIdx, endIdx);

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

  // MOBILE: Skip desaturate animation (expensive filter)
  // Just set images to color immediately
  clientImages.forEach(img => {
    img.style.filter = 'grayscale(0%)';
  });

} else {
  // DESKTOP: Keep existing fancy animations
  const shuffledIndexes = [...Array(clientBoxes.length).keys()]
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
      rotation: shuffledIndexes[index] % 2 === 0 ? 10 : -10,
      duration: 0.6,
      delay: shuffledIndexes.indexOf(index) * 0.08,
      ease: 'back.out(1.5)'
    });
  });

  // DESKTOP: Keep desaturate animation
  clientImages.forEach((img, index) => {
    gsap.to(img, {
      scrollTrigger: {
        trigger: img,
        start: getTriggerStart('top 80%'),
        end: getTriggerEnd(),
        toggleActions: 'play none none reverse'
      },
      filter: 'grayscale(0%)',
      duration: 0.8,
      ease: 'power2.out'
    });
  });
}
```

**Step 2**: Simplify case study animations on mobile (lines 485-543):

Add mobile check:

```javascript
function initCaseStudyAnimations() {
  const caseRows = document.querySelectorAll('.case-row');

  caseRows.forEach((row, rowIndex) => {
    const img = row.querySelector('.case-image img');
    const brand = row.querySelector('.case-brand');
    const textBlocks = row.querySelectorAll('.case-text-block');

    if (isMobileDevice()) {
      // MOBILE: Simpler, faster animations

      if (img) {
        gsap.from(img, {
          scrollTrigger: {
            trigger: row,
            start: getTriggerStart('top 80%'),
            toggleActions: 'play none none none'
          },
          opacity: 0,
          scale: 1.05,  // Subtle scale only
          duration: 0.6
        });
      }

      if (brand) {
        gsap.from(brand, {
          scrollTrigger: {
            trigger: brand,
            start: getTriggerStart('top 80%'),
            toggleActions: 'play none none none'
          },
          opacity: 0,
          y: 20,  // Smaller movement
          duration: 0.5
        });
      }

      if (textBlocks.length > 0) {
        gsap.from(textBlocks, {
          scrollTrigger: {
            trigger: brand || row,
            start: getTriggerStart('top 80%'),
            toggleActions: 'play none none none'
          },
          opacity: 0,
          y: 15,
          stagger: 0.1,  // Faster stagger
          duration: 0.5
        });
      }

    } else {
      // DESKTOP: Keep existing fancy animations
      // ... existing code ...
    }
  });
}
```

**Expected result**:
- Mobile animations load reduced from 36 to 6 at a time
- No expensive filter/rotation animations on mobile
- Smoother scrolling, less jitter
- Still looks good, just simpler

---

### FIX #5: Complete will-change Declarations

**Priority**: HIGH
**Complexity**: Low
**Files**: `index.html` (CSS section)
**Effort**: 15 minutes

**Objective**: Add `will-change` to all animated elements for GPU optimization.

**Implementation**:

Update CSS section (around line 352-354):

**Before**:
```css
.hero-inner, .card, .client-box, .case-row, .dot, .stage, .connecting-line-fill {
  will-change: transform, opacity;
}
```

**After**:
```css
/* Elements with transform/opacity animations */
.hero-inner,
.card,
.client-box,
.case-row,
.dot,
.stage,
.connecting-line-fill,
.expertise-col,
.award-item,
.award-icon svg,
.contact-title,
.contact-name-first,
.contact-name-last,
.contact-phone,
.contact-email,
.contact-instagram,
.footer-inner > *,
.process-header,
.process-title,
.case-brand,
.case-text-block,
.about-content > * {
  will-change: transform, opacity;
}

/* Elements with filter animations (expensive, need separate declaration) */
.case-image img,
.client-box img,
.about-content img,
.awards-image img,
.contact-image img {
  will-change: transform, opacity, filter;
}

/* Remove will-change after animations complete (performance) */
.animated-complete {
  will-change: auto;
}
```

**Additional**: Add class removal after animation completes:

In animations.js, add to all animation configs:

```javascript
onComplete: function() {
  this.targets().forEach(el => el.classList.add('animated-complete'));
}
```

**Expected result**:
- Browser pre-optimizes all animated elements
- Smoother animations, fewer repaints
- Better frame rates on mobile

---

### FIX #6: Mobile-Specific Animation Timing

**Priority**: MEDIUM
**Complexity**: Low
**Files**: `animations.js`
**Effort**: 30 minutes

**Objective**: Reduce animation delays and durations on mobile to match faster scroll speed.

**Implementation**:

**Step 1**: Add timing helper functions (after line 25):

```javascript
// Get appropriate animation delay for device
function getAnimationDelay(desktopDelay) {
  return isMobileDevice() ? desktopDelay * 0.5 : desktopDelay;
}

// Get appropriate animation duration for device
function getAnimationDuration(desktopDuration) {
  return isMobileDevice() ? desktopDuration * 0.75 : desktopDuration;
}

// Get appropriate stagger for device
function getStaggerDelay(desktopStagger) {
  return isMobileDevice() ? desktopStagger * 0.6 : desktopStagger;
}
```

**Step 2**: Apply to all animations:

**Expertise cards (line 272)**:
```javascript
// Before:
delay: index * 0.15,
duration: 0.8

// After:
delay: getAnimationDelay(index * 0.15),
duration: getAnimationDuration(0.8)
```

**Case study text blocks (line 527)**:
```javascript
// Before:
delay: 0.5 + (blockIndex * 0.15),
duration: 0.8

// After:
delay: getAnimationDelay(0.5 + (blockIndex * 0.15)),
duration: getAnimationDuration(0.8)
```

**Contact section (line 858)**:
```javascript
// Before:
stagger: 0.15,
duration: 1

// After:
stagger: getStaggerDelay(0.15),
duration: getAnimationDuration(1)
```

**Apply to ALL animations throughout animations.js**

**Expected result**:
- Mobile animations play 50% faster with shorter delays
- Better sync with fast mobile scrolling
- Users see animations before elements scroll away

---

### FIX #7: Refactor Timeline to Pure GSAP

**Priority**: MEDIUM
**Complexity**: High
**Files**: `animations.js`
**Effort**: 2-3 hours

**Objective**: Replace setTimeout + CSS transitions with GSAP timeline for better control.

**Implementation**:

Replace `playTimelineAnimation` function (lines 342-387):

**Before**:
```javascript
function playTimelineAnimation() {
  const dots = document.querySelectorAll('.dot');
  const stages = document.querySelectorAll('.stage');
  const lineFill = document.getElementById('lineFill');

  if (!dots.length || !stages.length || !lineFill) return;

  const isVertical = isVerticalLayout();

  // Reset
  dots.forEach(dot => dot.classList.remove('active'));
  stages.forEach(stage => stage.classList.remove('active'));

  // Animate with setTimeout (can't be controlled or reversed)
  dots.forEach((dot, index) => {
    setTimeout(() => {
      dot.classList.add('active');
      // ...
    }, index * 700);
  });

  stages.forEach((stage, index) => {
    setTimeout(() => {
      stage.classList.add('active');
    }, 300 + (index * 700));
  });
}
```

**After**:
```javascript
// Store timeline instance globally for control
let timelineTL = null;

function playTimelineAnimation() {
  const dots = document.querySelectorAll('.dot');
  const stages = document.querySelectorAll('.stage');
  const lineFill = document.getElementById('lineFill');

  if (!dots.length || !stages.length || !lineFill) return;

  const isVertical = isVerticalLayout();

  // Kill existing timeline if playing
  if (timelineTL) {
    timelineTL.kill();
  }

  // Reset elements
  dots.forEach(dot => dot.classList.remove('active'));
  stages.forEach(stage => stage.classList.remove('active'));
  gsap.set(lineFill, { [isVertical ? 'height' : 'width']: '0%' });

  // Create GSAP timeline
  timelineTL = gsap.timeline({
    defaults: {
      ease: 'power2.out'
    },
    onComplete: () => {
      hasPlayed = true;
    }
  });

  // Animate dots + line
  dots.forEach((dot, index) => {
    const progress = ((index + 1) / dots.length) * 100;

    timelineTL.add(() => {
      dot.classList.add('active');
    }, index * (isMobileDevice() ? 0.4 : 0.7));

    timelineTL.to(lineFill, {
      [isVertical ? 'height' : 'width']: progress + '%',
      duration: isMobileDevice() ? 0.4 : 0.6
    }, index * (isMobileDevice() ? 0.4 : 0.7));
  });

  // Animate stages (text descriptions)
  stages.forEach((stage, index) => {
    timelineTL.add(() => {
      stage.classList.add('active');
    }, 0.3 + (index * (isMobileDevice() ? 0.4 : 0.7)));
  });
}
```

**Step 3**: Add timeline reset on scroll away:

```javascript
// In ScrollTrigger.create for timeline (around line 395):
ScrollTrigger.create({
  trigger: timeline,
  start: 'top 70%',
  end: 'bottom 20%',
  onEnter: () => {
    if (!hasPlayed) {
      playTimelineAnimation();
    }
  },
  onLeave: () => {
    // Kill timeline if user scrolls away
    if (timelineTL && timelineTL.isActive()) {
      timelineTL.pause();
    }
  },
  onEnterBack: () => {
    // Resume timeline if user scrolls back while playing
    if (timelineTL && !hasPlayed) {
      timelineTL.resume();
    }
  }
});
```

**Expected result**:
- Timeline can be paused/resumed/killed
- No orphaned setTimeout timers
- Better mobile performance
- Consistent states

---

### FIX #8: Add ScrollTrigger Debug Mode

**Priority**: LOW (Development only)
**Complexity**: Low
**Files**: `animations.js`
**Effort**: 15 minutes

**Objective**: Enable visual markers to debug trigger positions on mobile.

**Implementation**:

Add at top of animations.js (line 10):

```javascript
// Debug mode - SET TO FALSE IN PRODUCTION
const DEBUG_MODE = true;

// Helper to add markers in debug mode
function getScrollTriggerConfig(config) {
  if (DEBUG_MODE) {
    return {
      ...config,
      markers: true,
      id: config.id || 'trigger'
    };
  }
  return config;
}
```

Update all ScrollTrigger configs:

**Before**:
```javascript
scrollTrigger: {
  trigger: card,
  start: getTriggerStart('top 85%'),
  toggleActions: 'play none none reverse'
}
```

**After**:
```javascript
scrollTrigger: getScrollTriggerConfig({
  trigger: card,
  start: getTriggerStart('top 85%'),
  toggleActions: 'play none none reverse',
  id: 'expertise-card-' + index  // Unique ID for each trigger
})
```

**Add logging**:

```javascript
if (DEBUG_MODE) {
  console.log('ScrollTrigger initialized:', {
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    isMobile: isMobileDevice(),
    totalTriggers: ScrollTrigger.getAll().length
  });

  // Log each trigger position
  ScrollTrigger.getAll().forEach(st => {
    console.log(`Trigger "${st.vars.id}":`, {
      start: st.start,
      end: st.end,
      trigger: st.trigger
    });
  });
}
```

**Expected result**:
- Visual markers show trigger start/end positions
- Console logs help debug mobile issues
- Easy to identify triggers firing too early/late
- **REMEMBER TO SET DEBUG_MODE = false IN PRODUCTION**

---

### FIX #9: Detect and Optimize for Low-End Devices

**Priority**: LOW
**Complexity**: Medium
**Files**: `animations.js`
**Effort**: 1 hour

**Objective**: Disable expensive animations on low-end mobile devices.

**Implementation**:

**Step 1**: Add device detection (after line 20):

```javascript
// Detect device performance tier
function getDevicePerformanceTier() {
  // Check hardware specs
  const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;
  const lowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

  // Check for old Android
  const oldAndroid = /Android [4-6]/.test(navigator.userAgent);

  // Check connection speed (if available)
  const slowConnection = navigator.connection &&
    (navigator.connection.effectiveType === '2g' ||
     navigator.connection.effectiveType === 'slow-2g');

  if (oldAndroid || slowConnection) return 'low';
  if (lowMemory && lowCores) return 'medium';
  return 'high';
}

const performanceTier = getDevicePerformanceTier();
```

**Step 2**: Conditionally disable animations:

```javascript
function shouldSkipExpensiveAnimations() {
  return performanceTier === 'low';
}

function shouldSimplifyAnimations() {
  return performanceTier === 'medium' || performanceTier === 'low';
}
```

**Step 3**: Apply to animations:

```javascript
// In initClientAnimations:
if (shouldSkipExpensiveAnimations()) {
  // No animations, just show content
  clientBoxes.forEach(box => {
    gsap.set(box, { opacity: 1, scale: 1 });
  });
  clientImages.forEach(img => {
    img.style.filter = 'grayscale(0%)';
  });
  return;
}

// In case study animations:
if (shouldSimplifyAnimations()) {
  // Skip blur filter (expensive)
  gsap.from(img, {
    scrollTrigger: { /* ... */ },
    opacity: 0,
    scale: 1.05,
    // filter: 'blur(20px)'  ← Skip this
  });
}
```

**Expected result**:
- Low-end devices get instant content (no animations)
- Medium devices get simplified animations
- Better experience across all device tiers

---

### FIX #10: Add Animation Performance Monitoring

**Priority**: LOW (Optional)
**Complexity**: Medium
**Files**: `animations.js`
**Effort**: 1-2 hours

**Objective**: Monitor frame rates and detect animation performance issues.

**Implementation**:

```javascript
// Performance monitoring (development only)
class AnimationPerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 60;
    this.warnings = [];
  }

  start() {
    this.checkFrame();
  }

  checkFrame() {
    this.frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;

    // Calculate FPS every second
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);

      // Warn if FPS drops below 50
      if (this.fps < 50) {
        this.warnings.push({
          time: new Date().toISOString(),
          fps: this.fps,
          scroll: window.scrollY
        });
        console.warn(`Low FPS detected: ${this.fps} at scroll ${window.scrollY}px`);
      }

      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    requestAnimationFrame(() => this.checkFrame());
  }

  getReport() {
    return {
      currentFPS: this.fps,
      warnings: this.warnings
    };
  }
}

// Initialize monitor in debug mode
if (DEBUG_MODE) {
  const monitor = new AnimationPerformanceMonitor();
  monitor.start();

  // Expose to console
  window.getAnimationReport = () => monitor.getReport();
}
```

**Expected result**:
- Real-time FPS monitoring in console
- Warnings when performance drops
- Data to identify problematic scroll positions
- Call `window.getAnimationReport()` in console for summary

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Do These First)

These fixes address the most severe issues causing broken animations on mobile.

**1. FIX #1: Mobile-Aware Trigger Positions**
- Impact: HIGH
- Effort: 1-2 hours
- Fixes: Early/late triggers, inconsistent animation timing

**2. FIX #2: ScrollTrigger Mobile Configuration**
- Impact: HIGH
- Effort: 30 minutes
- Fixes: Viewport height changes, address bar issues

**3. FIX #3: Image Load Handling**
- Impact: HIGH
- Effort: 1 hour
- Fixes: Animations not triggering at all

**Total Phase 1 Time**: 3-4 hours
**Expected Improvement**: 60-70% of mobile issues resolved

---

### Phase 2: Performance Optimizations (Do These Next)

These fixes improve smoothness and reduce jitter.

**4. FIX #4: Reduce Simultaneous Animations**
- Impact: MEDIUM-HIGH
- Effort: 2-3 hours
- Fixes: Jittery scrolling, dropped frames

**5. FIX #5: Complete will-change Declarations**
- Impact: MEDIUM-HIGH
- Effort: 15 minutes
- Fixes: Janky animations, repaints

**6. FIX #6: Mobile Animation Timing**
- Impact: MEDIUM
- Effort: 30 minutes
- Fixes: Late animations, better scroll sync

**Total Phase 2 Time**: 3-4 hours
**Expected Improvement**: Smooth, consistent animations

---

### Phase 3: Refinements (Do These Last)

These fixes polish the experience and add safety nets.

**7. FIX #7: Refactor Timeline to GSAP**
- Impact: MEDIUM
- Effort: 2-3 hours
- Fixes: Timeline inconsistencies, better control

**8. FIX #8: Debug Mode**
- Impact: LOW (development only)
- Effort: 15 minutes
- Benefit: Easier debugging

**9. FIX #9: Low-End Device Detection**
- Impact: LOW (edge cases)
- Effort: 1 hour
- Benefit: Better experience on budget phones

**10. FIX #10: Performance Monitoring**
- Impact: LOW (optional)
- Effort: 1-2 hours
- Benefit: Data-driven optimization

**Total Phase 3 Time**: 4-6 hours
**Expected Improvement**: Edge case handling, better developer experience

---

## Testing Checklist

After each fix, test on:

### Devices:
- [ ] iPhone SE (375×667, small screen)
- [ ] iPhone 12/13 (390×844, standard)
- [ ] iPhone 14 Pro Max (430×932, large)
- [ ] Android phone (various sizes)
- [ ] iPad (768×1024, tablet)

### Browsers:
- [ ] iOS Safari (primary mobile browser)
- [ ] Chrome Mobile (Android primary)
- [ ] Firefox Mobile
- [ ] Samsung Internet

### Scroll Scenarios:
- [ ] Slow scroll (controlled)
- [ ] Fast scroll (momentum/fling)
- [ ] Scroll up and down repeatedly
- [ ] Address bar appearing/disappearing
- [ ] Landscape → Portrait rotation

### Sections to Verify:
- [ ] Hero section (initial load)
- [ ] Expertise cards (5+ items)
- [ ] Process timeline (complex animation)
- [ ] Client logos (18 items, heavy)
- [ ] Case studies (images + text)
- [ ] Awards section
- [ ] Contact section
- [ ] Footer

---

## Quick Reference: Common Issues → Fixes

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Animations don't trigger | Images loaded late | FIX #3 |
| Trigger too early | Viewport height issue | FIX #1, #2 |
| Trigger too late | Desktop trigger positions | FIX #1 |
| Jittery scrolling | Too many animations | FIX #4 |
| Dropped frames | Missing will-change | FIX #5 |
| Animation plays off-screen | Delays too long | FIX #6 |
| Timeline stuck in weird state | CSS + setTimeout | FIX #7 |
| Address bar breaks triggers | No viewport handling | FIX #2 |

---

## Notes

- **DO NOT skip Phase 1** - these are critical fixes
- **Test after EACH fix** - don't implement all at once
- **Keep DEBUG_MODE = false** in production
- **Consider performance tier** when optimizing
- **Backup animations.js** before making changes

---

## Estimated Total Implementation Time

- **Phase 1 (Critical)**: 3-4 hours
- **Phase 2 (Performance)**: 3-4 hours
- **Phase 3 (Refinements)**: 4-6 hours
- **Testing**: 2-3 hours

**Grand Total**: 12-17 hours

---

## Questions or Issues?

When implementing these fixes, test thoroughly and note any unexpected behaviors. Some animations may need fine-tuning based on actual device testing.

**Priority Order**: FIX #1 → #2 → #3 → #4 → #5 → #6 → #7 → #8 → #9 → #10

Let's address these one by one!
