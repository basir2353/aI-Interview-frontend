/** Feature flags — off unless explicitly enabled via env. */

/** Landing pricing section + nav/footer Pricing links. Default: hidden (not selling). */
export const SHOW_PRICING = process.env.NEXT_PUBLIC_SHOW_PRICING === 'true';
