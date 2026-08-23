import type { Express, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

export interface McpAuthResult {
  scopes: ('read' | 'write')[];
}

export interface McpServerDeps {
  isEnabled: () => boolean;
  authenticate: (rawToken: string) => McpAuthResult | null;
  getState: () => any;
  createLead: (body: any) => any;
}

function jsonRpcError(res: Response, status: number, message: string) {
  res.status(status).json({
    jsonrpc: '2.0',
    error: { code: -32000, message },
    id: null
  });
}

function buildServer(deps: McpServerDeps, scopes: ('read' | 'write')[]): McpServer {
  const server = new McpServer({ name: 'aurum-crm', version: '1.0.0' });

  server.registerTool(
    'crm_summary',
    { description: 'Resumo executivo do CRM: contagem de leads, contratos, comissões e VGV contratado.', inputSchema: {} },
    async () => {
      const state = deps.getState();
      const vgv = state.contracts.reduce((sum: number, c: any) => sum + (c.value || 0), 0);
      const text = JSON.stringify(
        {
          leads: state.leads.length,
          contratos: state.contracts.length,
          comissoesAReceber: state.commissions.filter((c: any) => c.status === 'a_receber').length,
          vgvTotalContratado: vgv
        },
        null,
        2
      );
      return { content: [{ type: 'text' as const, text }] };
    }
  );

  server.registerTool(
    'list_leads',
    {
      description: 'Lista leads do CRM, com filtros opcionais.',
      inputSchema: {
        stageId: z.string().optional().describe('Filtrar por etapa do funil'),
        funnelId: z.string().optional().describe('Filtrar por funil'),
        limit: z.number().optional().describe('Máximo de resultados (padrão 20)')
      }
    },
    async ({ stageId, funnelId, limit }) => {
      const state = deps.getState();
      let list = state.leads;
      if (stageId) list = list.filter((l: any) => l.stageId === stageId);
      if (funnelId) list = list.filter((l: any) => l.funnelId === funnelId);
      list = list.slice(0, limit || 20);
      return { content: [{ type: 'text' as const, text: JSON.stringify(list, null, 2) }] };
    }
  );

  server.registerTool(
    'get_lead',
    { description: 'Busca um lead específico pelo ID.', inputSchema: { id: z.string().describe('ID do lead') } },
    async ({ id }) => {
      const state = deps.getState();
      const lead = state.leads.find((l: any) => l.id === id);
      if (!lead) return { content: [{ type: 'text' as const, text: 'Lead não encontrado' }], isError: true };
      return { content: [{ type: 'text' as const, text: JSON.stringify(lead, null, 2) }] };
    }
  );

  server.registerTool(
    'list_contracts',
    { description: 'Lista contratos/vendas registrados no CRM.', inputSchema: { limit: z.number().optional() } },
    async ({ limit }) => {
      const state = deps.getState();
      const list = state.contracts.slice(0, limit || 20);
      return { content: [{ type: 'text' as const, text: JSON.stringify(list, null, 2) }] };
    }
  );

  server.registerTool(
    'list_commissions',
    {
      description: 'Lista parcelas de comissão, com filtro opcional por status.',
      inputSchema: {
        status: z.enum(['a_receber', 'recebido', 'atrasado']).optional(),
        limit: z.number().optional()
      }
    },
    async ({ status, limit }) => {
      const state = deps.getState();
      let list = state.commissions;
      if (status) list = list.filter((c: any) => c.status === status);
      list = list.slice(0, limit || 20);
      return { content: [{ type: 'text' as const, text: JSON.stringify(list, null, 2) }] };
    }
  );

  if (scopes.includes('write')) {
    server.registerTool(
      'create_lead',
      {
        description: 'Cria um novo lead no funil de vendas.',
        inputSchema: {
          name: z.string(),
          phone: z.string(),
          email: z.string().optional(),
          funnelId: z.string(),
          stageId: z.string(),
          temperature: z.enum(['quente', 'morno', 'frio']).optional(),
          origin: z.string().optional(),
          propertyInterest: z.string().optional(),
          estimatedValue: z.number().optional(),
          notes: z.string().optional()
        }
      },
      async args => {
        const lead = deps.createLead({
          temperature: 'morno',
          origin: 'Outro',
          propertyInterest: 'Não especificado',
          estimatedValue: 0,
          ...args
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(lead, null, 2) }] };
      }
    );
  }

  return server;
}

/** Mounts a stateless, Bearer-token-authenticated MCP endpoint at POST/GET/DELETE /mcp. */
export function mountMcpServer(app: Express, deps: McpServerDeps) {
  function authenticateRequest(req: Request, res: Response): McpAuthResult | null {
    if (!deps.isEnabled()) {
      jsonRpcError(res, 404, 'Servidor MCP desabilitado nas configurações do CRM.');
      return null;
    }
    const header = req.header('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      jsonRpcError(res, 401, 'Token de acesso ausente. Envie "Authorization: Bearer <token>".');
      return null;
    }
    const auth = deps.authenticate(token);
    if (!auth) {
      jsonRpcError(res, 401, 'Token inválido ou revogado.');
      return null;
    }
    return auth;
  }

  app.post('/mcp', async (req, res) => {
    const auth = authenticateRequest(req, res);
    if (!auth) return;

    const server = buildServer(deps, auth.scopes);
    try {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => {
        transport.close();
        server.close();
      });
    } catch (err) {
      console.error('Erro ao processar requisição MCP:', err);
      if (!res.headersSent) {
        jsonRpcError(res, 500, 'Erro interno do servidor MCP.');
      }
    }
  });

  app.get('/mcp', (req, res) => {
    jsonRpcError(res, 405, 'Método não permitido — este endpoint é stateless (use POST).');
  });

  app.delete('/mcp', (req, res) => {
    jsonRpcError(res, 405, 'Método não permitido — este endpoint é stateless (use POST).');
  });
}
