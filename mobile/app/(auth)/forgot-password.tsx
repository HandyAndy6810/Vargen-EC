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
import { apiRequest } from "@/lib/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const forgotMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to send reset email");
      }
    },
    onSuccess: () => setSent(true),
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = () => {
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    setError(null);
    forgotMutation.mutate(email.trim());
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-8 pt-20 pb-12 justify-center">
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-8 flex-row items-center"
            activeOpacity={0.7}
          >
            <Text className="text-blue-600 text-base">← Back to sign in</Text>
          </TouchableOpacity>

          {sent ? (
            <View className="items-center py-8">
              <Text className="text-5xl mb-6">📬</Text>
              <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
                Check your email
              </Text>
              <Text className="text-gray-500 text-sm text-center leading-relaxed mb-8">
                If that address is registered, we've sent a password reset link. It expires in 1 hour.
              </Text>
              <TouchableOpacity
                onPress={() => router.replace("/(auth)/login")}
                className="bg-blue-600 rounded-xl py-4 px-8 items-center w-full"
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-base">Back to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text className="text-3xl font-bold text-gray-900 mb-2">Forgot password?</Text>
              <Text className="text-gray-500 mb-8">
                Enter your email and we'll send you a reset link.
              </Text>

              {error && (
                <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <Text className="text-red-600 text-sm">{error}</Text>
                </View>
              )}

              <View className="mb-6">
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

              <TouchableOpacity
                className="bg-blue-600 rounded-xl py-4 items-center"
                onPress={handleSubmit}
                disabled={forgotMutation.isPending || !email}
                activeOpacity={0.8}
              >
                {forgotMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Send reset link</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
