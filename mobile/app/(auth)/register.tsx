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
import { useState } from "react";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!firstName.trim()) throw new Error("First name is required");
      if (!email.trim()) throw new Error("Email is required");
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      if (password !== confirmPassword) throw new Error("Passwords don't match");

      const res = await apiRequest("POST", "/api/register", {
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        email: email.trim(),
        password,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      router.replace("/(tabs)");
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-8 pt-20 pb-12">
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-8 flex-row items-center"
            activeOpacity={0.7}
          >
            <Text className="text-blue-600 text-base">← Back to sign in</Text>
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-gray-900 mb-1">Create account</Text>
          <Text className="text-gray-500 mb-8">Set up your Vargenezey account.</Text>

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}

          {/* Name row */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">First name</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 text-base"
                placeholder="Jane"
                placeholderTextColor="#9ca3af"
                value={firstName}
                onChangeText={(v) => { setFirstName(v); setError(null); }}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Last name</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 text-base"
                placeholder="Smith"
                placeholderTextColor="#9ca3af"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Email</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 text-base"
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Password</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 text-base"
              placeholder="Min 8 characters"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={(v) => { setPassword(v); setError(null); }}
              secureTextEntry
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Confirm password</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 text-base"
              placeholder="Repeat password"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setError(null); }}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            className="bg-blue-600 rounded-xl py-4 items-center"
            onPress={() => registerMutation.mutate()}
            disabled={registerMutation.isPending || !firstName || !email || !password || !confirmPassword}
            activeOpacity={0.8}
          >
            {registerMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Create Account</Text>
            )}
          </TouchableOpacity>

          <Text className="text-xs text-gray-400 text-center mt-6">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
