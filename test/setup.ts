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
