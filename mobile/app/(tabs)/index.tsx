import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useMemo, useState, useCallback } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isTomorrow,
  startOfDay,
} from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useJobs } from "@/hooks/use-jobs";
import { queryClient } from "@/lib/queryClient";

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { data: jobs, isLoading, refetch } = useJobs();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: () => logout() },
      ]
    );
  };

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, []);

  const upcomingJobsCount = useMemo(
    () => jobs?.filter((j) => j.status === "scheduled").length || 0,
    [jobs]
  );

  const nextJob = useMemo(
    () =>
      jobs
        ?.filter(
          (job) =>
            job.scheduledDate &&
            startOfDay(new Date(job.scheduledDate)) >= startOfDay(new Date())
        )
        .sort(
          (a, b) =>
            new Date(a.scheduledDate!).getTime() -
            new Date(b.scheduledDate!).getTime()
        )[0] || null,
    [jobs]
  );

  const nextJobDayLabel = useMemo(() => {
    if (!nextJob?.scheduledDate) return "";
    const d = new Date(nextJob.scheduledDate);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "eee d MMM");
  }, [nextJob]);

  const selectedDateJobs = useMemo(
    () =>
      jobs?.filter(
        (job) =>
          job.scheduledDate && isSameDay(new Date(job.scheduledDate), selectedDate)
      ) || [],
    [jobs, selectedDate]
  );

  const getDayBadge = (day: Date) => {
    const dayJobs =
      jobs?.filter(
        (job) => job.scheduledDate && isSameDay(new Date(job.scheduledDate), day)
      ) || [];
    if (!dayJobs.length) return null;
    const hasScheduled = dayJobs.some((j) => j.status === "scheduled");
    const hasPending = dayJobs.some((j) => j.status === "pending");
    const color = hasScheduled ? "blue" : hasPending ? "yellow" : "green";
    return { count: dayJobs.length, color };
  };

  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
      }
    >
      {/* Header */}
      <View className="px-6 pt-16 pb-6 bg-white flex-row items-start justify-between">
        <View className="flex-1 mr-4">
          <Text className="text-3xl font-bold text-gray-900">
            Hey, {firstName} 👋
          </Text>
          <Text className="text-gray-500 mt-1">Ready to grow your business?</Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mt-1"
        >
          <Text className="text-blue-700 font-bold text-base">
            {(user?.firstName?.[0] || user?.email?.[0] || "?").toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 py-4 space-y-4">
        {/* Stats Row */}
        <View className="flex-row gap-3 mt-2">
          <StatCard
            value={upcomingJobsCount}
            label="Upcoming Jobs"
            color="text-emerald-500"
          />
          <StatCard
            value={jobs?.filter((j) => j.status === "pending").length || 0}
            label="Pending Jobs"
            color="text-blue-600"
          />
        </View>

        {/* Quick Actions */}
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mt-4">
          <Text className="text-base font-bold text-gray-900 mb-3">Quick Actions</Text>
          <View className="space-y-2">
            <ActionRow
              emoji="💬"
              title="View Quotes"
              subtitle="See all your quotes"
              onPress={() => router.push("/(tabs)/quotes")}
            />
            <ActionRow
              emoji="📋"
              title="View Jobs"
              subtitle="See your schedule"
              onPress={() => router.push("/(tabs)/jobs")}
            />
            <ActionRow
              emoji="👥"
              title="Customers"
              subtitle="Manage & message clients"
              onPress={() => router.push("/(tabs)/customers")}
            />
          </View>
        </View>

        {/* Next Job Banner */}
        {nextJob && (
          <TouchableOpacity
            className="flex-row items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mt-4"
            onPress={() => router.push("/(tabs)/jobs")}
            activeOpacity={0.8}
          >
            <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center">
              <Text className="text-white text-xs font-bold">📅</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">
                Next Job · {nextJobDayLabel}
              </Text>
              <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                {nextJob.title}
              </Text>
            </View>
            <Text className="text-xs font-semibold text-blue-500">
              {nextJob.scheduledDate
                ? format(new Date(nextJob.scheduledDate), "h:mm a")
                : "TBD"}
            </Text>
          </TouchableOpacity>
        )}

        {/* This Week Calendar */}
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mt-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-bold text-gray-900">This Week</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/jobs")}>
              <Text className="text-sm font-semibold text-blue-600">View All</Text>
            </TouchableOpacity>
          </View>

          {/* Week strip */}
          <View className="flex-row justify-between">
            {weekDays.map((day, idx) => {
              const isSelected = isSameDay(day, selectedDate);
              const badge = getDayBadge(day);
              return (
                <TouchableOpacity
                  key={idx}
                  className={`flex-1 items-center py-2.5 mx-0.5 rounded-xl ${
                    isSelected ? "bg-blue-600" : "bg-transparent"
                  }`}
                  onPress={() => setSelectedDate(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-[9px] font-bold uppercase mb-1 ${
                      isSelected ? "text-blue-100" : "text-gray-400"
                    }`}
                  >
                    {format(day, "eee")}
                  </Text>
                  <Text
                    className={`text-sm font-bold ${
                      isSelected ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {format(day, "d")}
                  </Text>
                  {badge && (
                    <View
                      className={`w-1.5 h-1.5 rounded-full mt-1 ${
                        isSelected
                          ? "bg-white"
                          : badge.color === "green"
                          ? "bg-emerald-500"
                          : badge.color === "yellow"
                          ? "bg-yellow-400"
                          : "bg-blue-600"
                      }`}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected day jobs */}
          <View className="mt-3 pt-3 border-t border-gray-100">
            <Text className="text-xs font-bold text-gray-400 uppercase mb-2">
              {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE d MMM")}
            </Text>
            {selectedDateJobs.length === 0 ? (
              <View className="p-3 rounded-xl border-2 border-dashed border-gray-200">
                <Text className="text-sm font-semibold text-gray-400 text-center">
                  No jobs scheduled
                </Text>
              </View>
            ) : (
              selectedDateJobs.slice(0, 3).map((job) => (
                <TouchableOpacity
                  key={job.id}
                  className="flex-row items-center gap-3 p-2 rounded-xl"
                  onPress={() => router.push("/(tabs)/jobs")}
                  activeOpacity={0.7}
                >
                  <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center">
                    <Text className="text-xs">📋</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                      {job.title}
                    </Text>
                    <Text className="text-[10px] text-gray-400">
                      {job.scheduledDate
                        ? format(new Date(job.scheduledDate), "h:mm a")
                        : "TBD"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-5 items-center shadow-sm border border-gray-100">
      <Text className={`text-4xl font-bold mb-1 ${color}`}>{value}</Text>
      <Text className="text-gray-500 text-sm font-medium text-center">{label}</Text>
    </View>
  );
}

function ActionRow({
  emoji,
  title,
  subtitle,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center gap-3 py-2.5 border-b border-gray-50 last:border-0"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
        <Text className="text-lg">{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-bold text-gray-900 text-sm">{title}</Text>
        <Text className="text-gray-400 text-xs">{subtitle}</Text>
      </View>
      <Text className="text-gray-300 text-lg">›</Text>
    </TouchableOpacity>
  );
}
