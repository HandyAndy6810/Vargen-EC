import { useMemo, type RefObject } from 'react';
import { View, Text, TextInput, Pressable, Switch, StyleSheet, type ScrollView } from 'react-native';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { RimGroup, fieldStyles, wellFill, useKeepAboveKeyboard } from '@/components/Rim';
import {
  CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS, PREFERRED_CONTACTS, PREFERRED_CONTACT_LABELS, abnProblem,
  type CustomerType, type PreferredContact,
} from '@shared/customer-fields';

/** Everything the add and edit customer screens collect. Strings, as typed. */
export type CustomerFormValue = {
  name: string;
  phone: string;
  email: string;
  preferredContact: PreferredContact | null;
  companyName: string;
  abn: string;
  address: string;
  billingSameAsSite: boolean;
  billingAddress: string;
  accessNotes: string;
  customerType: CustomerType | null;
  notes: string;
};

export const emptyCustomerForm = (): CustomerFormValue => ({
  name: '', phone: '', email: '', preferredContact: null, companyName: '', abn: '',
  address: '', billingSameAsSite: true, billingAddress: '', accessNotes: '', customerType: null, notes: '',
});

/** A saved customer, into the form. Billing is "same as site" when it was never set. */
export function customerToForm(c: any): CustomerFormValue {
  return {
    name: c?.name ?? '',
    phone: c?.phone ?? '',
    email: c?.email ?? '',
    preferredContact: (PREFERRED_CONTACTS as readonly string[]).includes(c?.preferredContact) ? c.preferredContact : null,
    companyName: c?.companyName ?? '',
    abn: c?.abn ?? '',
    address: c?.address ?? '',
    billingSameAsSite: !c?.billingAddress,
    billingAddress: c?.billingAddress ?? '',
    accessNotes: c?.accessNotes ?? '',
    customerType: (CUSTOMER_TYPES as readonly string[]).includes(c?.customerType) ? c.customerType : null,
    notes: c?.notes ?? '',
  };
}

/** The form, into the API body. Blanks are null; "same as site" clears billing. */
export function formToCustomer(v: CustomerFormValue) {
  const t = (s: string) => s.trim() || null;
  return {
    name: v.name.trim(),
    phone: t(v.phone),
    email: t(v.email),
    preferredContact: v.preferredContact,
    companyName: t(v.companyName),
    abn: t(v.abn),
    address: t(v.address),
    billingAddress: v.billingSameAsSite ? null : t(v.billingAddress),
    accessNotes: t(v.accessNotes),
    customerType: v.customerType,
    notes: t(v.notes),
  };
}

/** The first thing stopping a save, worded for the person typing, or null. */
export function customerFormProblem(v: CustomerFormValue): string | null {
  if (!v.name.trim()) return 'Add the customer’s name.';
  const email = v.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That email address doesn’t look right.';
  return abnProblem(v.abn);
}

/**
 * The customer form (round 2, c2), shared by New customer and Edit on the
 * customer screen: Contact, Company, Addresses, Access notes, Type, Notes.
 */
