import { Children, type ReactNode } from "react";
import type { ViewStyle, StyleProp } from "react-native";
import { FadeSlideIn } from "./FadeSlideIn";

interface AnimatedListProps {
  children: ReactNode;
  /** Base delay for the first item (ms) */
  baseDelay?: number;
  /** Delay increment between items (ms) */
  stagger?: number;
  /** Slide distance per item (px) */
  distance?: number;
  /** Optional extra styles for each item wrapper */
  itemStyle?: StyleProp<ViewStyle>;
}

export function AnimatedList({
  children,
  baseDelay = 60,
  stagger = 80,
  distance = 16,
  itemStyle,
}: AnimatedListProps) {
  const items = Children.toArray(children);

  return (
    <>
      {items.map((child, index) => (
        <FadeSlideIn
          key={index}
          delay={baseDelay + index * stagger}
          distance={distance}
          style={itemStyle}
        >
          {child}
        </FadeSlideIn>
      ))}
    </>
  );
}
