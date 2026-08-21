import Constants from 'expo-constants';

import { getToken } from '@/lib/auth-storage';

/** A porta em que o backend roda em desenvolvimento. */
const API_PORT = 8001;

/**
 * Onde está o backend.
 *
 * O aparelho não enxerga `localhost` — ali `localhost` é o próprio celular. Por
 * isso precisa do IP da máquina na rede, e esse IP muda: troca de Wi-Fi, o
 * roteador renova a concessão, e o app para de carregar sem dizer por quê. Já
 * aconteceu duas vezes.
 *
 * Então em vez de deixá-lo escrito num `.env` que envelhece, ele é *deduzido*:
 * o Expo já disse ao app de qual endereço o próprio código veio (`hostUri`), e
 * o backend está na mesma máquina. Trocar de rede passa a não exigir nada.
 *
 * Duas exceções em que o `hostUri` não serve, e aí manda o `.env`:
 * - **túnel** — o código vem de um domínio `.exp.direct`, mas a API não;
 * - **backend em outra máquina** — ninguém adivinha isso.
 */
function descobrirBaseUrl(): string {
  const configurado = process.env.EXPO_PUBLIC_API_URL;

  // `hostUri` vem como "192.168.0.111:8081" (ou "localhost:8081" na web).
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  const ehIpLocal = !!host && /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

  if (ehIpLocal) return `http://${host}:${API_PORT}`;
  if (configurado) return configurado;
  return `http://localhost:${API_PORT}`;
}

export const API_BASE_URL = descobrirBaseUrl();

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    // O token é anexado aqui, uma vez, em vez de cada chamada passar o header
    // na mão — um header explícito em `options` ainda sobrescreve.
    const token = await getToken();
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão.');
  }

  if (!response.ok) {
    // A API responde com `detail` em português; usar essa mensagem evita
    // mostrar "erro 409" pra quem só quer saber o que fazer a seguir.
    let detail: string | undefined;
    try {
      detail = (await response.json())?.detail;
    } catch {
      detail = undefined;
    }
    throw new ApiError(
      typeof detail === 'string' ? detail : `O servidor respondeu com um erro (${response.status}).`,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, options),
  post: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: 'DELETE' }),
};
