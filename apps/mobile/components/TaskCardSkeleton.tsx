import { View } from "react-native";
import { surfaceCardStyle, webTheme } from "../lib/webTheme";
import { Skeleton } from "./Skeleton";

export function TaskCardSkeleton() {
  return (
    <View
      style={[
        surfaceCardStyle,
        {
          overflow: "hidden",
          padding: 22,
        },
      ]}
    >
      {/* top row: category + difficulty */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
        <Skeleton width={90} height={26} borderRadius={999} />
        <Skeleton width={72} height={26} borderRadius={14} />
      </View>

      {/* title */}
      <Skeleton width="80%" height={20} borderRadius={8} />

      {/* headline */}
      <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Skeleton width={14} height={14} borderRadius={7} />
        <Skeleton width="65%" height={14} borderRadius={6} />
      </View>

      {/* description */}
      <Skeleton width="92%" height={14} borderRadius={6} style={{ marginTop: 10 }} />
      <Skeleton width="70%" height={14} borderRadius={6} style={{ marginTop: 6 }} />

      {/* reward bar */}
      <View
        style={{
          marginTop: 18,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: webTheme.borderSoft,
          backgroundColor: "rgba(255,255,255,0.02)",
          padding: 14,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>
          <Skeleton width={50} height={10} borderRadius={5} />
          <Skeleton width={70} height={22} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
        <View style={{ width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.05)" }} />
        <View style={{ alignItems: "flex-end" }}>
          <Skeleton width={55} height={10} borderRadius={5} />
          <Skeleton width={80} height={16} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
      </View>

      {/* footer */}
      <View style={{ marginTop: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Skeleton width={34} height={34} borderRadius={12} />
          <View>
            <Skeleton width={60} height={10} borderRadius={5} />
            <Skeleton width={80} height={13} borderRadius={5} style={{ marginTop: 5 }} />
          </View>
        </View>
        <Skeleton width={80} height={28} borderRadius={14} />
      </View>
    </View>
  );
}