export function CustomerForm({
  value, onChange, scrollRef, nameError, autoFocusName,
}: {
  value: CustomerFormValue;
  onChange: (next: CustomerFormValue) => void;
  scrollRef: RefObject<ScrollView | null>;
  nameError?: string | null;
  autoFocusName?: boolean;
}) {
  const { colors: c, isDark } = useTheme();
  const f = useMemo(() => fieldStyles(c), [c]);
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const lowInput = useKeepAboveKeyboard(scrollRef);
  const set = <K extends keyof CustomerFormValue>(k: K, v: CustomerFormValue[K]) => onChange({ ...value, [k]: v });
  const abnErr = value.abn.trim() ? abnProblem(value.abn) : null;

  const field = (
    label: string,
    key: 'name' | 'phone' | 'email' | 'companyName' | 'abn' | 'address' | 'billingAddress' | 'accessNotes' | 'notes',
    props: Partial<React.ComponentProps<typeof TextInput>> = {},
    first = false,
    error?: string | null,
  ) => (
    <View style={[f.row, !first && f.divider, error ? { backgroundColor: c.redSoft } : null]}>
      <Text style={[f.label, error ? { color: c.red } : null]}>{label}</Text>
      <TextInput
        style={f.input}
        value={value[key]}
        onChangeText={(t) => set(key, t)}
        placeholderTextColor={c.muted}
        accessibilityLabel={label}
        {...props}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );

  const chips = <T extends string>(options: readonly T[], labels: Record<T, string>, selected: T | null, onPick: (v: T | null) => void, label: string) => (
    <View style={s.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = selected === o;
        return (
          <Pressable
            key={o}
            onPress={() => onPick(on ? null : o)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [s.chip, on && s.chipOn, pressed && { opacity: 0.8 }]}
          >
            <Text style={[s.chipText, on && s.chipTextOn]}>{labels[o]}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <>
      <RimGroup title="Contact">
        {field('Full name (required)', 'name', { placeholder: 'e.g. Sarah Johnson', autoCapitalize: 'words', autoFocus: autoFocusName }, true, nameError)}
        {field('Phone', 'phone', { placeholder: '0412 345 678', keyboardType: 'phone-pad' })}
        {field('Email', 'email', { placeholder: 'email@example.com', keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false })}
        <View style={[f.row, f.divider]}>
          <Text style={f.label}>Best way to reach them</Text>
          {chips(PREFERRED_CONTACTS, PREFERRED_CONTACT_LABELS, value.preferredContact, (v) => set('preferredContact', v), 'Best way to reach them')}
        </View>
      </RimGroup>

      <RimGroup title="Company" hint="Only if you bill a business. Both show on their invoices.">
        {field('Company name', 'companyName', { placeholder: 'e.g. Coastal Strata Pty Ltd', autoCapitalize: 'words' }, true)}
        {field('ABN', 'abn', { placeholder: '51 824 753 556', keyboardType: 'number-pad' }, false, abnErr)}
      </RimGroup>

      <RimGroup title="Addresses">
        {field('Site address', 'address', { placeholder: 'Where the work is: street, suburb' }, true)}
        <View style={[f.row, f.divider, s.switchRow]}>
          <View style={{ flex: 1 }}>
            <Text style={[f.label, { marginBottom: 0 }]}>Billing address</Text>
            <Text style={s.switchSub}>{value.billingSameAsSite ? 'Same as site' : 'Invoices go to the address below'}</Text>
          </View>
          <Text style={s.switchLabel}>Same as site</Text>
          <Switch
            value={value.billingSameAsSite}
            onValueChange={(on) => set('billingSameAsSite', on)}
            accessibilityLabel="Billing address same as site"
            trackColor={{ false: c.lineMid, true: c.orange }}
            thumbColor="#fff"
            ios_backgroundColor={c.lineMid}
          />
        </View>
        {!value.billingSameAsSite
          ? field('Billing address', 'billingAddress', { placeholder: 'e.g. PO Box 12, Sydney NSW 2001', ...lowInput })
          : null}
      </RimGroup>

      <RimGroup title="Access notes" hint="Shown on every job for this customer.">
        {field('Getting in', 'accessNotes', {
          placeholder: 'Gate code, key safe, pets, parking…',
          multiline: true,
          style: [f.input, { minHeight: 56, textAlignVertical: 'top' }],
          ...lowInput,
        }, true)}
      </RimGroup>

      <RimGroup title="Type of customer">
        <View style={f.row}>
          {chips(CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS, value.customerType, (v) => set('customerType', v), 'Type of customer')}
        </View>
      </RimGroup>

      <RimGroup title="Notes" hint="Only you see these.">
        {field('Notes', 'notes', {
          placeholder: 'Preferences, history, anything worth remembering',
          multiline: true,
          style: [f.input, { minHeight: 72, textAlignVertical: 'top' }],
          ...lowInput,
        }, true)}
      </RimGroup>
    </>
  );
}

const makeStyles = (c: Colors, isDark: boolean) => StyleSheet.create({
  error: { fontFamily: 'HostGrotesk_600SemiBold', fontSize: 12.5, color: c.red, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: 12, backgroundColor: wellFill(isDark) },
  chipOn: { backgroundColor: c.fillStrong },
  chipText: { fontSize: 13.5, fontFamily: 'HostGrotesk_700Bold', color: c.ink },
  chipTextOn: { color: c.paper },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchSub: { fontSize: 13, fontFamily: 'HostGrotesk_500Medium', color: c.muted, marginTop: 2 },
  switchLabel: { fontSize: 12, fontFamily: 'HostGrotesk_600SemiBold', color: c.mutedHi },
});
