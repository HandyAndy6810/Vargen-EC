import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useState, useCallback } from "react";
import { useCustomers, useCreateCustomer, useDeleteCustomer } from "@/hooks/use-customers";
import { queryClient } from "@/lib/queryClient";

interface NewCustomerForm {
  name: string;
  email: string;
  phone: string;
  address: string;
}

const EMPTY_FORM: NewCustomerForm = { name: "", email: "", phone: "", address: "" };

export default function CustomersScreen() {
  const { data: customers, isLoading, isError } = useCustomers();
  const { mutate: createCustomer, isPending: isCreating } = useCreateCustomer();
  const { mutate: deleteCustomer } = useDeleteCustomer();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewCustomerForm>(EMPTY_FORM);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, []);

  const handleCreate = () => {
    if (!form.name.trim()) {
      Alert.alert("Name required", "Please enter the customer's name.");
      return;
    }
    createCustomer(
      { name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, address: form.address.trim() || null },
      {
        onSuccess: () => {
          setShowModal(false);
          setForm(EMPTY_FORM);
        },
      }
    );
  };

  const handleDeletePress = (customer: any) => {
    Alert.alert(
      "Delete Customer",
      `Remove ${customer.name}? This will fail if they have linked jobs or quotes.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCustomer(customer.id),
        },
      ]
    );
  };

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

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="text-4xl mb-4">⚠️</Text>
        <Text className="text-gray-900 font-bold text-lg text-center">Couldn't load customers</Text>
        <Text className="text-gray-400 text-sm mt-1 text-center">Check your connection and try again.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-6 pt-16 pb-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Customers</Text>
          <Text className="text-gray-500 text-sm mt-0.5">{(customers || []).length} total</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          className="bg-blue-600 px-4 py-2 rounded-xl"
        >
          <Text className="text-white font-bold text-sm">+ New</Text>
        </TouchableOpacity>
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

      <ScrollView
        className="flex-1 px-4 pt-3"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
      >
        {filtered.length === 0 ? (
          <View className="items-center py-20">
            <Text className="text-4xl mb-4">👥</Text>
            <Text className="text-gray-900 font-bold text-lg">
              {search ? "No results found" : "No customers yet"}
            </Text>
            {!search && (
              <TouchableOpacity onPress={() => setShowModal(true)} className="mt-4">
                <Text className="text-blue-600 font-semibold">Add your first customer</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((customer: any) => (
            <View
              key={customer.id}
              className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 flex-row items-center gap-3"
            >
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

              <TouchableOpacity onPress={() => handleDeletePress(customer)} className="p-2">
                <Text className="text-gray-300 text-lg">🗑</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <View className="h-8" />
      </ScrollView>

      {/* New Customer Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white"
        >
          <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => { setShowModal(false); setForm(EMPTY_FORM); }}>
              <Text className="text-gray-500 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">New Customer</Text>
            <TouchableOpacity onPress={handleCreate} disabled={isCreating}>
              <Text className={`text-base font-bold ${isCreating ? "text-gray-300" : "text-blue-600"}`}>
                {isCreating ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 pt-6" keyboardShouldPersistTaps="handled">
            <View className="mb-5">
              <Text className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Name *
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                placeholder="Full name or business name"
                placeholderTextColor="#9ca3af"
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                autoFocus
              />
            </View>

            <View className="mb-5">
              <Text className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Email
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                placeholder="email@example.com"
                placeholderTextColor="#9ca3af"
                value={form.email}
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View className="mb-5">
              <Text className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Phone
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                placeholder="04xx xxx xxx"
                placeholderTextColor="#9ca3af"
                value={form.phone}
                onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                keyboardType="phone-pad"
              />
            </View>

            <View className="mb-5">
              <Text className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Address
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                placeholder="Street address"
                placeholderTextColor="#9ca3af"
                value={form.address}
                onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
