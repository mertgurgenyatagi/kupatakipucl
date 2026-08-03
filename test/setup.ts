import "@testing-library/jest-dom";

if (typeof ResizeObserver === "undefined") {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverMock;
}

// jsdom has no IntersectionObserver — needed by motion's whileInView
// (src/home/HomeLandingLoggedOut.tsx's scroll-triggered band reveals).
if (typeof IntersectionObserver === "undefined") {
  class IntersectionObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
}

// jsdom has no matchMedia — needed by ThreadPopup.tsx's prefers-reduced-motion
// check before a quote-jump scroll.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom doesn't implement scrollIntoView at all.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom has no object URL support — needed by PostForm.tsx's image preview.
if (typeof URL !== "undefined" && !URL.createObjectURL) {
  URL.createObjectURL = () => "blob:mock-url";
  URL.revokeObjectURL = () => {};
}

// jsdom never actually fetches image bytes, so a real `new Image()` sits
// forever without firing onload/onerror — needed by HeroCarousel.tsx's
// preload-before-render gate, which would otherwise leave the component
// stuck rendering null in every test.
if (typeof window !== "undefined") {
  class ImageMock {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  window.Image = ImageMock as unknown as typeof window.Image;
}
