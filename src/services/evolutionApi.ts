/**
 * Service to integrate with Evolution API v2
 * Based on the Complete Guide & Production Best Practices for Evolution API V2
 * Default URL: https://evolutionapi.thalleshcm.com.br
 */

export interface EvolutionConfig {
  apiUrl: string;
  apiKey: string; // Global or Instance API Token
  instance: string;
  instanceToken?: string; // Dedicated instance token (hash from /instance/create)
}

export interface EvolutionConnectionState {
  instance: string;
  state: 'open' | 'connecting' | 'close' | 'refused' | 'unknown' | 'created';
  statusReason?: number;
  phone?: string;
  profileName?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  statusText: string;
  error?: string;
  timestamp: string;
  details?: any;
}

export type EvolutionMediaType = 'image' | 'video' | 'audio' | 'document';

/**
 * Format Brazilian or international phone number for WhatsApp
 * Guarantees DDI (55 for Brazil) + DDD + Phone number without special characters
 */
export function formatPhoneNumberForEvolution(rawPhone: string): string {
  let phone = (rawPhone || '').replace(/\D/g, '');
  if (!phone) return '';

  // Already has DDI (e.g. 5511999999999)
  if (phone.length >= 12 && phone.startsWith('55')) {
    return phone;
  }

  // 11 digits (DDD + 9 digits cell) -> add 55
  if (phone.length === 11) {
    return `55${phone}`;
  }

  // 10 digits (DDD + 8 digits landline/old cell)
  if (phone.length === 10) {
    const ddd = phone.substring(0, 2);
    const firstDigit = phone.substring(2, 3);
    if (firstDigit === '8' || firstDigit === '9') {
      if (firstDigit === '8') {
        phone = `${ddd}9${phone.substring(2)}`;
      }
      return `55${phone}`;
    }
    return `55${phone}`;
  }

  // 9 digits -> add default São Paulo DDD 11
  if (phone.length === 9) {
    return `5511${phone}`;
  }

  return phone.startsWith('55') ? phone : `55${phone}`;
}

/**
 * Check connection status of an instance in Evolution API
 * Endpoint: GET /instance/connectionState/{instanceName}
 */
export async function checkEvolutionConnection(config: EvolutionConfig): Promise<{
  connected: boolean;
  state: EvolutionConnectionState['state'];
  details?: any;
  message: string;
}> {
  const baseUrl = (config.apiUrl || 'https://evolutionapi.thalleshcm.com.br').replace(/\/+$/, '');
  const instance = config.instance?.trim() || 'aurum-crm';
  const apiKey = config.apiKey?.trim();

  if (!apiKey) {
    return {
      connected: false,
      state: 'unknown',
      message: 'API Key não configurada. Insira sua chave (Global Token ou Instance Token) nas Configurações.'
    };
  }

  try {
    const endpoint = `${baseUrl}/instance/connectionState/${encodeURIComponent(instance)}`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401 || response.status === 403) {
      return {
        connected: false,
        state: 'refused',
        message: 'Chave de API (apikey) inválida ou não autorizada pelo servidor Evolution API.'
      };
    }

    if (response.status === 404) {
      return {
        connected: false,
        state: 'close',
        message: `Instância "${instance}" não foi encontrada no servidor Evolution API. Você pode criá-la nas configurações.`
      };
    }

    if (!response.ok) {
      return {
        connected: false,
        state: 'unknown',
        message: `Servidor retornou status HTTP ${response.status} (${response.statusText}).`
      };
    }

    const data = await response.json();
    const stateStr = (data?.instance?.state || data?.state || 'unknown').toLowerCase();
    const isOpen = stateStr === 'open' || stateStr === 'connected';

    return {
      connected: isOpen,
      state: isOpen ? 'open' : (stateStr as any),
      details: data,
      message: isOpen
        ? `Instância "${instance}" conectada com sucesso ao WhatsApp!`
        : `Instância "${instance}" está com status: ${stateStr.toUpperCase()}. Escaneie o QR Code para conectar.`
    };
  } catch (error: any) {
    console.error('Evolution API connection error:', error);
    return {
      connected: false,
      state: 'unknown',
      message: `Não foi possível conectar ao servidor Evolution API (${baseUrl}): ${error?.message || 'Erro de rede ou CORS'}`
    };
  }
}

/**
 * Fetch QR Code for Evolution API Instance
 * Endpoint: GET /instance/connect/{instanceName}
 */
