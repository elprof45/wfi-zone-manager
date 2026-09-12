export class NetPulseError extends Error {
  constructor(message: string, readonly code: string, readonly details?: unknown) {
    super(message);
    this.name = 'NetPulseError';
  }
}

export class RouterOsHttpError extends NetPulseError {
  constructor(readonly status: number, message: string, readonly endpoint: string, details?: unknown) {
    super(message, 'ROUTEROS_HTTP_ERROR', details);
    this.name = 'RouterOsHttpError';
  }
}

export class AuthorizationError extends NetPulseError {
  constructor(message = 'Commande non autorisée.') {
    super(message, 'TELEGRAM_UNAUTHORIZED');
    this.name = 'AuthorizationError';
  }
}

export class ConfirmationRequiredError extends NetPulseError {
  constructor(readonly confirmationId: string, message = 'Confirmation requise.') {
    super(message, 'CONFIRMATION_REQUIRED');
    this.name = 'ConfirmationRequiredError';
  }
}
