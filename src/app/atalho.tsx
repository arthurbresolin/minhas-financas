import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { API_BASE_URL, ApiError } from '@/api/client';
import { createShortcutToken, getShortcutToken, revokeShortcutToken } from '@/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { alpha } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

/**
 * A tela que entrega o Atalho pronto.
 *
 * Ela não monta o Atalho — o iPhone não deixa um app criar Atalho por conta
 * própria. O que ela faz é tirar da frente tudo que a pessoa teria que
 * adivinhar: o endereço exato, o token, o cabeçalho, o corpo do JSON e onde
 * fica a chave do duplo toque. Sem isso o recurso existe no servidor e nunca
 * chega no bolso de ninguém.
 */
export default function AtalhoScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        setToken((await getShortcutToken()).token);
      } catch (e) {
        // 404 aqui é o caso normal de quem ainda não criou — não é erro.
        if (e instanceof ApiError && e.status !== 404) setErro('Não foi possível carregar.');
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  async function copiar(texto: string, oque: string) {
    await Clipboard.setStringAsync(texto);
    setCopiado(oque);
    setTimeout(() => setCopiado(null), 1800);
  }

  async function gerar() {
    setOcupado(true);
    setErro('');
    try {
      setToken((await createShortcutToken()).token);
    } catch {
      setErro('Não foi possível gerar o token.');
    } finally {
      setOcupado(false);
    }
  }

  async function revogar() {
    setOcupado(true);
    try {
      await revokeShortcutToken();
      setToken(null);
    } catch {
      setErro('Não foi possível revogar.');
    } finally {
      setOcupado(false);
    }
  }

  // A URL pronta, com o token dentro: é ela que faz o Atalho caber numa ação
  // só. O `[valor]` é onde a pessoa enfia a variável do "Pedir Entrada".
  const urlPronta = token ? `${API_BASE_URL}/shortcut/${token}/gasto?valor=` : '';

  return (
    <Screen tabBar={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <AppText size={18}>←</AppText>
        </Pressable>
        <AppText variant="condensed" size={22}>
          ATALHO DO IPHONE
        </AppText>
      </View>

      <AppText muted size={14}>
        Dois toques nas costas do celular, o valor, a categoria. O gasto entra sem você abrir o
        app.
      </AppText>

      {/* ---------------------------------------------------------------- */}
      {carregando ? (
        <Card alt>
          <AppText muted size={13}>
            Carregando…
          </AppText>
        </Card>
      ) : !token ? (
        <Card alt>
          <AppText variant="title" size={15}>
            Você ainda não criou o seu
          </AppText>
          <AppText muted size={13} style={{ marginTop: 6 }}>
            O Atalho usa uma senha própria, só dele. Ela consegue lançar um gasto e mais nada — não
            lê seu saldo, não apaga nada, e você pode cancelá-la sozinha se perder o celular.
          </AppText>
          <View style={{ marginTop: 14 }}>
            <Button title="Criar meu atalho" onPress={gerar} loading={ocupado} />
          </View>
        </Card>
      ) : (
        <>
          <Campo
            rotulo="o endereço, com sua senha dentro"
            valor={urlPronta}
            copiado={copiado === 'url'}
            onCopy={() => copiar(urlPronta, 'url')}
            segredo
          />

          {/* -------------------------------------------------------------- */}
          <AppText variant="condensed" size={17} style={{ marginTop: 6 }}>
            COMO MONTAR · 5 AÇÕES
          </AppText>

          <AppText muted size={12.5} style={{ lineHeight: 19 }}>
            Não dá pra entregar pronto: desde o iOS 15 a Apple só importa atalho assinado, e
            assinar exige um Mac. Cada linha aqui é uma ação — busque pelo nome em negrito.
          </AppText>

          <Card alt>
            <Passo n="1">
              <B>Ask for Input</B> — Prompt: <B>Quanto foi?</B> · Input Type: <B>Number</B>
            </Passo>
            <Passo n="2">
              <B>List</B> — toque no <B>+</B> e escreva suas categorias, uma por linha:
              Alimentação, Transporte, Lazer, Saúde, Shopping, Serviços, Outros.
            </Passo>
            <Passo n="3">
              <B>Choose from List</B> — Prompt: <B>Foi com o quê?</B>
            </Passo>
            <Passo n="4">
              <B>Get Contents of URL</B> — cole o endereço acima, Method <B>POST</B>. Depois do{' '}
              <B>=</B> do valor, ponha a variável <B>Provided Input</B>; no fim, escreva{' '}
              <B>&amp;categoria=</B> e ponha a variável <B>Chosen Item</B>.
            </Passo>
            <Passo n="5" ultimo>
              <B>Show Notification</B> — escolha a variável <B>Contents of URL</B>.
            </Passo>
          </Card>

          <Card alt>
            <AppText variant="title" size={13}>
              Como pôr uma variável
            </AppText>
            <AppText muted size={12.5} style={{ marginTop: 6, lineHeight: 19 }}>
              Toque no ponto exato do texto onde ela entra. Na barra acima do teclado aparece{' '}
              <B>Select Variable</B> — toque nela e escolha a saída da ação anterior. Ela vira um
              chip azul dentro do texto.
            </AppText>
          </Card>

          <Card alt>
            <AppText variant="title" size={14}>
              Ligar no duplo toque
            </AppText>
            <AppText muted size={13} style={{ marginTop: 6, lineHeight: 20 }}>
              Ajustes → Acessibilidade → Toque → <B>Tocar Atrás</B> → Toque Duplo → escolha o seu
              Atalho no fim da lista.
            </AppText>
          </Card>

          {/* -------------------------------------------------------------- */}
          <Card alt>
            <AppText variant="mono" size={10} muted style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
              se quiser conferir as categorias
            </AppText>
            <Pressable onPress={() => copiar(`${API_BASE_URL}/shortcut/categorias`, 'cat')} style={{ marginTop: 8 }}>
              <AppText variant="mono" size={11} color={theme.accent}>
                {copiado === 'cat' ? 'copiado ✓' : 'copiar endereço das categorias'}
              </AppText>
            </Pressable>
          </Card>

          <View style={{ gap: 10, marginTop: 4 }}>
            <Button title="Gerar uma senha nova" variant="ghost" onPress={gerar} disabled={ocupado} />
            <Button title="Cancelar o atalho" variant="danger" onPress={revogar} disabled={ocupado} />
            <AppText variant="mono" size={10} muted style={{ textAlign: 'center' }}>
              gerar uma nova invalida a anterior na hora
            </AppText>
          </View>
        </>
      )}

      {erro ? <AppText color={theme.negative}>{erro}</AppText> : null}

      {/* O aviso honesto: hoje o backend só existe nesta máquina. */}
      {token && API_BASE_URL.includes('192.168') ? (
        <Card alt>
          <AppText variant="title" size={13}>
            ⚠ Só funciona no seu Wi-Fi
          </AppText>
          <AppText muted size={12.5} style={{ marginTop: 6 }}>
            Esse endereço é o do seu computador na rede de casa. Fora dela o Atalho não vai
            alcançar — pra funcionar na rua, o backend precisa estar publicado na internet.
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

/** Um texto pra copiar. Tocar copia — não existe "selecionar" confortável aqui. */
function Campo({
  rotulo,
  valor,
  copiado,
  onCopy,
  segredo = false,
}: {
  rotulo: string;
  valor: string;
  copiado: boolean;
  onCopy: () => void;
  segredo?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable onPress={onCopy}>
      <Card alt>
        <AppText variant="mono" size={10} muted style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
          {rotulo}
        </AppText>
        <View
          style={{
            marginTop: 8,
            backgroundColor: alpha(theme.bg, 0.6),
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 10,
            padding: 10,
          }}
        >
          <AppText variant="mono" size={12} selectable>
            {valor}
          </AppText>
        </View>
        <AppText variant="mono" size={10} color={copiado ? theme.positive : theme.accent} style={{ marginTop: 8 }}>
          {copiado ? 'copiado ✓' : 'toque pra copiar'}
        </AppText>
        {segredo ? (
          <AppText variant="mono" size={10} muted style={{ marginTop: 4 }}>
            só lança gasto · não lê saldo · dá pra cancelar
          </AppText>
        ) : null}
      </Card>
    </Pressable>
  );
}

function Passo({ n, children, ultimo = false }: { n: string; children: React.ReactNode; ultimo?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 9,
        borderBottomWidth: ultimo ? 0 : 1,
        borderBottomColor: alpha(theme.border, 0.6),
      }}
    >
      <AppText variant="mono" size={12} color={theme.accent} style={{ width: 14 }}>
        {n}
      </AppText>
      <AppText size={13.5} style={{ flex: 1, lineHeight: 20 }}>
        {children}
      </AppText>
    </View>
  );
}

/** Destaque dentro do passo: o que a pessoa procura na tela do iPhone. */
function B({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <AppText variant="title" size={13.5} color={theme.text}>
      {children}
    </AppText>
  );
}
