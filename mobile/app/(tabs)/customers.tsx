import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useCustomers } from "@/hooks/use-customers";

export default function CustomersScreen() {
  const { data: customers, isLoading } = useCustomers();
  const [search, setSearch] = useState("");

  const filtered = (customers || []).filter((c: any) =>
    `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-6 pt-16 pb-4 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Customers</Text>
        <Text className="text-gray-500 text-sm mt-0.5">{(customers || []).length} total</Text>
      </View>

      <View className="px-4 pt-3">
        <TextInput
          className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm"
          placeholder="Search customers..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView className="flex-1 px-4 pt-3" showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View className="items-center py-20">
            <Text className="text-4xl mb-4">👥</Text>
            <Text className="text-gray-900 font-bold text-lg">
              {search ? "No results found" : "No customers yet"}
            </Text>
          </View>
        ) : (
          filtered.map((customer: any) => (
            <View
              key={customer.id}
              className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 flex-row items-center gap-3"
            >
              {/* Avatar */}
              <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                <Text className="text-blue-600 font-bold text-base">
                  {(customer.name || "?")[0].toUpperCase()}
                </Text>
              </View>

              <View className="flex-1">
                <Text className="font-bold text-gray-900 text-sm">{customer.name}</Text>
                {customer.email && (
                  <Text className="text-gray-400 text-xs mt-0.5">{customer.email}</Text>
                )}
                {customer.phone && (
                  <Text className="text-gray-400 text-xs">{customer.phone}</Text>
                )}
              </View>
            </View>
          ))
        )}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
