import type { UiModal } from "../game/events/events";

type PortfolioModalProps = {
  modal: UiModal;
  onClose: () => void;
};

type ModalAction = {
  label: string;
  href: string;
  download?: boolean;
};

type ModalSection = {
  title: string;
  items: string[];
};

type ModalProject = {
  name: string;
  description: string;
  href: string;
  stack: string;
};

type ModalContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: ModalSection[];
  actions?: ModalAction[];
  projects?: ModalProject[];
};

const modalContent: Record<UiModal, ModalContent> = {
  cv: {
    eyebrow: "Career scroll",
    title: "Alejandro Hervas Gonzalez",
    intro:
      "Full Stack Web Developer. You can download the full CV as a PDF from this scroll.",
    actions: [
      {
        label: "Download CV",
        href: "/assets/cv/CV_Alejandro_Hervas.pdf",
        download: true,
      },
    ],
    sections: [
      {
        title: "Profile",
        items: [
          "Full stack developer trained in May 2025 after an intensive bootcamp.",
          "Hands-on experience building real projects from frontend to backend.",
          "Proactive, problem-solving profile with strong attention to detail.",
        ],
      },
      {
        title: "Main stack",
        items: [
          "Frontend: HTML, CSS, JavaScript, React, Redux and Tailwind.",
          "Backend: Node.js, Express, MongoDB, Mongoose, JWT and REST APIs.",
          "Tools: Git, GitHub, Postman, Vite, Bun, Redis, WebSockets and OpenAI API.",
        ],
      },
      {
        title: "Education",
        items: [
          "Full Stack Web Development Bootcamp at KeepCoding.",
          "Over 600 hours covering backend architecture, deployment, testing and agile methods.",
          "English level B1.",
        ],
      },
    ],
  },
  about: {
    eyebrow: "Personal log",
    title: "About me",
    intro:
      "In 2023 I redirected my career toward web development. I started with self-guided learning and then joined a full stack bootcamp to build complete applications with solid foundations.",
    actions: [
      {
        label: "GitHub profile",
        href: "https://github.com/AlexHervas",
      },
      {
        label: "Contact",
        href: "mailto:stackoverlord.dev@gmail.com",
      },
    ],
    sections: [
      {
        title: "Who I am",
        items: [
          "Junior full stack developer interested in product, UI and interactive experiences.",
          "I come from a previous professional stage where I built consistency, responsibility and calm under pressure.",
          "I enjoy building complete projects and understanding how frontend, backend and deployment fit together.",
        ],
      },
      {
        title: "What I build",
        items: [
          "Applications with React and TypeScript.",
          "Backends with Node.js, Express and MongoDB.",
          "Tools with AI, real-time features and a polished visual layer.",
        ],
      },
    ],
    projects: [
      {
        name: "NoPiques",
        description:
          "AI-powered phishing detection app with a React frontend and Express backend.",
        href: "https://github.com/AlexHervas/NoPiques",
        stack: "TypeScript, React, Express, OpenAI API, Redis",
      },
      {
        name: "Wallaclone",
        description:
          "Collaborative final bootcamp project: a Wallapop-style app with listings, authentication and real-time chat.",
        href: "https://github.com/KeepcodersWeb17/wallaclone",
        stack: "React, Redux, Node.js, Express, MongoDB, WebSockets",
      },
    ],
  },
};

export default function PortfolioModal({
  modal,
  onClose,
}: PortfolioModalProps) {
  const content = modalContent[modal];

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-[#101014]/80 px-4 py-3 backdrop-blur-[2px] sm:py-6"
      style={{ height: "var(--app-height, 100dvh)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-modal-title"
      onMouseDown={onClose}
    >
      <section
        className="relative flex max-h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden border-4 border-[#4f2d16] bg-[#d3a45f] p-2 text-[#2f1d12] shadow-[0_18px_0_rgba(0,0,0,0.35),0_0_0_4px_rgba(18,11,6,0.65)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-4 top-1 h-1 bg-[#f8df9b]/70" />
        <div className="pointer-events-none absolute inset-x-4 bottom-1 h-1 bg-[#6f3f1e]/45" />
        <div className="pointer-events-none absolute inset-y-4 left-1 w-1 bg-[#f8df9b]/55" />
        <div className="pointer-events-none absolute inset-y-4 right-1 w-1 bg-[#6f3f1e]/45" />

        <div
          className="min-h-0 flex-1 overflow-y-auto border-2 border-[#7a431f] bg-[#f2d58a] p-4 shadow-inner sm:p-5"
          style={{
            touchAction: "pan-y",
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
              aria-label="Close modal"
              onClick={onClose}
            >
              X
            </button>
          </header>

          <p className="mb-5 border-l-4 border-[#8f4e22] bg-[#f7e3a6]/55 px-3 py-2 font-mono text-sm leading-6 text-[#3d2818]">
            {content.intro}
          </p>

          {content.actions && (
            <div className="mb-5 flex flex-wrap gap-2">
              {content.actions.map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  download={action.download}
                  target={action.href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    action.href.startsWith("http")
                      ? "noreferrer noopener"
                      : undefined
                  }
                  className="border-2 border-[#4f2d16] bg-[#8f4e22] px-3 py-2 font-mono text-xs font-black uppercase text-[#ffe7a2] shadow-[inset_0_2px_0_rgba(255,255,255,0.25),0_3px_0_#2f1d12] transition hover:bg-[#a85e2c] focus:outline-none focus:ring-2 focus:ring-[#2f1d12]"
                >
                  {action.label}
                </a>
              ))}
            </div>
          )}

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

          {content.projects && (
            <div className="mt-4 border-2 border-[#7a431f] bg-[#f7e3a6]/55 p-4">
              <h3 className="mb-3 font-mono text-sm font-black uppercase text-[#5e3218]">
                Linked projects
              </h3>
              <div className="grid gap-3">
                {content.projects.map((project) => (
                  <a
                    key={project.name}
                    href={project.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block border-2 border-[#8f4e22] bg-[#ffe8aa]/60 p-3 font-mono text-[#3d2818] transition hover:bg-[#fff0bd] focus:outline-none focus:ring-2 focus:ring-[#2f1d12]"
                  >
                    <span className="block text-sm font-black uppercase text-[#5e3218]">
                      {project.name}
                    </span>
                    <span className="mt-1 block text-sm leading-5">
                      {project.description}
                    </span>
                    <span className="mt-2 block text-xs font-bold text-[#7a431f]">
                      {project.stack}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
