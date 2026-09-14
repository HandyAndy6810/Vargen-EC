import { LayoutAnimation, Platform, UIManager } from 'react-native';

// Android keeps layout animation behind an experimental flag; iOS has it always on.
// Setting it at import time means any screen that pulls in this helper gets it.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Sections that open and shut — the Labour and Materials groups, the flags strip —
 * used to snap between states, which shifted everything below them by a few hundred
 * pixels in a single frame and cost the tradie their place on the page.
 *
 * 220ms is long enough for the eye to follow the movement and short enough not to
 * feel like waiting. Rows fade as they come and go while everything around them
 * eases into its new position, so the page reads as one thing rearranging rather
 * than content teleporting.
 *
 * Call it immediately BEFORE the setState that changes the layout — it applies to
 * the next commit, not the current one.
 *
 * Built on React Native's own LayoutAnimation rather than reanimated: this app is
 * deliberately on the legacy architecture (see CLAUDE.md), where LayoutAnimation is
 * fully supported and needs no native setup. reanimated is installed but unused,
 * and a section expanding is not worth being the thing that makes it load.
 */
export function animateNextLayout(duration = 220) {
  LayoutAnimation.configureNext({
    duration,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
      // Shorter than the rest: rows that are leaving should be gone before the gap
      // they occupied finishes closing, otherwise they visibly slide under the
      // section below them on the way out.
      duration: Math.round(duration * 0.6),
    },
  });
}
