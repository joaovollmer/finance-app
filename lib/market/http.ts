// Utilidades compartilhadas para chamadas HTTP que esperam JSON.
//
// Motivação: APIs públicas (BCB, Treasury) ocasionalmente respondem com
// página de erro em HTML/XML mesmo com status 200 — quando isso acontece,
// `await res.json()` joga um SyntaxError ("Unexpected token '<'") que
// estourava em rotas como /api/cron/snapshot. Este helper lê o body como
// texto, valida o início para garantir que parece JSON e só então faz
// JSON.parse — produzindo um Error legível em vez de SyntaxError.

export async function parseJsonResponse<T>(
  res: Response,
  context: string
): Promise<T> {
  const text = await res.text();
  const trimmed = text.trimStart();
  if (!trimmed) {
    throw new Error(`${context} retornou body vazio`);
  }
  // Detecção heurística: respostas XML/HTML começam com `<` (BCB e Treasury
  // já foram pegos devolvendo "<?xml" e "<html>" em manutenções).
  if (trimmed.startsWith("<")) {
    throw new Error(
      `${context} retornou XML/HTML em vez de JSON: ${trimmed.slice(0, 80)}`
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${context} retornou JSON inválido (${msg})`);
  }
}
