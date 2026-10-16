import { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'Hệ Thống Tài Liệu Thiết Kế Kỹ Thuật',
  tagline: 'Documentation-as-Code Platform',
  favicon: 'img/favicon.ico',

  url: 'https://docs.yourcompany.internal',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'vi',
    locales: ['vi'],
  },

  // Kích hoạt Mermaid diagram
  markdown: {
    mermaid: true,
  },
  themes: [
    '@docusaurus/theme-mermaid',
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        hashed: true,
        language: ['en'],
        indexDocs: true,
        indexBlog: false,
        indexPages: false,
        docsRouteBasePath: '/',
        highlightSearchTermsOnTargetPage: true,
        searchResultLimits: 8,
        searchBarShortcut: true,
        searchBarPosition: 'right',
      }),
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Biến Docs thành trang chủ chính
          editUrl: undefined,
          showLastUpdateAuthor: false,
          showLastUpdateTime: false,
        },
        blog: false, // Tắt blog nếu chỉ tập trung làm portal kỹ thuật
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },

    // Theme cho Mermaid
    mermaid: {
      theme: {
        light: 'neutral',
        dark: 'dark',
      },
    },

    navbar: {
      title: 'Tài liệu thiết kế kỹ thuật HPT',
      logo: {
        alt: 'Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Tài liệu thiết kế',
        },
        {
          href: 'https://github.com/your-org/software-architecture',
          label: 'Repository',
          position: 'right',
        },
      ],
    },

    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },

    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs Hub',
          items: [
            {
              label: 'Tổng quan kiến trúc',
              to: '/',
            },
          ],
        },
      ],
      copyright: `Bản quyền thuộc © ${new Date().getFullYear()} Engineering Team. Xây dựng trên Docusaurus & TypeScript.`,
    },

    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml', 'sql', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
