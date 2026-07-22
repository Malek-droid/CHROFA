'use strict';

jest.mock('@whiskeysockets/baileys', () => {
  return {
    makeWASocket: jest.fn(() => ({
      ev: { on: jest.fn() },
      user: { id: 'mocked-id' },
      logout: jest.fn(),
      end: jest.fn(),
    })),
    useMultiFileAuthState: jest.fn(() => Promise.resolve({
      state: { creds: {} },
      saveCreds: jest.fn()
    })),
    DisconnectReason: {
      loggedOut: 'loggedOut',
      timedOut: 'timedOut',
      connectionLost: 'connectionLost',
      connectionClosed: 'connectionClosed',
      connectionReplaced: 'connectionReplaced',
      restartRequired: 'restartRequired',
      badSession: 'badSession',
    }
  };
});

jest.mock('pino', () => jest.fn(() => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
})));
