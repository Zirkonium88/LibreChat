import { FileSources, EModelEndpoint } from 'librechat-data-provider';
import { createRun } from '~/agents/run';

jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  })),
  format: Object.assign(
    jest.fn((fn) => () => ({ transform: fn })),
    {
      combine: jest.fn(),
      colorize: jest.fn(),
      simple: jest.fn(),
      label: jest.fn(),
      timestamp: jest.fn(),
      printf: jest.fn(),
      errors: jest.fn(),
      splat: jest.fn(),
      json: jest.fn(),
    },
  ),
  addColors: jest.fn(),
  transports: { Console: jest.fn(), DailyRotateFile: jest.fn(), File: jest.fn() },
}));

const mockResolveHeaders = jest.fn((opts: { headers?: Record<string, string> }) => {
  // Simulate placeholder resolution
  const headers = { ...(opts?.headers ?? {}) };
  for (const [key, value] of Object.entries(headers)) {
    if (value.includes('{{LIBRECHAT_OPENID_ID_TOKEN}}')) {
      headers[key] = value.replace('{{LIBRECHAT_OPENID_ID_TOKEN}}', 'resolved-id-token');
    }
  }
  return headers;
});

jest.mock('~/utils/env', () => ({
  resolveHeaders: (opts: unknown) => mockResolveHeaders(opts as never),
  createSafeUser: jest.fn((u) => u ?? {}),
}));

jest.mock('@librechat/data-schemas', () => ({
  ...jest.requireActual('@librechat/data-schemas'),
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('@librechat/agents', () => {
  const actual = jest.requireActual('@librechat/agents');
  return {
    ...actual,
    Run: {
      create: jest.fn().mockResolvedValue({
        processStream: jest.fn().mockResolvedValue(undefined),
      }),
    },
  };
});

import { Run } from '@librechat/agents';

function makeAgent(overrides?: Record<string, unknown>) {
  return {
    id: 'agent_1',
    provider: 'openAI',
    endpoint: 'MyProxy',
    model: 'my-model',
    tools: [],
    model_parameters: { model: 'my-model' },
    maxContextTokens: 100_000,
    toolContextMap: {},
    ...overrides,
  };
}

async function callAndCapture(opts: { agents?: ReturnType<typeof makeAgent>[]; user?: unknown }) {
  const agents = opts.agents ?? [makeAgent()];
  const signal = new AbortController().signal;

  await createRun({
    agents: agents as never,
    signal,
    user: opts.user as never,
    streaming: true,
    streamUsage: true,
  });

  const createMock = Run.create as jest.Mock;
  expect(createMock).toHaveBeenCalledTimes(1);
  return createMock.mock.calls[0][0].graphConfig.agents as Array<Record<string, unknown>>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('custom endpoint headers in agent main LLM path', () => {
  it('forwards configuration.defaultHeaders from model_parameters to clientOptions', async () => {
    const agents = await callAndCapture({
      agents: [
        makeAgent({
          model_parameters: {
            model: 'my-model',
            configuration: {
              baseURL: 'https://my-proxy.example.com/v1',
              defaultHeaders: {
                'x-api-key': 'my-key',
                'X-OpenID-Token': '{{LIBRECHAT_OPENID_ID_TOKEN}}',
              },
            },
          },
        }),
      ],
    });

    const clientOptions = agents[0].clientOptions as Record<string, unknown>;
    const configuration = clientOptions.configuration as Record<string, unknown>;
    expect(configuration).toBeDefined();
    expect(configuration.defaultHeaders).toBeDefined();

    const headers = configuration.defaultHeaders as Record<string, string>;
    expect(headers['x-api-key']).toBe('my-key');
    // resolveHeaders mock replaces the placeholder
    expect(headers['X-OpenID-Token']).toBe('resolved-id-token');
  });

  it('calls resolveHeaders with user context for OpenID token resolution', async () => {
    const user = {
      id: 'user-1',
      provider: 'openid',
      openidId: 'oid-123',
      federatedTokens: {
        access_token: 'at-xxx',
        id_token: 'idt-xxx',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      },
    };

    await callAndCapture({
      agents: [
        makeAgent({
          model_parameters: {
            model: 'my-model',
            configuration: {
              baseURL: 'https://my-proxy.example.com/v1',
              defaultHeaders: {
                Authorization: 'Bearer {{LIBRECHAT_OPENID_ID_TOKEN}}',
              },
            },
          },
        }),
      ],
      user,
    });

    expect(mockResolveHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { Authorization: 'Bearer {{LIBRECHAT_OPENID_ID_TOKEN}}' },
      }),
    );
  });

  it('preserves configuration when endpoint is custom but provider is overridden to openAI', async () => {
    // This mirrors the real scenario: custom endpoint forced to Providers.OPENAI
    const agents = await callAndCapture({
      agents: [
        makeAgent({
          provider: 'openAI',
          endpoint: 'MyProxy',
          model_parameters: {
            model: 'my-model',
            configuration: {
              baseURL: 'https://my-proxy.example.com/v1',
              defaultHeaders: { 'X-Custom': 'value' },
            },
          },
        }),
      ],
    });

    const clientOptions = agents[0].clientOptions as Record<string, unknown>;
    const configuration = clientOptions.configuration as Record<string, unknown>;
    expect(configuration.baseURL).toBe('https://my-proxy.example.com/v1');
    expect((configuration.defaultHeaders as Record<string, string>)['X-Custom']).toBe('value');
  });
});
