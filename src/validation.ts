import { Context } from "hono";
import { ZodSchema, ZodError } from "zod";

/**
 * Helper per validare e parsare il body della richiesta
 * Ritorna i dati validati o esegue una risposta di errore
 */
export async function validateBody<T>(
  c: Context,
  schema: ZodSchema
): Promise<T | null> {
  try {
    const body = await c.req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten();
      c.status(400);
      c.header("Content-Type", "application/json");
      await c.json({
        error: "Validazione fallita",
        details: errors,
      });
      return null;
    }

    return result.data as T;
  } catch (error) {
    c.status(400);
    c.header("Content-Type", "application/json");
    await c.json({
      error: "Body JSON non valido",
    });
    return null;
  }
}

/**
 * Helper per validare parametri (route params)
 */
export function validateParam(
  value: string | undefined,
  type: "number"
): number | null {
  if (!value) return null;

  if (type === "number") {
    const num = Number(value);
    return Number.isInteger(num) ? num : null;
  }

  return null;
}

/**
 * Formatta gli errori di Zod in modo user-friendly
 */
export function formatZodError(error: ZodError) {
  return error.issues.map((err) => ({
    path: err.path.join("."),
    message: err.message,
    code: err.code,
  }));
}


// 67!