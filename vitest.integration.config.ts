import { defineConfig } from "vitest/config";

// PREREQUISITE: the Firestore emulator needs a JDK 21+ on PATH. This machine's
// default `java` is 1.8, which firebase-tools rejects outright, but Android
// Studio ships a suitable one — run with:
//
//   JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" \
//   PATH="$JAVA_HOME/bin:$PATH" npm run test:integration
//
// Deliberately not baked into the npm script: that path is specific to this
// machine's Android Studio install and would be wrong for anyone else.
//
// Separate from vite.config.ts on purpose. These tests need a real Firestore
// emulator, a node environment (no jsdom, no test/setup.ts DOM shims), and
// timeouts long enough to sit through the function's 2s debounce plus a
// recompute.
//
// The `.itest.ts` suffix is what keeps them out of `npm test`: vitest's default
// include only matches *.test.* and *.spec.*, so the main config needs no
// exclude rule and cannot accidentally drag these into the normal suite.
export default defineConfig({
  test: {
    environment: "node",
    include: ["integration/**/*.itest.ts"],
    // Generous because the functions emulator serializes invocations and each
    // one holds its slot for the function's full 2s debounce, so a 36-trigger
    // batch takes ~25s to drain locally. The tests poll for a settled state
    // rather than sleeping, but they still have to wait for it.
    testTimeout: 150000,
    hookTimeout: 90000,
    // The functions under test are triggered by writes and coalesce across
    // documents; running files in parallel would let one test's writes satisfy
    // another's debounce window.
    fileParallelism: false,
  },
});
