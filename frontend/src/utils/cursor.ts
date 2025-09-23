/**
 * Cursor persistence utility for maintaining custom cursor during all interactions
 * including right-clicks, context menus, and other browser events
 */

// Cursor configuration
const CURSOR_CONFIG = {
    default: "url('/yugioh-cursor.png'), auto",
    pointer: "url('/yugioh-cursor.png'), pointer",
    text: "url('/yugioh-cursor.png'), text",
};

/**
 * Force cursor style on an element
 */
function applyCursor(element: HTMLElement, cursorType: keyof typeof CURSOR_CONFIG = 'default') {
    if (element && element.style) {
        element.style.cursor = CURSOR_CONFIG[cursorType];
    }
}

/**
 * Ensure cursor persists throughout the application
 */
function initializeCursorPersistence() {
    // Apply cursor to document body
    applyCursor(document.body);

    // Handle context menu events
    document.addEventListener('contextmenu', (e) => {
        // Force cursor refresh after a brief delay
        setTimeout(() => {
            applyCursor(document.body);
            applyCursor(e.target as HTMLElement);
        }, 50);
    });

    // Handle mouse events that might reset cursor
    ['mousedown', 'mouseup', 'mouseover', 'mouseout', 'mousemove'].forEach(eventType => {
        document.addEventListener(eventType, (e) => {
            const target = e.target as HTMLElement;

            // Determine appropriate cursor type based on element
            let cursorType: keyof typeof CURSOR_CONFIG = 'default';

            if (target.matches('button, .btn-primary, .btn-secondary, .btn-icon, a, [role="button"], .clickable')) {
                cursorType = 'pointer';
            } else if (target.matches('input, textarea, [contenteditable="true"]')) {
                cursorType = 'text';
            }

            applyCursor(target, cursorType);
        });
    });

    // Handle focus events
    document.addEventListener('focusin', (e) => {
        const target = e.target as HTMLElement;
        if (target.matches('input, textarea, [contenteditable="true"]')) {
            applyCursor(target, 'text');
        }
    });

    // Periodically refresh cursor (fallback)
    setInterval(() => {
        if (document.body.style.cursor !== CURSOR_CONFIG.default) {
            applyCursor(document.body);
        }
    }, 1000);
}

/**
 * Initialize cursor persistence when DOM is ready
 */
function initCursor() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCursorPersistence);
    } else {
        initializeCursorPersistence();
    }
}

// Export for use in other modules
export { initCursor, applyCursor, CURSOR_CONFIG };

// Auto-initialize if this script is loaded directly
if (typeof window !== 'undefined') {
    initCursor();
}