import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

export default function LoginScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/login", { username, password });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Invalid email or password");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      router.replace("/(tabs)");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Section */}
        <View className="flex-1 bg-blue-50 px-8 pt-20 pb-12 justify-between">
          <View>
            {/* Logo */}
            <View className="flex-row items-center gap-2 mb-10">
              <View className="w-10 h-10 bg-primary rounded-xl items-center justify-center">
                <Text className="text-white text-lg">🔧</Text>
              </View>
              <Text className="text-xl font-bold text-gray-900 ml-2">Vargenezey</Text>
            </View>

            <Text className="text-4xl font-bold text-gray-900 leading-tight mb-4">
              Admin for{"\n"}
              <Text className="text-blue-600">Tradespeople</Text>
              {"\n"}Who Hate Admin.
            </Text>

            <Text className="text-base text-gray-500 mb-8">
              Create quotes, schedule jobs, and message customers in seconds.
            </Text>

            {/* Feature list */}
            <Feature emoji="✨" text="AI Quote Generation" />
            <Feature emoji="✅" text="Simple Job Scheduling" />
            <Feature emoji="💬" text="Instant Customer Messaging" />
          </View>

          <Text className="text-xs text-gray-400 mt-8">
            © {new Date().getFullYear()} Vargenezey App
          </Text>
        </View>

        {/* Login Form */}
        <View className="px-8 pt-8 pb-12 bg-white">
          <Text className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</Text>
          <Text className="text-gray-500 mb-8">Sign in to manage your business.</Text>

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}

          <View className="space-y-4 mb-6">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Email</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 text-base"
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                value={username}
                onChangeText={(v) => { setUsername(v); setError(null); }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>

            <View className="mt-4">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Password</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 text-base"
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null); }}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            className="bg-blue-600 rounded-xl py-4 items-center mt-2"
            onPress={() => loginMutation.mutate({ username, password })}
            disabled={loginMutation.isPending || !username || !password}
            activeOpacity={0.8}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/forgot-password")}
            className="mt-4 items-center py-2"
            activeOpacity={0.7}
          >
            <Text className="text-blue-600 text-sm font-medium">Forgot your password?</Text>
          </TouchableOpacity>

          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="text-gray-400 text-xs mx-3">or</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/register")}
            className="border border-blue-600 rounded-xl py-4 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-blue-600 font-bold text-base">Create Account</Text>
          </TouchableOpacity>

          <Text className="text-xs text-gray-400 text-center mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>

          {__DEV__ && (
            <TouchableOpacity
              onPress={() => {
                const devEmail = process.env.EXPO_PUBLIC_DEV_EMAIL;
                const devPass = process.env.EXPO_PUBLIC_DEV_PASSWORD;
                if (devEmail && devPass) {
                  loginMutation.mutate({ username: devEmail, password: devPass });
                }
              }}
              className="mt-4 items-center py-3 border border-dashed border-yellow-400 rounded-xl bg-yellow-50"
              activeOpacity={0.7}
            >
              <Text className="text-yellow-700 text-xs font-bold">⚡ DEV BYPASS — skip login</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Feature({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View className="flex-row items-center mb-3">
      <View className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 items-center justify-center mr-3">
        <Text>{emoji}</Text>
      </View>
      <Text className="font-medium text-gray-900">{text}</Text>
    </View>
  );
}
