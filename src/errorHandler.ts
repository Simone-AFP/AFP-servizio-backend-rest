import { Context, Next } from "hono";

/**
 * Tipi di errore personalizzati
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Middleware per gestire gli errori globalmente
 * Cattura errori non gestiti e li trasforma in risposte JSON strutturate
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();

    // Se non è stata inviata una risposta, significa 404
    if (!c.res.ok && c.res.status === 404) {
      return c.json(
        {
          error: "Risorsa non trovata",
          status: 404,
        },
        404
      );
    }
  } catch (error) {
    // Log dell'errore per debugging
    console.error("Error caught by handler:", error);

    // Gestione di errori AppError personalizzati
    if (error instanceof AppError) {
      return c.json(
        {
          error: error.message,
          status: error.statusCode,
          details: error.details,
        },
        error.statusCode
      );
    }

    // Gestione di errori generici
    if (error instanceof SyntaxError) {
      // Errore di parsing JSON
      return c.json(
        {
          error: "Errore di parsing del body",
          status: 400,
          details: error.message,
        },
        400
      );
    }

    // Errore sconosciuto - 500 Internal Server Error
    const message =
      error instanceof Error ? error.message : "Errore interno del server";

    return c.json(
      {
        error: "Errore interno del server",
        status: 500,
        details: message,
      },
      500
    );
  }
}
