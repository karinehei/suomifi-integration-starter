import type { Persona } from "./types";

export const PERSONAS: readonly Persona[] = [
  {
    id: "DEMO-PERSON-001",
    givenName: "Aino",
    familyName: "Example",
    dateOfBirth: "1900-01-01",
    email: "aino.example@example.invalid",
    subject: "demo-subject-DEMO-PERSON-001",
  },
  {
    id: "DEMO-PERSON-002",
    givenName: "Eero",
    familyName: "Example",
    dateOfBirth: "1900-02-02",
    email: "eero.example@example.invalid",
    subject: "demo-subject-DEMO-PERSON-002",
  },
  {
    id: "DEMO-PERSON-003",
    givenName: "Salla",
    familyName: "Example",
    dateOfBirth: "1900-03-03",
    email: "salla.example@example.invalid",
    subject: "demo-subject-DEMO-PERSON-003",
  },
];

export const DEFAULT_PERSONA_ID = PERSONAS[0].id;

export function personaById(id: string | null): Persona | undefined {
  if (!id) return undefined;
  return PERSONAS.find((persona) => persona.id === id);
}
