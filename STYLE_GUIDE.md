# NotiESET - Style Guide Documentation

## Overview

NotiESET is a news platform for ESET UNQ (Universidad Nacional de Quilmes) that combines traditional news content with an integrated forum system. The project uses vanilla CSS with custom styling, no CSS framework like Tailwind CSS is implemented. The design follows a dark theme approach with red accent colors representing the ESET brand identity.

### Project Structure
- **Frontend**: Vanilla JavaScript with custom CSS modules
- **Backend**: Node.js/Express with REST API
- **Styling Approach**: Custom CSS with responsive design patterns
- **JavaScript Framework**: Vanilla ES6+ with modular architecture

---

## Color Palette

### Primary Colors

**ESET Brand Red**
- **Primary Red**: `#b60000` - Main brand color for buttons, links, and accents
- **Hover Red**: `#d00000` - Interactive hover state
- **Dark Red**: `#960000` - Used for disabled states (implied)

**Background Colors**
- **Main Background**: `#2f2f2f` - Dark theme background
- **Content Background**: `#444` - Semi-dark for content sections
- **Article Background**: `#e0e0e0` - Light background for articles
- **White**: `#ffffff` - Text color and highlights
- **Light Gray**: `#f8f9fa` - Form controls and forum elements

**Navigation & UI Elements**
- **Navigation Bar**: `#3a3a3a` - Dark navigation background
- **Footer Background**: `#1a1a1a` - Dark footer
- **Input Fields**: `#ffffff` - White input backgrounds
- **Borders**: `#ddd`, `#ced4da`, `#ccc` - Various border strengths

**Status Colors**
- **Success**: `#28a745` - Green for success states
- **Error**: `#dc3545` - Red for error states
- **Warning**: `#ffc107` - Yellow/orange for warnings
- **Info**: `#007bff` - Blue for informational elements

**Text Colors**
- **Primary Text**: `#ffffff` - White on dark backgrounds
- **Secondary Text**: `#666` - Muted text for metadata
- **Dark Text**: `#000000` - Black on light backgrounds
- **Link Text**: `#007bff` - Blue links

---

## Typography

### Font Families
- **Primary**: `Arial, sans-serif` - Main body font
- **System Fallback**: Browser default sans-serif

### Font Sizes and Weights

**Headings**
- **H1**: `4vw` (responsive) / `4rem` - Main page title, **Bold**
- **H2**: `2em` (mobile: `1.5em`) - Section headers
- **H3**: `1.2em` (mobile: `1.2em`) - Subsection headers
- **H4**: Default - Article titles and form headers

**Body Text**
- **Main Content**: `1em` / `16px` - Standard paragraph text
- **Small Text**: `0.95em` - User info and metadata
- **Form Labels**: `14px` - Form field labels
- **Button Text**: `1em` - Consistent with body text

**Font Weight Hierarchy**
- **Bold**: `font-weight: bold` - Headings, buttons, navigation links
- **Medium**: `font-weight: 500` - Form labels, category badges
- **Normal**: `font-weight: normal` - Body text
- **Light**: Used sparingly for secondary information

**Typography Usage Patterns**
```css
/* Main heading */
h1 {
    font-size: 4vw;
    color: white;
    background-color: rgba(190, 0, 0, 0.8);
    /* Bold weight implied */
}

/* Section headings */
h2, h3 {
    color: #b60000; /* ESET red */
    font-weight: bold;
}

/* Body text */
p, article {
    font-size: 1em;
    line-height: 1.5;
}

/* Form elements */
label {
    font-weight: 500;
    font-size: 14px;
}
```

---

## Spacing System

### Margin and Padding Scale

**Micro Spacing (2-8px)**
- `2px` - Fine details, borders
- `4px` - Small element spacing
- `5px` - Form padding
- `6px` - Button padding (small)
- `8px` - Compact spacing

