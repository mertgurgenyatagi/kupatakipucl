import "@testing-library/jest-dom";

if (typeof ResizeObserver === "undefined") {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error jsdom has no ResizeObserver
  global.ResizeObserver = ResizeObserverMock;
}
