import { View, Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#faf9f7' }} edges={['top']}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 16 }}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <ChevronLeft size={20} color="#1c1917" />
        <Text style={{ fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: '#1c1917' }}>Back</Text>
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, fontFamily: 'Manrope_700Bold', color: '#78716c' }}>
          Job #{id} — coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
}
