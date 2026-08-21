import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';

/**
 * Quatro abas e o "+" no meio.
 *
 * O perfil voltou pra cá. Ele tinha saído pra abrir espaço pra uma aba de
 * nível e sequência, que era gamificação em cima de um app de controle de
 * dinheiro — e custava um dos quatro lugares.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="transacoes" />
      <Tabs.Screen name="metas" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
