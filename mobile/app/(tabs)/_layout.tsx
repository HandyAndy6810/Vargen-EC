import { Tabs, router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/hooks/use-auth";

// Tab bar icons using emoji for simplicity — swap for lucide-react-native icons later
function TabIcon({ emoji }: { emoji: string }) {
  const { Text } = require("react-native");
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, isLoading]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "white",
          borderTopColor: "#e2e8f0",
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === "ios" ? 80 : 60,
        },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={focused ? "🏠" : "🏠"} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          tabBarIcon: () => <TabIcon emoji="📋" />,
        }}
      />
      <Tabs.Screen
        name="quotes"
        options={{
          title: "Quotes",
          tabBarIcon: () => <TabIcon emoji="💬" />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Customers",
          tabBarIcon: () => <TabIcon emoji="👥" />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoices",
          tabBarIcon: () => <TabIcon emoji="🧾" />,
        }}
      />
    </Tabs>
  );
}