export async function getEvolutionQrCode(config: EvolutionConfig): Promise<{
  pairingCode?: string;
  code?: string;
  base64?: string;
  qrcode?: string;
  count?: number;
  message?: string;
  error?: string;
}> {
  const baseUrl = (config.apiUrl || 'https://evolutionapi.thalleshcm.com.br').replace(/\/+$/, '');
  const instance = config.instance?.trim() || 'aurum-crm';
  const apiKey = config.apiKey?.trim();

  if (!apiKey) {
    return { error: 'API Key não configurada' };
  }

  try {
    const endpoint = `${baseUrl}/instance/connect/${encodeURIComponent(instance)}`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { error: `Erro ao obter QR Code (HTTP ${response.status})` };
    }

    const data = await response.json();
    
    // Normalize QR code image data
    let qrImg = data?.qrcode?.base64 || data?.base64 || data?.qrcode || null;
    if (typeof qrImg === 'string' && qrImg.length > 0 && !qrImg.startsWith('data:image')) {
      qrImg = `data:image/png;base64,${qrImg}`;
    }

    return {
      ...data,
      base64: qrImg,
      qrcode: qrImg,
      pairingCode: data?.pairingCode || data?.code
    };
  } catch (err: any) {
    return { error: err?.message || 'Erro de conexão ao buscar QR Code' };
  }
}

/**
 * Create a new WhatsApp Instance on Evolution API
 * Endpoint: POST /instance/create
 */
