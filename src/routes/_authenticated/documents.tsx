import { createFileRoute } from "@tanstack/react-router";
import PageHero from "@/components/PageHero";
import { LensWrap } from "@/components/effects/GravitationalLens";

export const Route = createFileRoute("/_authenticated/documents")({ component: () => <Stub eyebrow="Documents" title="Parse, extract, transform." desc="Upload docs, images, PDFs; get structured output." /> });

function Stub({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div>
      <PageHero eyebrow={eyebrow} title={title}>{desc}</PageHero>
      <LensWrap>
        <div className="glass-panel-strong rounded-2xl p-12 text-center">
          <div className="mx-auto w-24 h-24 rounded-full portal-tab flex items-center justify-center mb-6">
            <span className="text-3xl">📄</span>
          </div>
          <p className="text-sm text-[#E0F7FA]/60">Drop a file to begin.</p>
        </div>
      </LensWrap>
    </div>
  );
}