**Small Spacing (10-20px)**
- `10px` - Standard form padding, gaps
- `12px` - Moderate padding
- `15px` - Section spacing
- `20px` - Content sections

**Medium Spacing (25-50px)**
- `30px` - Large section gaps
- `40px` - Major spacing
- `50px` - Header padding

**Layout Spacing**
- `1em` - Relative spacing unit
- `1.5em` - Form gaps, moderate spacing
- `2em` - Large spacing

### Responsive Spacing
```css
/* Desktop */
header {
    padding: 5rem;
}

/* Tablet */
@media screen and (max-width: 900px) {
    header {
        padding: 2rem 1rem;
    }
}

/* Mobile */
@media screen and (max-width: 600px) {
    header {
        padding: 1rem 0.5rem;
    }
}
```

---

## Component Styles

### Navigation Components

**Main Navigation Bar (barra-navegacion)**
```css
.barra-navegacion {
    background-color: #3a3a3a;
    padding: 0.5em 0;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}

.barra-navegacion a {
    color: white;
    text-decoration: none;
    font-weight: bold;
    padding: 0.3em 0.6em;
}

.barra-navegacion a:hover {
    background-color: #b60000;
    border-radius: 4px;
    text-decoration: underline;
}
```

**Authentication Buttons**
```css
#header-auth-btn, #header-logout-btn {
    background-color: #b60000;
    color: white;
    border: none;
    padding: 0.5em 1em;
    border-radius: 5px;
    font-weight: bold;
    cursor: pointer;
    font-size: 1em;
}
```

### Form Components

**Input Fields**
```css
input[type="text"],
input[type="email"],
input[type="password"],
select,
textarea {
    padding: 0.5em;
    border: none;
    border-radius: 5px;
    font-size: 1em;
    width: 100%;
    box-sizing: border-box;
}
```

**Buttons**
```css
button, .btn {
    background-color: #b60000;
    color: white;
    border: none;
    padding: 0.7em;
    border-radius: 5px;
    font-weight: bold;
    cursor: pointer;
    width: 100%;
    font-size: 1em;
}

button:hover, .btn:hover {
    background-color: #d00000;
}
```

**Button Variants**
```css
.btn-primary {
    background-color: #b60000;
    color: white;
}

.btn-secondary {
    background-color: #6c757d;
    color: white;
}

.btn-link {
    background: none;
    color: #007bff;
    text-decoration: underline;
}
```

### Forum Components

**Topic Cards (tema)**
```css
.tema {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tema:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

**Comment System**
```css
.comentario {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 12px;
    margin: 8px 0;
    transition: background-color 0.2s ease;
}

.comentario.nivel-1 {
    background: #e9ecef;
}

.comentario.nivel-2 {
    background: #dee2e6;
}
```

**Pagination Controls**
```css
.pagination-btn {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    color: #007bff;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
}

.page-number {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    color: #007bff;
    cursor: pointer;
}

.page-number.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
}
```

### Content Components

**Articles and News**
```css
article {
    background-color: #e0e0e0;
    color: #000;
    padding: 1em;
    margin: 1em 0;
    border-radius: 8px;
}

article h3 {
    color: #b60000;
}
```

**Image Galleries**
```css
.galeria-swiper {
    width: 90%;
    max-width: 1000px;
    margin: 0 auto;
    padding: 2em 0;
}

.contenedor-imagenes {
    display: flex;
    justify-content: center;
    gap: 10px;
}

