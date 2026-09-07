import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Plus, Share2 } from 'lucide-react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { useInvoiceDraft } from '@/hooks/use-invoice-draft';
import { apiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { hapticPress } from '@/lib/haptics';

/**
 * The customer gate, as a real iOS sheet. Reached from Send, and only when the quote
 * doesn't have a customer yet — Preview and Save draft deliberately never come here.
 *
 * `shareAnyway` lives on the draft rather than rebuilt here, because generating
 * the PDF needs the same payload the preview uses.
 */
export default function InvoiceSendGateSheet() {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const d = useInvoiceDraft();

  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [creating, setCreating] = useState(false);

  const pick = (cust: any) => {
    hapticPress();
    d.setCustomerId(cust.id);
    d.setCustomer(cust.name);
    router.back();
    d.handleSendPress();
  };

  /**
   * Writes a real customer record so the invoice is linked to someone who exists
   * rather than just carrying a name in its text. One field covers both contact
   * types — a value with an "@" is an email, anything else a phone.
   */
  const createAndSend = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const contact = newContact.trim();
      const res = await apiRequest('POST', '/api/customers', {
        name,
        email: contact.includes('@') ? contact : undefined,
        phone: contact && !contact.includes('@') ? contact : undefined,
      });
      if (res.ok) {
        const created = await res.json();
        d.setCustomerId(created?.id ?? null);
        queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      }
      // Even if the record couldn't be created, keep the name so the invoice can still
      // go out — the contact can be tidied up afterwards.
      d.setCustomer(name);
      router.back();
      d.handleSendPress();
    } catch {
      d.setCustomer(name);
      router.back();
      d.handleSendPress();
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={s.wrap}>
      <ScrollView
        contentContainerStyle={s.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Who's this going to?</Text>
        <Text style={s.sub}>An invoice needs a customer before it can be sent.</Text>

        {!addingNew ? (
          <>
            {d.filteredCustomers.map((cust: any) => (
              <TouchableOpacity key={cust.id} style={s.custRow} activeOpacity={0.7} onPress={() => pick(cust)}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{cust.name?.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.custName} numberOfLines={1}>{cust.name}</Text>
                  {cust.phone ? <Text style={s.custSub} numberOfLines={1}>{cust.phone}</Text> : null}
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={s.addBtn}
              activeOpacity={0.8}
              onPress={() => setAddingNew(true)}
              accessibilityRole="button"
              accessibilityLabel="Add a new customer"
            >
              <Plus size={16} color={c.orange} strokeWidth={2.6} />
              <Text style={s.addText}>Add someone new</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.ghost}
              activeOpacity={0.7}
              onPress={() => { router.back(); d.shareAnyway(); }}
              accessibilityRole="button"
              accessibilityLabel="Share the invoice another way"
            >
              <Share2 size={15} color={c.mutedHi} strokeWidth={2.2} />
              <Text style={s.ghostText}>Share it another way</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.fieldLabel}>New customer</Text>
            <TextInput
              style={s.input}
              placeholder="Name"
              placeholderTextColor={c.muted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <TextInput
              style={[s.input, { marginTop: 8 }]}
              placeholder="Phone or email"
              placeholderTextColor={c.muted}
              value={newContact}
              onChangeText={setNewContact}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[s.confirm, (!newName.trim() || creating) && { opacity: 0.45 }]}
              activeOpacity={0.85}
              onPress={createAndSend}
              disabled={!newName.trim() || creating}
            >
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmText}>Create and send</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.ghost} activeOpacity={0.7} onPress={() => setAddingNew(false)}>
              <Text style={s.ghostText}>Back to my customers</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.paper },
  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
  title: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold', color: c.ink },
  sub: { fontSize: 13, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 4, marginBottom: 10 },
  custRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: c.paperDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 11, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi },
  custName: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: c.ink },
  custSub: { fontSize: 12, fontFamily: 'Manrope_500Medium', color: c.muted, marginTop: 1 },
  fieldLabel: {
    fontSize: 10.5, fontFamily: 'Manrope_800ExtraBold', color: c.muted,
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 8, marginBottom: 8,
  },
  input: {
    backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.lineMid,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: 'Manrope_600SemiBold', color: c.ink,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 16, marginTop: 14,
    backgroundColor: c.orangeSoft, borderWidth: 1, borderColor: c.orange,
  },
  addText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: c.orange },
  confirm: {
    height: 52, borderRadius: 16, backgroundColor: c.orange,
    alignItems: 'center', justifyContent: 'center', marginTop: 14,
  },
  confirmText: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', color: '#fff' },
  ghost: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, marginTop: 4,
  },
  ghostText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: c.mutedHi },
});
