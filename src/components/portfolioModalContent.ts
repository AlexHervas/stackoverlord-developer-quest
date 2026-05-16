import type { UiModal } from "../game/events/events";

export type ModalAction = {
  label: string;
  href: string;
  download?: boolean;
};

export type ModalSection = {
  title: string;
  items: string[];
};

export type ModalProject = {
  name: string;
  description: string;
  href: string;
  stack: string;
};

export type ModalContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: ModalSection[];
  actions?: ModalAction[];
  projects?: ModalProject[];
};

export const modalContent: Record<UiModal, ModalContent> = {
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
        name: "StackOverlord: Developer Quest",
        description:
          "Interactive developer portfolio built as a small pixel-art game with scenes, NPCs, touch controls and an online combat ranking.",
        href: "https://github.com/AlexHervas/stackoverlord-developer-quest",
        stack: "TypeScript, React, Phaser 3, Vite, Tailwind CSS, Supabase",
      },
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
