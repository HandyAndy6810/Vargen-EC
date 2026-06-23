import { Redirect } from 'expo-router';

export default function SettingsIndexRedirect() {
  return <Redirect href="/(tabs)/profile" />;
}
