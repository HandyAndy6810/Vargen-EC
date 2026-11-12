import { useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { FileText, X } from 'lucide-react-native';
import { Press } from '@/components/Press';
import { useTheme, type Colors } from '@/hooks/use-theme';
import { apiRequest } from '@/lib/api';

type Meta = { id: number; mimeType: string; fileName: string | null; createdAt: string };
type Parent = { receiptId: number } | { jobId: number } | { quoteId: number };

const query = (p: Parent) => ('receiptId' in p ? `receiptId=${p.receiptId}` : 'jobId' in p ? `jobId=${p.jobId}` : `quoteId=${p.quoteId}`);

/** One file's data URI, fetched when it's shown (and cached). */
function useFile(id: number | null) {
  return useQuery<{ dataUri: string }>({
    queryKey: ['/api/attachments', 'file', id],
    enabled: id != null,
    staleTime: Infinity,
    queryFn: async () => (await apiRequest('GET', `/api/attachments/${id}`)).json(),
  });
}

function Thumb({ meta, size, onOpen }: { meta: Meta; size: number; onOpen: () => void }) {
  const { colors: c } = useTheme();
  const isPdf = meta.mimeType === 'application/pdf';
  const { data } = useFile(isPdf ? null : meta.id);
  return (
    <Press onPress={onOpen} pressedStyle={{ opacity: 0.8 }} accessibilityRole="button" accessibilityLabel={isPdf ? `PDF ${meta.fileName ?? ''}` : 'Photo'}>
      {isPdf ? (
        <View style={[{ width: size, height: size, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineSoft, alignItems: 'center', justifyContent: 'center', padding: 6 }]}>
          <FileText size={22} color={c.ink} strokeWidth={2} />
          <Text style={{ fontSize: 10, fontFamily: 'HostGrotesk_600SemiBold', color: c.mutedHi, marginTop: 4, textAlign: 'center' }} numberOfLines={2}>{meta.fileName || 'PDF'}</Text>
        </View>
      ) : data?.dataUri ? (
        <Image source={{ uri: data.dataUri }} style={{ width: size, height: size, borderRadius: 12 }} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.muted} />
        </View>
      )}
    </Press>
  );
}

/**
 * The photos and PDFs kept with a job, quote or receipt (Share to Vargen, step
 * 5). Renders nothing while there are none, unless `empty` is given.
 */
export function AttachmentStrip({ parent, title, empty, size = 84 }: { parent: Parent; title?: string; empty?: string; size?: number }) {
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: list } = useQuery<Meta[]>({
    queryKey: ['/api/attachments', query(parent)],
    queryFn: async () => {
      const r = await apiRequest('GET', `/api/attachments?${query(parent)}`);
      return r.ok ? r.json() : [];
    },
  });
  const [open, setOpen] = useState<Meta | null>(null);
  const files = list ?? [];
  if (!files.length && !empty) return null;
  return (
    <View style={{ gap: 8 }}>
      {title ? <Text style={s.title}>{title}</Text> : null}
      {files.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {files.map((m) => <Thumb key={m.id} meta={m} size={size} onOpen={() => setOpen(m)} />)}
        </ScrollView>
      ) : (
        <Text style={s.empty}>{empty}</Text>
      )}
      <Viewer meta={open} onClose={() => setOpen(null)} />
    </View>
  );
}

function Viewer({ meta, onClose }: { meta: Meta | null; onClose: () => void }) {
  const { data } = useFile(meta && meta.mimeType !== 'application/pdf' ? meta.id : null);
  return (
    <Modal visible={!!meta} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}>
        {meta?.mimeType === 'application/pdf' ? (
          <View style={{ alignItems: 'center', gap: 10, padding: 24 }}>
            <FileText size={40} color="#fff" strokeWidth={1.8} />
            <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'HostGrotesk_700Bold', textAlign: 'center' }}>{meta.fileName || 'PDF'}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'HostGrotesk_500Medium', textAlign: 'center' }}>Kept with this record.</Text>
          </View>
        ) : data?.dataUri ? (
          <Image source={{ uri: data.dataUri }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
        ) : <ActivityIndicator color="#fff" />}
        <Press onPress={onClose} style={{ position: 'absolute', top: 56, right: 20, padding: 10 }} pressedStyle={{ opacity: 0.7 }} accessibilityRole="button" accessibilityLabel="Close">
          <X size={24} color="#fff" strokeWidth={2.2} />
        </Press>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  title: { fontSize: 10.5, fontFamily: 'HostGrotesk_800ExtraBold', color: c.muted, letterSpacing: 1.2, textTransform: 'uppercase' },
  empty: { fontSize: 13, fontFamily: 'HostGrotesk_500Medium', color: c.muted },
});
