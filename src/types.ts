import { z } from "zod";

export type CategoryName =
  | "casa"
  | "lavoro"
  | "compere"
  | "tempo libero"
  | "sport"
  | "famiglia";

export interface Category {
  id: number;
  name: CategoryName;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  completed: 0 | 1;
  categories: Category[];
}

export interface TaskCreate {
  title: string;
  description?: string;
  completed?: 0 | 1;
  categoryIds?: number[];
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  completed?: 0 | 1;
  categoryIds?: number[];
}

/**
 * Schemi Zod per la validazione dei dati
 */
export const CreateTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Titolo richiesto")
    .max(255, "Titolo troppo lungo"),
  description: z
    .string()
    .max(1000, "Descrizione troppo lunga")
    .optional()
    .default(""),
  completed: z
    .union([z.literal(0), z.literal(1), z.enum(["0", "1"])])
    .optional()
    .default(0)
    .transform((val) => (val === "1" || val === 1 ? 1 : 0)),
  categoryIds: z
    .array(z.number().int().positive("ID categoria non valido"))
    .optional()
    .default([]),
});

export const UpdateTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Titolo richiesto")
    .max(255, "Titolo troppo lungo")
    .optional(),
  description: z
    .string()
    .max(1000, "Descrizione troppo lunga")
    .optional(),
  completed: z
    .union([z.literal(0), z.literal(1), z.enum(["0", "1"])])
    .optional()
    .transform((val) =>
      val === undefined ? undefined : val === "1" || val === 1 ? 1 : 0
    ),
  categoryIds: z
    .array(z.number().int().positive("ID categoria non valido"))
    .optional(),
});

export type TaskCreateInput = z.infer<typeof CreateTaskSchema>;
export type TaskUpdateInput = z.infer<typeof UpdateTaskSchema>;