.contenedor-imagenes img {
    width: 400px;
    max-width: 100%;
    height: auto;
    object-fit: contain;
    border-radius: 5px;
}
```

---

## Shadows and Elevation

### Box Shadow Hierarchy

**No Elevation**
```css
/* Base level elements */
header, footer {
    box-shadow: none;
}
```

**Low Elevation (2px)**
```css
.barra-navegacion {
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}
```

**Medium Elevation (4-10px)**
```css
.tema:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.loading-indicator {
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}
```

**High Elevation (10px+)**
```css
.scroll-top-btn {
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.keyboard-shortcuts {
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
```

### Focus States
```css
:focus-visible {
    outline: 2px solid #007bff;
    outline-offset: 2px;
}

.filter-group select:focus,
.filter-group input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}
```

---

## Animations and Transitions

### Transition Patterns

**Standard Transitions**
```css
/* Fast transitions (0.2s) */
.pagination-btn,
.page-number,
.btn-crear-tema,
button {
    transition: all 0.2s ease;
}

.tema-actions button:hover {
    background: #e9ecef;
    transition: background-color 0.2s;
}

/* Medium transitions (0.3s) */
.fade-in {
    animation: fadeIn 0.3s ease-in-out;
}

.slide-up {
    animation: slideUp 0.3s ease-out;
}
```

**Hover Effects**
```css
.tema {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tema:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.pagination-btn:hover:not(:disabled) {
    background: #007bff;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}
```

### Keyframe Animations

**Fade In Animation**
```css
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.fade-in {
    opacity: 0;
    transform: translateY(20px);
    animation: fadeIn 0.5s ease forwards;
}
```

**Slide Up Animation**
```css
@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.slide-up {
    animation: slideUp 0.3s ease-out;
}
```

**Loading Spinner**
```css
.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top-color: #007bff;
    animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
```

**Pulse Animation**
```css
@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}

.status-indicator.loading {
    background-color: #ffc107;
    animation: pulse 1.5s infinite;
}
```

---

## Border Radius

### Border Radius Scale

**No Radius**
```css
/* Structural elements */
main section, .barra-navegacion {
    border-radius: 0;
}
```

**Small Radius (3-5px)**
```css
input, select, textarea, button {
    border-radius: 5px;
}

.pagination-btn, .page-number {
    border-radius: 4px;
}

.comment-actions button {
    border-radius: 3px;
}
```

**Medium Radius (6-8px)**
```css
article, .tema {
    border-radius: 8px;
}

.comentario {
    border-radius: 6px;
}

.foro-controls, .pagination-container {
    border-radius: 8px;
}
```

**Large Radius (10-15px)**
```css
/* Connection status indicator */
.connection-status {
    border-radius: 15px;
}

/* Circular elements */
.scroll-top-btn, .status-indicator {
    border-radius: 50%;
}
```

---

## Opacity and Transparency

### Opacity Scale

**Fully Transparent**
```css
/* Hidden elements */
.hidden {
    opacity: 0;
}
```

**Low Transparency (0.7-0.8)**
```css
/* Header background overlay */
header h1 {
    background-color: rgba(190, 0, 0, 0.8);
}

/* Connection status background */
.connection-status {
    background-color: rgba(255, 255, 255, 0.8);
}
```

**Medium Transparency (0.5-0.6)**
```css
/* Loading states */
.temas-list {
    opacity: 0.5;
}

/* Overlays */
.performance-report-modal {
    background-color: rgba(0, 0, 0, 0.5);
}
```

**High Transparency (0.1-0.3)**
```css
/* Keyboard shortcuts panel */
.keyboard-shortcuts {
    opacity: 0;
    transition: opacity 0.3s ease;
}

.keyboard-shortcuts.show {
    opacity: 1;
}

/* Status indicator backgrounds */
#header-user-info {
    background: rgba(0,0,0,0.3);
}
```

**Loading States**
```css
/* Image lazy loading */
img[data-src] {
    background-color: #f8f9fa;
    filter: blur(5px);
    transition: filter 0.3s ease;
}

img.loaded {
    filter: blur(0);
}
```

---

## Common CSS Usage Patterns

### Layout Patterns

**Flexbox Usage**
```css
/* Navigation */
.barra-navegacion ul {
    display: flex;
    justify-content: center;
    gap: 1.5em;
    flex-wrap: wrap;
}

/* Forms */
form {
    display: flex;
    flex-direction: column;
    gap: 0.8em;
}

/* Forum filters */
.foro-filters {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    align-items: end;
}
```

**Grid and Container Patterns**
```css
/* Main content container */
main section {
    background-color: #444;
    margin: 1.5em auto;
    padding: 1em;
    max-width: 1000px;
    border-radius: 8px;
    box-sizing: border-box;
}

/* Image containers */
.contenedor-imagenes {
    display: flex;
    justify-content: center;
    gap: 10px;
}
```

### Positioning Patterns

**Fixed Positioning**
```css
/* Scroll to top button */
.scroll-top-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
}

