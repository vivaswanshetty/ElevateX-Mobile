import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import {
  type StyleProp,
  Text,
  type TextStyle,
  View,
} from "react-native";

interface GradientTextProps {
  text: string;
  colors: readonly [string, string, ...string[]];
  style: StyleProp<TextStyle>;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  numberOfLines?: number;
}

export function GradientText({
  text,
  colors,
  style,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  numberOfLines,
}: GradientTextProps) {
  return (
    <View>
      <MaskedView
        maskElement={
          <Text numberOfLines={numberOfLines} style={style}>
            {text}
          </Text>
        }
      >
        <LinearGradient colors={colors} start={start} end={end}>
          <Text numberOfLines={numberOfLines} style={[style, { opacity: 0 }]}>
            {text}
          </Text>
        </LinearGradient>
      </MaskedView>
    </View>
  );
}
