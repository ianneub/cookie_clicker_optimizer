/**
 * Type declarations for CSS imports with ?inline suffix
 */

declare module '*.css?inline' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: string;
  export default content;
}