/* Connection status */
.connection-status {
    position: fixed;
    top: 10px;
    left: 10px;
}

/* Message notifications */
.message {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
}
```

**Absolute Positioning**
```css
/* Logo container */
.logo-container {
    position: absolute;
    top: 10px;
    left: 10px;
}

/* Header auth area */
#header-auth-area {
    position: absolute;
    top: 20px;
    right: 30px;
}
```

---

## Responsive Design Patterns

### Breakpoint System

**Desktop (>900px)**
- Full navigation layout
- Multi-column image galleries
- Full-width content sections

**Tablet (600px - 900px)**
- Adjusted padding and spacing
- Responsive font sizes
- Simplified navigation

**Mobile (<600px)**
- Stacked navigation
- Single column layout
- Touch-friendly targets
- Reduced spacing

### Media Query Examples

```css
/* Tablet styles */
@media screen and (max-width: 900px) {
    header {
        padding: 2rem 1rem;
    }

    .logo {
        height: 120px;
    }

    main section {
        max-width: 95vw;
        padding: 1em;
    }
}

/* Mobile styles */
@media screen and (max-width: 600px) {
    header {
        padding: 1rem 0.5rem;
    }

    .logo {
        height: 70px;
    }

    .barra-navegacion ul {
        flex-direction: column;
        align-items: center;
        gap: 1em;
    }

    .contenedor-imagenes {
        flex-direction: column;
        gap: 0.5em;
        width: 100vw;
    }

    /* Form adjustments */
    form input,
    form select,
    form textarea,
    form button {
        width: 100%;
        box-sizing: border-box;
        font-size: 1em;
    }
}
```

---

## Example Component Reference

### Complete Button Component

```css
/* Base button styles */
.btn {
    display: inline-block;
    padding: 10px 20px;
    border: 1px solid transparent;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
}

/* Button variants */
.btn-primary {
    background-color: #b60000;
    color: white;
    border-color: #b60000;
}

.btn-primary:hover {
    background-color: #d00000;
    transform: translateY(-1px);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.btn-secondary {
    background-color: #6c757d;
    color: white;
    border-color: #6c757d;
}

.btn-outline {
    background-color: transparent;
    color: #b60000;
    border-color: #b60000;
}

.btn-outline:hover {
    background-color: #b60000;
    color: white;
}

/* Button states */
.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.btn:active {
    transform: translateY(0);
}

/* Button sizes */
.btn-sm {
    padding: 6px 12px;
    font-size: 12px;
}

.btn-lg {
    padding: 14px 28px;
    font-size: 16px;
}
```

### Complete Form Component

```css
/* Form container */
.form-group {
    margin-bottom: 15px;
}

/* Form labels */
.form-label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    font-size: 14px;
    color: #ffffff;
}

/* Form inputs */
.form-control {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
    background-color: #ffffff;
    color: #000000;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    box-sizing: border-box;
}

.form-control:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-control::placeholder {
    color: #666;
    opacity: 1;
}

/* Form validation */
.form-control.is-valid {
    border-color: #28a745;
}

.form-control.is-invalid {
    border-color: #dc3545;
}

/* Form feedback */
.form-text {
    font-size: 12px;
    color: #666;
    margin-top: 5px;
}

