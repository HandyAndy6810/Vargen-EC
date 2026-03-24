import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useState, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";
import { useQuotes, useUpdateQuote, useDeleteQuote } from "@/hooks/use-quotes";
import type { Quote } from "@shared/schema";

type QuoteWithJoins = Quote & { customerName?: string; title?: string };

const STATUS_COLORS: Record<string, string> = {
  draft:    "bg-gray-100 text-gray-600",
  sent:     "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-600",
  invoiced: "bg-purple-100 text-purple-700",
};

// Valid next statuses for each current status (mirrors server validation)
const NEXT_STATUSES: Record<string, { label: string; value: string }[]> = {
  draft:    [{ label: "Mark as Sent", value: "sent" }],
  sent:     [
    { label: "Mark as Accepted", value: "accepted" },
    { label: "Mark as Declined", value: "declined" },
    { label: "Revert to Draft",  value: "draft" },
  ],
  viewed:   [
    { label: "Mark as Accepted", value: "accepted" },
    { label: "Mark as Declined", value: "declined" },
  ],
  accepted: [],
  declined: [{ label: "Re-send Quote", value: "sent" }],
  invoiced: [],
};

export default function QuotesScreen() {
  const { data: quotes, isLoading, isError } = useQuotes();
  const { mutate: updateQuote } = useUpdateQuote();
  const { mutate: deleteQuote } = useDeleteQuote();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, []);

  const handleStatusPress = (quote: QuoteWithJoins) => {
    const options = NEXT_STATUSES[quote.status ?? "draft"] ?? [];
    if (options.length === 0) return;

    const buttons = options.map((opt) => ({
      text: opt.label,
      onPress: () => updateQuote({ id: quote.id, status: opt.value }),
    }));
    buttons.push({ text: "Cancel", onPress: () => {} });

    Alert.alert("Change Status", `Current: ${quote.status}`, buttons as any);
  };

  const handleDeletePress = (quote: QuoteWithJoins) => {
    Alert.alert(
      "Delete Quote",
      "Are you sure you want to delete this quote? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteQuote(quote.id),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="text-4xl mb-4">⚠️</Text>
        <Text className="text-gray-900 font-bold text-lg text-center">Couldn't load quotes</Text>
        <Text className="text-gray-400 text-sm mt-1 text-center">Check your connection and try again.</Text>
      </View>
    );
  }

  const sorted = [...((quotes || []) as QuoteWithJoins[])].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-6 pt-16 pb-4 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Quotes</Text>
        <Text className="text-gray-500 text-sm mt-0.5">{sorted.length} total quotes</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
      >
        {sorted.length === 0 ? (
          <View className="items-center py-20">
            <Text className="text-4xl mb-4">💬</Text>
            <Text className="text-gray-900 font-bold text-lg">No quotes yet</Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">
              Your quotes will appear here once created.
            </Text>
          </View>
        ) : (
          sorted.map((quote) => {
            let jobTitle = quote.title;
            try {
              const parsed = JSON.parse(quote.content || "{}");
              if (parsed.jobTitle) jobTitle = parsed.jobTitle;
            } catch {}

            const canChangeStatus = (NEXT_STATUSES[quote.status ?? "draft"] ?? []).length > 0;
            const canDelete = quote.status === "draft" || quote.status === "declined";

            return (
              <View
                key={quote.id}
                className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
              >
                <View className="flex-row justify-between items-start mb-1">
                  <Text
                    className="text-base font-bold text-gray-900 flex-1 mr-2"
                    numberOfLines={1}
                  >
                    {jobTitle || `Quote #${quote.id}`}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleStatusPress(quote)}
                    disabled={!canChangeStatus}
                  >
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        STATUS_COLORS[quote.status ?? "draft"] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Text className="text-xs font-semibold capitalize">
                        {quote.status}
                        {canChangeStatus ? " ›" : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {quote.customerName && (
                  <Text className="text-sm text-gray-500">👤 {quote.customerName}</Text>
                )}

                {quote.totalAmount && parseFloat(String(quote.totalAmount)) > 0 && (
                  <Text className="text-sm font-semibold text-gray-900 mt-1">
                    $
                    {parseFloat(String(quote.totalAmount)).toLocaleString("en-AU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                )}

                {canDelete && (
                  <TouchableOpacity
                    onPress={() => handleDeletePress(quote)}
                    className="mt-2 self-start"
                  >
                    <Text className="text-xs text-red-400 font-medium">Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
