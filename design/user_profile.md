# Design System Strategy: The Sacred Archive

## 1. Overview & Creative North Star
The "Sacred Archive" is the creative north star for this design system. It moves away from the clinical, "boxed-in" feel of traditional Learning Management Systems (LMS) to create an experience that feels like a modern digital cathedral—solemn, authoritative, and deeply focused. 

We break the "template" look by utilizing **Editorial Breath**: expansive white space combined with high-contrast typography scales. We reject the rigid 1px border. Instead, we use intentional asymmetry and tonal layering to guide the eye. This is not just a tool for learning; it is a premium environment for formation.

## 2. Colors & Surface Philosophy
The palette centers on a triad of Deep Blue (`primary`), Subtle Gold (`secondary`), and Cream White (`background`).

### The "No-Line" Rule
Designers are strictly prohibited from using 1px solid borders to define sections or containers. Visual hierarchy must be achieved through:
*   **Background Shifts:** Transitioning from `surface` to `surface-container-low` to define a sidebar or header.
*   **Tonal Transitions:** Using `surface-container-highest` for elevated cards against a `surface` background.

### Surface Hierarchy & Nesting
Think of the UI as physical layers of fine paper.
*   **Level 0 (Foundation):** `surface` (`#faf9f6`) - The base canvas.
*   **Level 1 (Sections):** `surface-container-low` (`#f4f3f1`) - Used for large structural areas like sidebars or content buckets.
*   **Level 2 (Active Elements):** `surface-container-lowest` (`#ffffff`) - Reserved for the most important interactive cards or input areas to make them "pop" against the cream background.

### The "Glass & Gradient" Rule
To capture the "Finpay" aesthetic, use Glassmorphism for floating elements (e.g., navigation bars or modal overlays). Apply `surface-tint` at 10% opacity with a `20px` backdrop blur. 
*   **Signature Texture:** Main CTAs or Hero backgrounds should use a subtle linear gradient from `primary` (`#002046`) to `primary_container` (`#1b365d`) at a 135-degree angle. This adds "soul" and depth that flat color cannot replicate.

## 3. Typography: The Editorial Voice
We use a dual-typeface system to balance authority with modern readability.

*   **Inter (The Authority):** Used for `display`, `headline`, and `label` scales. Inter’s neutral, high-x-height character provides the solemn, professional "Finpay" vibe. 
    *   *Usage:* Use `display-lg` for course titles to create a high-end editorial feel.
*   **Lexend (The Guide):** Used for `title` and `body` scales. Lexend was designed specifically for reading proficiency, making it perfect for long-form biblical study and curriculum content.
    *   *Hierarchy:* `headline-md` (Inter) for section headers paired with `body-lg` (Lexend) for descriptions creates a sophisticated, multi-layered information architecture.

## 4. Elevation & Depth
Depth in this system is organic, not structural.

*   **The Layering Principle:** Instead of shadows, stack containers. A `surface-container-highest` card sitting on a `surface-container-low` background creates a "soft lift" that feels premium and intentional.
*   **Ambient Shadows:** For floating elements (like a "Continue Lesson" FAB), use a custom shadow: 
    *   `X: 0, Y: 8, Blur: 24, Spread: -4` 
    *   Color: `on_surface` (`#1a1c1a`) at 6% opacity. This mimics natural light rather than a digital drop shadow.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline_variant` at **15% opacity**. It should be felt, not seen.
*   **Roundedness:** Stick strictly to the `DEFAULT` (8px) for cards and inputs. Use `full` (9999px) only for Pills and Chips.

## 5. Components

### Buttons
*   **Primary:** `primary` background, `on_primary` text. High-contrast, no shadow unless hovered.
*   **Secondary:** `secondary_fixed_dim` background with `on_secondary_fixed` text. This brings in the "Subtle Gold" for high-value actions like "Enroll" or "Submit."
*   **Tertiary:** Transparent background, `primary` text, bold weight.

### Input Fields
*   **Style:** `surface-container-lowest` background. 
*   **Indicator:** Instead of a full border, use a 2px bottom-accent in `outline_variant` that transitions to `secondary` (Gold) on focus.
*   **Roundedness:** `sm` (4px) or `DEFAULT` (8px).

### Cards & Lists
*   **No Dividers:** Forbid the use of horizontal lines. 
*   **Separation:** Use `8px` to `16px` of vertical white space or a subtle shift to `surface-container-high` on hover to indicate interactivity.
*   **Progress Cards:** For course progress, use a `primary` track with a `secondary` (Gold) indicator to signify the "value" of the student's journey.

### Additional Components: The "Sacred" Components
*   **Scripture Block:** A specialized `surface-container-highest` callout with a `secondary` (Gold) left-edge accent (4px width) for biblical quotes.
*   **Focus-Mode Toggle:** A glassmorphic overlay that dims the `surface` background to `primary` (90% opacity), leaving only the lesson text in `surface-container-lowest`.

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts (e.g., a wide left column for text and a narrow, floating right column for lesson metadata).
*   **Do** prioritize "Lexend" for any text over two sentences long.
*   **Do** use `on_surface_variant` for secondary information to keep the UI from feeling "heavy."

### Don't
*   **Don't** use 100% black. Use `on_background` (#1a1c1a) for text to maintain a solemn, soft contrast.
*   **Don't** use standard Material Design "elevated" shadows. Stick to the Ambient Shadow spec or Tonal Layering.
*   **Don't** use vibrant, saturated colors outside of the defined `primary` and `secondary` tokens. This is a space for reflection, not overstimulation.