.form-error {
    color: #dc3545;
    font-size: 12px;
    margin-top: 5px;
}
```

### Complete Card Component

```css
/* Base card */
.card {
    background: #ffffff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* Card hover effect */
.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Card header */
.card-header {
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
}

.card-title {
    margin: 0;
    color: #333;
    font-size: 1.25em;
    font-weight: bold;
}

.card-subtitle {
    margin: 5px 0 0 0;
    color: #666;
    font-size: 0.9em;
}

/* Card body */
.card-body {
    margin-bottom: 15px;
}

.card-text {
    line-height: 1.5;
    color: #333;
}

/* Card footer */
.card-footer {
    padding-top: 10px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-meta {
    font-size: 0.9em;
    color: #666;
}

/* Card actions */
.card-actions {
    display: flex;
    gap: 8px;
    margin-top: 15px;
}
```

---

## Accessibility Guidelines

### Focus Management

**Visible Focus States**
```css
.focusable-element:focus-visible {
    outline: 2px solid #007bff;
    outline-offset: 2px;
}
```

**Keyboard Navigation**
```css
/* Skip links */
.skip-link {
    position: absolute;
    top: -40px;
    left: 6px;
    background: #b60000;
    color: white;
    padding: 8px;
    text-decoration: none;
    border-radius: 4px;
    z-index: 1000;
}

.skip-link:focus {
    top: 6px;
}
```

### Screen Reader Support

**Visually Hidden Content**
```css
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
```

**ARIA Labels**
```html
<button aria-label="Cerrar menú" aria-expanded="false">×</button>
<div role="region" aria-labelledby="foro-heading" aria-label="Lista de temas del foro"></div>
```

---

## Performance Considerations

### CSS Optimization

**Efficient Selectors**
```css
/* Good: Specific but not overly specific */
.tema .tema-actions button {
    padding: 6px 12px;
}

/* Avoid: Overly specific selectors */
div.container div.content div.tema div.actions button.edit {
    padding: 6px 12px;
}
```

**Animation Performance**
```css
/* Use transform and opacity for smooth animations */
.smooth-transition {
    will-change: transform;
    transform: translateZ(0);
    backface-visibility: hidden;
}

.animate-slide {
    transition: transform 0.3s ease;
}
```

**Responsive Images**
```css
img {
    max-width: 100%;
    height: auto;
    border-radius: 5px;
}
```

### CSS Organization

**File Structure**
```
frontend/src/
├── style.css          # Main styles
├── forum.css          # Forum-specific styles
└── components/         # Component-specific styles (if needed)
    ├── buttons.css
    ├── forms.css
    └── cards.css
```

---

## Brand Guidelines

### Logo Usage
- **Primary Logo**: `assets/logo eset.png`
- **Favicon**: `assets/favicon.ico`
- **Size Variations**: Use appropriate scaling for different contexts

### Brand Colors
- **Primary**: Always use `#b60000` for primary ESET branding
- **Consistency**: Maintain consistent color usage across all components
- **Contrast**: Ensure sufficient contrast ratios for accessibility

### Typography Consistency
- **Headings**: Maintain consistent hierarchy with ESET red for emphasis
- **Body Text**: Use standard font sizes for readability
- **UI Text**: Maintain consistent font weights and sizes

---

## Debugging and Development

### Development Tools

**CSS Debug Classes**
```css
/* Temporary debugging classes */
.debug-border {
    border: 2px solid red !important;
}

.debug-bg {
    background-color: rgba(255, 0, 0, 0.1) !important;
}
```

**Performance Monitoring**
```css
/* Performance optimization hints */
.optimize-render {
    will-change: transform;
    contain: layout style paint;
}
```

### Browser Compatibility

**Supported Browsers**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox support required
- ES6+ JavaScript support required

**Fallbacks**
```css
/* Graceful degradation for older browsers */
@supports not (display: grid) {
    .fallback-layout {
        display: block;
    }
}
```

This comprehensive style guide serves as the foundation for maintaining consistency and quality across the NotiESET platform. All new components and features should reference these guidelines to ensure a cohesive user experience.