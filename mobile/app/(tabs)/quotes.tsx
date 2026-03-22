import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-600",
  invoiced: "bg-purple-100 text-purple-700",
};

export default function QuotesScreen() {
  const { data: quotes, isLoading, isError } = useQuery({
    queryKey: [api.quotes.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.quotes.list.path);
      if (!res.ok) throw new Error("Failed to fetch quotes");
      return res.json();
    },
  });

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

  const sorted = [...(quotes || [])].sort(
    (a: any, b: any) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-6 pt-16 pb-4 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Quotes</Text>
        <Text className="text-gray-500 text-sm mt-0.5">{sorted.length} total quotes</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {sorted.length === 0 ? (
          <View className="items-center py-20">
            <Text className="text-4xl mb-4">💬</Text>
            <Text className="text-gray-900 font-bold text-lg">No quotes yet</Text>
            <Text className="text-gray-400 text-sm mt-1">
              Create your first quote from the web app.
            </Text>
          </View>
        ) : (
          sorted.map((quote: any) => {
            let jobTitle = quote.title;
            try {
              const parsed = JSON.parse(quote.content || "{}");
              if (parsed.jobTitle) jobTitle = parsed.jobTitle;
            } catch {}

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
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      STATUS_COLORS[quote.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Text className="text-xs font-semibold capitalize">
                      {quote.status}
                    </Text>
                  </View>
                </View>

                {quote.customerName && (
                  <Text className="text-sm text-gray-500">👤 {quote.customerName}</Text>
                )}

                {quote.totalAmount && parseFloat(quote.totalAmount) > 0 && (
                  <Text className="text-sm font-semibold text-gray-900 mt-1">
                    $
                    {parseFloat(quote.totalAmount).toLocaleString("en-AU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
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
