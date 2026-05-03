import type { UiModal } from "../game/events/events";

type PortfolioModalProps = {
  modal: UiModal;
  onClose: () => void;
};

const modalContent = {
  cv: {
    eyebrow: "Curriculum",
    title: "CV de Alejandro",
    intro:
      "Resumen profesional preparado para convertir esta sala del juego en una tarjeta interactiva de portfolio.",
    sections: [
      {
        title: "Perfil",
        items: [
          "Desarrollador frontend con foco en experiencias web interactivas.",
          "Trabajo con React, TypeScript, Vite y bases solidas de UI.",
          "Interes en productos con una capa visual cuidada y usable.",
        ],
      },
      {
        title: "Stack",
        items: ["React", "TypeScript", "Phaser", "Tailwind CSS", "Vite"],
      },
      {
        title: "Siguiente paso",
        items: [
          "Sustituir este texto por experiencia real, enlaces y proyectos destacados.",
        ],
      },
    ],
  },
  about: {
    eyebrow: "Sobre mi",
    title: "Quien hay detras del personaje",
    intro:
      "Un espacio para contar tu historia, tu forma de trabajar y que tipo de proyectos quieres construir.",
    sections: [
      {
        title: "Como trabajo",
        items: [
          "Me gusta construir interfaces claras, rapidas y con personalidad.",
          "Pienso en el producto desde la experiencia de quien lo usa.",
          "Prefiero iterar con una base funcional antes que quedarme solo en ideas.",
        ],
      },
      {
        title: "Intereses",
        items: [
          "Aplicaciones web",
          "Juegos 2D",
          "Animacion e interaccion",
          "Portfolio narrativo",
        ],
      },
    ],
  },
} satisfies Record<
  UiModal,
  {
    eyebrow: string;
    title: string;
    intro: string;
    sections: Array<{ title: string; items: string[] }>;
  }
>;

export default function PortfolioModal({ modal, onClose }: PortfolioModalProps) {
  const content = modalContent[modal];

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-[#101014]/80 px-4 py-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-modal-title"
      onMouseDown={onClose}
    >
      <section
        className="relative max-h-full w-full max-w-2xl overflow-hidden border-4 border-[#4f2d16] bg-[#d3a45f] p-2 text-[#2f1d12] shadow-[0_18px_0_rgba(0,0,0,0.35),0_0_0_4px_rgba(18,11,6,0.65)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-4 top-1 h-1 bg-[#f8df9b]/70" />
        <div className="pointer-events-none absolute inset-x-4 bottom-1 h-1 bg-[#6f3f1e]/45" />
        <div className="pointer-events-none absolute inset-y-4 left-1 w-1 bg-[#f8df9b]/55" />
        <div className="pointer-events-none absolute inset-y-4 right-1 w-1 bg-[#6f3f1e]/45" />

        <div
          className="max-h-[calc(100vh-4rem)] overflow-auto border-2 border-[#7a431f] bg-[#f2d58a] p-5 shadow-inner"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 15%, rgba(255,255,255,0.28) 0 1px, transparent 2px), radial-gradient(circle at 82% 72%, rgba(80,45,22,0.12) 0 1px, transparent 2px), linear-gradient(135deg, rgba(255,246,196,0.55), rgba(194,132,62,0.2))",
          }}
        >
          <header className="mb-5 flex items-start justify-between gap-4 border-b-2 border-[#7a431f]/60 pb-4">
            <div>
              <p className="mb-2 font-mono text-[11px] font-bold uppercase text-[#7a431f]">
                {content.eyebrow}
              </p>
              <h2
                id="portfolio-modal-title"
                className="font-mono text-2xl font-black leading-tight text-[#2b170d] drop-shadow-[1px_1px_0_rgba(255,244,190,0.8)]"
              >
                {content.title}
              </h2>
            </div>

            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center border-2 border-[#4f2d16] bg-[#8f4e22] font-mono text-lg font-black leading-none text-[#ffe7a2] shadow-[inset_0_2px_0_rgba(255,255,255,0.25),0_3px_0_#2f1d12] transition hover:bg-[#a85e2c] focus:outline-none focus:ring-2 focus:ring-[#2f1d12]"
              aria-label="Cerrar modal"
              onClick={onClose}
            >
              x
            </button>
          </header>

          <p className="mb-5 border-l-4 border-[#8f4e22] bg-[#f7e3a6]/55 px-3 py-2 font-mono text-sm leading-6 text-[#3d2818]">
            {content.intro}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {content.sections.map((section) => (
              <article
                key={section.title}
                className="border-2 border-[#8f4e22] bg-[#ffe8aa]/55 p-4 shadow-[inset_0_0_0_2px_rgba(79,45,22,0.08)]"
              >
                <h3 className="mb-3 border-b border-[#8f4e22]/45 pb-2 font-mono text-sm font-black uppercase text-[#5e3218]">
                  {section.title}
                </h3>
                <ul className="space-y-2 font-mono text-sm leading-5 text-[#3d2818]">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-2 w-2 shrink-0 border border-[#4f2d16] bg-[#8f4e22]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
