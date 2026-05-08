import Link from "next/link";
import LogoMark, { Wordmark } from "@/components/ui/LogoMark";
import Footer from "@/components/ui/Footer";

export const metadata = {
  title: "Termos de Uso — O Investidor",
};

export default function TermosPage() {
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
          Termos de Uso
        </h1>
        <p className="mb-10 text-sm text-ink-muted">Última atualização: maio de 2026</p>

        <div className="prose-sm space-y-8 text-ink-muted">
          <section>
            <h2 className="mb-2 text-base font-bold text-ink">1. Natureza do serviço</h2>
            <p>
              O Investidor é uma plataforma educacional de simulação de investimentos. Todas as
              operações, valores, saldos e rentabilidades exibidas são <strong className="text-ink">
              fictícios</strong> e não representam investimentos reais. A plataforma não é uma
              corretora, gestora ou distribuidora de valores mobiliários. Não recebemos nem
              movimentamos dinheiro real.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">2. Isenção de responsabilidade</h2>
            <p>
              As informações, cotações, indicadores e análises exibidas têm fins exclusivamente
              educacionais e <strong className="text-ink">não constituem recomendação de
              investimento</strong>. O desempenho passado simulado não é garantia de resultado
              futuro real. Sempre consulte um profissional certificado (CFP, CNPI) antes de tomar
              decisões financeiras reais.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">3. Elegibilidade</h2>
            <p>
              O serviço é destinado a pessoas com 16 anos ou mais. Ao criar uma conta, você
              declara ter capacidade civil para aceitar estes termos.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">4. Conta e segurança</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Você é responsável pela confidencialidade de sua senha.</li>
              <li>
                Nos reserve o direito de suspender contas que violem estes termos ou que apresentem
                comportamento abusivo (tentativas de scraping, sobrecarga de API, etc.).
              </li>
              <li>
                Não compartilhe sua conta. Cada conta deve pertencer a um único titular.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">5. Uso aceitável</h2>
            <p>É proibido usar a plataforma para:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Realizar engenharia reversa, scraping automatizado ou sobrecarga intencional.</li>
              <li>Reproduzir, redistribuir ou comercializar o conteúdo sem autorização.</li>
              <li>Qualquer finalidade ilícita nos termos da legislação brasileira.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">6. Disponibilidade</h2>
            <p>
              Nos esforçamos para manter o serviço disponível, mas não garantimos disponibilidade
              contínua. Podemos interromper ou modificar funcionalidades sem aviso prévio durante
              a fase beta.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">7. Propriedade intelectual</h2>
            <p>
              O código-fonte, design e marca &ldquo;O Investidor&rdquo; são propriedade dos seus criadores.
              Os dados de mercado são fornecidos por terceiros (Yahoo Finance, BCB, U.S. Treasury)
              sob suas respectivas condições de uso.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">8. Foro e lei aplicável</h2>
            <p>
              Estes termos são regidos pela legislação brasileira. Eventuais conflitos serão
              resolvidos no foro da comarca de São Paulo/SP.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-ink">9. Alterações</h2>
            <p>
              Podemos atualizar estes termos. A data de última atualização será revisada.
              O uso contínuo da plataforma após mudanças implica aceitação dos novos termos.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