export async function createEvolutionInstance(
  config: EvolutionConfig,
  customNumber?: string
): Promise<{
  success: boolean;
  instanceName?: string;
  instanceToken?: string;
  qrcode?: string;
  error?: string;
}> {
  const baseUrl = (config.apiUrl || 'https://evolutionapi.thalleshcm.com.br').replace(/\/+$/, '');
  const instance = config.instance?.trim() || 'aurum-crm';
  const apiKey = config.apiKey?.trim();

  if (!apiKey) {
    return { success: false, error: 'Chave Global da Evolution API necessária para criar instâncias.' };
  }

  try {
    const endpoint = `${baseUrl}/instance/create`;
    const payload: Record<string, any> = {
      instanceName: instance,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true
    };

    if (customNumber) {
      payload.number = formatPhoneNumberForEvolution(customNumber);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const resData = await response.json();

    if (!response.ok && response.status !== 403) {
      return {
        success: false,
        error: resData?.message || resData?.error || `Erro HTTP ${response.status}`
      };
    }

    const instanceToken = resData?.hash || resData?.instance?.token || resData?.token;
    let qr = resData?.qrcode?.base64 || resData?.qrcode || resData?.base64 || null;
    if (qr && typeof qr === 'string' && !qr.startsWith('data:image')) {
      qr = `data:image/png;base64,${qr}`;
    }

    return {
      success: true,
      instanceName: instance,
      instanceToken,
      qrcode: qr
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro ao comunicar com o servidor Evolution API.'
    };
  }
}

/**
 * Send a direct WhatsApp text message via Evolution API
 * Endpoint: POST /message/sendText/{instanceName}
 */
export async function sendEvolutionMessage(
  config: EvolutionConfig,
  recipientPhone: string,
  text: string
): Promise<SendMessageResult> {
  const baseUrl = (config.apiUrl || 'https://evolutionapi.thalleshcm.com.br').replace(/\/+$/, '');
  const instance = config.instance?.trim() || 'aurum-crm';
  // Use instance token if present, otherwise global token
  const token = config.instanceToken?.trim() || config.apiKey?.trim();
  const formattedNumber = formatPhoneNumberForEvolution(recipientPhone);

  if (!formattedNumber) {
    return {
      success: false,
      statusText: 'Número de telefone inválido',
      error: 'Telefone em formato inválido',
      timestamp: new Date().toISOString()
    };
  }

  if (!token) {
    return {
      success: false,
      statusText: 'API Key não configurada',
      error: 'Defina a Evolution API Key nas configurações do sistema',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const endpoint = `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`;
    const payload = {
      number: formattedNumber,
      text: text,
      delay: 1200,
      linkPreview: true
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorDetail = `Erro HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        errorDetail = errJson?.message || errJson?.error || JSON.stringify(errJson);
      } catch {
        // fallback
      }
      return {
        success: false,
        statusText: `Falha ao disparar mensagem (${response.status})`,
        error: errorDetail,
        timestamp: new Date().toISOString()
      };
    }

    const resData = await response.json();
    const messageId = resData?.key?.id || resData?.messageId || `msg-${Date.now()}`;

    return {
      success: true,
      messageId,
      statusText: 'Mensagem enviada com sucesso pelo WhatsApp via Evolution API!',
      timestamp: new Date().toISOString(),
      details: resData
    };
  } catch (err: any) {
    console.error('Failed to send Evolution message:', err);
    return {
      success: false,
      statusText: 'Erro de comunicação com o servidor',
      error: err?.message || 'Falha de rede ao conectar com a Evolution API',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Send Media (image, video, document) via Evolution API
 * Base64 MUST be pure (no "data:image/png;base64," prefix for the API body)
 * Endpoint: POST /message/sendMedia/{instanceName}
 */
export async function sendEvolutionMedia(
  config: EvolutionConfig,
  recipientPhone: string,
  mediaData: {
    mediaType: EvolutionMediaType;
    mediaUrlOrPureBase64: string;
    fileName?: string;
    caption?: string;
    mimetype?: string;
  }
): Promise<SendMessageResult> {
  const baseUrl = (config.apiUrl || 'https://evolutionapi.thalleshcm.com.br').replace(/\/+$/, '');
  const instance = config.instance?.trim() || 'aurum-crm';
  const token = config.instanceToken?.trim() || config.apiKey?.trim();
  const formattedNumber = formatPhoneNumberForEvolution(recipientPhone);

  if (!formattedNumber) {
    return {
      success: false,
      statusText: 'Número de telefone inválido',
      error: 'Telefone em formato inválido',
      timestamp: new Date().toISOString()
    };
  }

  if (!token) {
    return {
      success: false,
      statusText: 'API Key não configurada',
      error: 'Defina a Evolution API Key nas configurações do sistema',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const endpoint = `${baseUrl}/message/sendMedia/${encodeURIComponent(instance)}`;

    // Strip prefix if pure base64
    let cleanMedia = mediaData.mediaUrlOrPureBase64;
    if (cleanMedia.includes(';base64,')) {
      cleanMedia = cleanMedia.split(';base64,')[1];
    }

    const payload: Record<string, any> = {
      number: formattedNumber,
      mediatype: mediaData.mediaType,
      media: cleanMedia,
      caption: mediaData.caption || '',
      fileName: mediaData.fileName || `arquivo_${Date.now()}`
    };

    if (mediaData.mimetype) {
      payload.mimetype = mediaData.mimetype;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorDetail = `Erro HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        errorDetail = errJson?.message || errJson?.error || JSON.stringify(errJson);
      } catch {
        // fallback
      }
      return {
        success: false,
        statusText: `Falha ao enviar mídia (${response.status})`,
        error: errorDetail,
        timestamp: new Date().toISOString()
      };
    }

    const resData = await response.json();
    return {
      success: true,
      messageId: resData?.key?.id || `media-${Date.now()}`,
      statusText: 'Mídia enviada com sucesso pelo WhatsApp via Evolution API!',
      timestamp: new Date().toISOString(),
      details: resData
    };
  } catch (err: any) {
    return {
      success: false,
      statusText: 'Erro ao enviar mídia',
      error: err?.message || 'Falha de conexão com a Evolution API',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Logout from WhatsApp instance
 * Endpoint: POST /instance/logout/{instanceName}
 */
export async function logoutEvolutionInstance(config: EvolutionConfig): Promise<boolean> {
  const baseUrl = (config.apiUrl || 'https://evolutionapi.thalleshcm.com.br').replace(/\/+$/, '');
  const instance = config.instance?.trim() || 'aurum-crm';
  const apiKey = config.apiKey?.trim();

  if (!apiKey) return false;

  try {
    const endpoint = `${baseUrl}/instance/logout/${encodeURIComponent(instance)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Delete WhatsApp instance
 * Endpoint: DELETE /instance/delete/{instanceName}
 */
export async function deleteEvolutionInstance(config: EvolutionConfig): Promise<boolean> {
  const baseUrl = (config.apiUrl || 'https://evolutionapi.thalleshcm.com.br').replace(/\/+$/, '');
  const instance = config.instance?.trim() || 'aurum-crm';
  const apiKey = config.apiKey?.trim();

  if (!apiKey) return false;

  try {
    const endpoint = `${baseUrl}/instance/delete/${encodeURIComponent(instance)}`;
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

