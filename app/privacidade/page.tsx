import Link from "next/link";
import LogoMark, { Wordmark } from "@/components/ui/LogoMark";
import Footer from "@/components/ui/Footer";

export const metadata = {
  title: "Política de Privacidade — O Investidor",
};

export default function PrivacidadePage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <header className="border-b border-surface-border bg-surface">
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <Wordmark size={16} />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] flex-1 px-6 py-12">
        <h1 className="mb-2 text-3xl font-extrabold text-ink" style={{ letterSpacing: "-0.03em" }}>
          Política de Privacidade
        </h1>
        <p className="mb-10 text-sm text-ink-muted">Última atualização: maio de 2026</p>

        <div className="prose-sm space-y-8 text-ink-muted">
          <section>
            <h2 className="mb-2 text-base font-bold text-ink">1. Quem somos</h2>
            <p>
              O Investidor é um simulador educacional de carteira de investimentos. Não realizamos
              operações financeiras reais nem intermediamos investimentos. Os valores usados na
              plataforma são fictícios e têm fins exclusivamente didáticos.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">2. Dados que coletamos</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-ink">E-mail e senha:</strong> necessários para criar e
                autenticar sua conta. A senha é armazenada de forma criptografada pelo Supabase
                Auth.
              </li>
              <li>
                <strong className="text-ink">Dados de uso da plataforma:</strong> transações
                simuladas, composição da carteira e histórico de patrimônio — todos fictícios, sem
                vínculo com ativos financeiros reais.
              </li>
              <li>
                <strong className="text-ink">Dados técnicos:</strong> endereço IP para rate
                limiting e logs de erro via Sentry (sem dados pessoais além do IP).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">3. Como usamos os dados</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Autenticar sua sessão e manter sua carteira simulada persistida.</li>
              <li>Monitorar erros técnicos para melhorar a plataforma.</li>
              <li>Aplicar rate limiting para proteger a disponibilidade do serviço.</li>
            </ul>
            <p className="mt-3">
              Não vendemos, alugamos nem compartilhamos seus dados com terceiros para fins
              comerciais.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">4. Terceiros e subprocessadores</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-ink">Supabase</strong> — banco de dados e autenticação
                (Postgres hospedado, UE/EUA).
              </li>
              <li>
                <strong className="text-ink">Vercel</strong> — hospedagem e CDN (EUA).
              </li>
              <li>
                <strong className="text-ink">Sentry</strong> — monitoramento de erros (EUA).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">5. Retenção de dados</h2>
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa. Você pode solicitar a
              exclusão da conta e de todos os dados a qualquer momento via{" "}
              <a href="mailto:contato@oinvestidor.app" className="text-brand underline">
                contato@oinvestidor.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">6. Seus direitos (LGPD)</h2>
            <p>
              Nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:
              acessar, corrigir, exportar e excluir seus dados pessoais. Para exercer esses
              direitos, entre em contato pelo e-mail acima.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">7. Cookies</h2>
            <p>
              Usamos apenas cookies de sessão (HttpOnly, SameSite) essenciais para autenticação.
              Não utilizamos cookies de rastreamento ou publicidade.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">8. Alterações desta política</h2>
            <p>
              Podemos atualizar esta política periodicamente. A data de última atualização no topo
              deste documento será revisada. Mudanças relevantes serão comunicadas por e-mail.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
