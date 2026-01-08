import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Aleo Dev Toolkit',
  tagline: 'Tools and libraries for building on Aleo',
  favicon: 'img/logo.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://your-docusaurus-site.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'ProvableHQ', // Usually your GitHub org/user name.
  projectName: 'aleo-dev-toolkit', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/ProvableHQ/aleo-dev-toolkit/tree/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Aleo Dev Toolkit',
      logo: {
        alt: 'Aleo Dev Toolkit Logo',
        src: 'img/logo.png',
        style: {
          width: 20,
          height: 20,
        },
      },
      items: [
        {
          href: '/docs/wallet-adapter',
          label: 'Wallet Adapter',
          position: 'left',
        },
        {
          href: 'https://github.com/ProvableHQ/aleo-dev-toolkit',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      logo: {
        alt: 'Meta Open Source Logo',
        src: 'img/provable-logo-dark.svg',
        srcDark: 'img/provable-logo-light.svg',
        href: 'https://provable.com',
        width: 160,
        height: 51,
      },
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'tsx'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
