/**
 * Design tokens for the app's styling (React Native StyleSheet).
 *
 * This is the single source of truth for colors and typography. The values
 * were taken from the brand palette originally sketched in src/global.css, but
 * this project targets iOS only — global.css applied only to a (now unused)
 * web build, so these TS tokens are what the app actually uses.
 */

// Colors — the brand palette.
export const colors = {
    background: '#fffdf9',
    backgroundAlt: '#fcfbf7',
    surface: '#ffffff',
    surfaceSoft: '#eaf4e8',
    surfaceSoftAlt: '#eaf3e9',

    primary: '#0e654c',
    onPrimary: '#ffffff',
    heading: '#123f34',
    deepGreen: '#173f35',
    text: '#40524d',
    textMuted: '#667772',

    border: '#d7e2dd',
    borderSoft: '#dde5df',
    borderStrong: '#b8cbc4',
    controlOutline: '#9bb7ad',

    success: '#0e654c',
    warning: '#b95032',

    // Food illustration accents
    foodBackdrop: '#d7e8d4',
    foodGreen: '#77a86c',
    foodOrange: '#e4a66c',
    foodYellow: '#f5d177',
} as const;

// Type scale in px — converted from global.css's rem values at a 16px base.
export const fontSize = {
    xs: 11, // captions, navigation
    sm: 12, // labels, metadata
    base: 13, // body, inputs
    md: 14, // card titles, buttons
    lg: 19, // section headings
    xl: 21, // detail page title
    xxl: 25, // main page headings
} as const;

// Font weights matching global.css's --font-weight-* tokens.
// Typed as RN fontWeight literals via `as const`.
export const fontWeight = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
} as const;
