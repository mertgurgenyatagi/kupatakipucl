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
