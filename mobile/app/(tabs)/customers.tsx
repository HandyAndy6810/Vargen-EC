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
  StyleSheet,
} from 'react-native';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomers, useCreateCustomer, useDeleteCustomer } from '@/hooks/use-customers';
import { queryClient } from '@/lib/queryClient';
import { Search, Plus, Trash2, Users, Mail, Phone } from 'lucide-react-native';

const BRAND      = '#ea580c';
const INK        = '#1c1917';
const MUTED      = '#78716c';
const PAPER      = '#faf9f7';
const PAPER_DEEP = '#f0ece4';
const CARD       = '#ffffff';
const LINE       = '#e7e5e4';

interface NewCustomerForm {
  name: string;
  email: string;
  phone: string;
  address: string;
}

const EMPTY_FORM: NewCustomerForm = { name: '', email: '', phone: '', address: '' };

export default function CustomersScreen() {
  const { data: customers, isLoading, isError } = useCustomers();
  const { mutate: createCustomer, isPending: isCreating } = useCreateCustomer();
  const { mutate: deleteCustomer } = useDeleteCustomer();
  const [search, setSearch] = useState('');
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
      Alert.alert('Name required', 'Please enter the customer name.');
      return;
    }
    createCustomer(
      {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      },
      {
        onSuccess: () => {
          setShowModal(false);
          setForm(EMPTY_FORM);
        },
      }
    );
  };

  const handleDeletePress = (customer: any) => {
    Alert.alert('Remove Customer', `Remove ${customer.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteCustomer(customer.id) },
    ]);
  };

  const filtered = (customers || []).filter((c: any) =>
    `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER }}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER }}>
        <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: INK }}>Couldn't load customers</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Customers</Text>
          <Text style={s.headerSub}>{(customers || []).length} contacts</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
          <Plus size={18} color="#fff" strokeWidth={2.5} />
          <Text style={s.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Search size={15} color={MUTED} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search customers…"
          placeholderTextColor={MUTED}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: PAPER_DEEP, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Users size={24} color={MUTED} />
            </View>
            <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: INK }}>
              {search ? 'No results' : 'No customers yet'}
            </Text>
            {!search && (
              <TouchableOpacity onPress={() => setShowModal(true)} style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: BRAND }}>Add first customer</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((customer: any) => (
            <View key={customer.id} style={s.card}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{(customer.name || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{customer.name}</Text>
                {customer.email && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                    <Mail size={11} color={MUTED} />
                    <Text style={s.meta}>{customer.email}</Text>
                  </View>
                )}
                {customer.phone && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <Phone size={11} color={MUTED} />
                    <Text style={s.meta}>{customer.phone}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleDeletePress(customer)}
                style={s.deleteBtn}
                activeOpacity={0.7}
              >
                <Trash2 size={14} color={MUTED} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* New Customer Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: CARD }} edges={['top']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => { setShowModal(false); setForm(EMPTY_FORM); }}>
                <Text style={{ fontSize: 15, fontFamily: 'Manrope_500Medium', color: MUTED }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontFamily: 'Manrope_800ExtraBold', color: INK }}>New Customer</Text>
              <TouchableOpacity onPress={handleCreate} disabled={isCreating}>
                <Text style={{ fontSize: 15, fontFamily: 'Manrope_700Bold', color: isCreating ? MUTED : BRAND }}>
                  {isCreating ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
              <Field label="Name *" placeholder="Full name or business name" value={form.name} onChangeText={(v: string) => setForm((f) => ({ ...f, name: v }))} autoFocus />
              <Field label="Email" placeholder="email@example.com" value={form.email} onChangeText={(v: string) => setForm((f) => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" />
              <Field label="Phone" placeholder="04xx xxx xxx" value={form.phone} onChangeText={(v: string) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
              <Field label="Address" placeholder="Street address" value={form.address} onChangeText={(v: string) => setForm((f) => ({ ...f, address: v }))} multiline />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: { label: string } & any) {
  return (
    <View>
      <Text style={{ fontSize: 10, fontFamily: 'Manrope_800ExtraBold', color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: PAPER,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: LINE,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 14,
          fontFamily: 'Manrope_500Medium',
          color: INK,
        }}
        placeholderTextColor={MUTED}
        {...props}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: PAPER_DEEP,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: INK,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: LINE,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: INK,
  },
  name: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: INK,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: MUTED,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PAPER_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
});
