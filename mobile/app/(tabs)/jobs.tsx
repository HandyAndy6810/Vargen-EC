import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { format } from "date-fns";
import { useJobs } from "@/hooks/use-jobs";
import { useState, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function JobsScreen() {
  const { data: jobs, isLoading, isError } = useJobs();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, []);

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
        <Text className="text-gray-900 font-bold text-lg text-center">Couldn't load jobs</Text>
        <Text className="text-gray-400 text-sm mt-1 text-center">Check your connection and try again.</Text>
      </View>
    );
  }

  const sorted = [...(jobs || [])].sort((a, b) => {
    if (!a.scheduledDate) return 1;
    if (!b.scheduledDate) return -1;
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
  });

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-6 pt-16 pb-4 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Jobs</Text>
        <Text className="text-gray-500 text-sm mt-0.5">{sorted.length} total jobs</Text>
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
            <Text className="text-4xl mb-4">📋</Text>
            <Text className="text-gray-900 font-bold text-lg">No jobs yet</Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">
              Your scheduled jobs will appear here.
            </Text>
          </View>
        ) : (
          sorted.map((job) => (
            <View
              key={job.id}
              className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
            >
              <View className="flex-row justify-between items-start mb-1">
                <Text className="text-base font-bold text-gray-900 flex-1 mr-2" numberOfLines={1}>
                  {job.title}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded-full ${
                    STATUS_COLORS[job.status] ?? "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Text className={`text-xs font-semibold capitalize ${
                    STATUS_COLORS[job.status]?.split(" ")[1] ?? "text-gray-500"
                  }`}>
                    {job.status}
                  </Text>
                </View>
              </View>

              {job.customerName && (
                <Text className="text-sm text-gray-500 mb-1">👤 {job.customerName}</Text>
              )}

              {job.scheduledDate && (
                <Text className="text-sm text-gray-400">
                  📅 {format(new Date(job.scheduledDate), "eee d MMM, h:mm a")}
                </Text>
              )}

              {job.address && (
                <Text className="text-sm text-gray-400 mt-0.5" numberOfLines={1}>
                  📍 {job.address}
                </Text>
              )}
            </View>
          ))
        )}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
