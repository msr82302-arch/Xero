export type ServiceCategory =
  | 'DEVELOPMENT'
  | 'INTELLIGENCE'
  | 'SOLUTIONS'
  | 'INFRASTRUCTURE'
  | 'CREATIVE';

export type ServiceIconName =
  | 'Code2'
  | 'Smartphone'
  | 'Sparkles'
  | 'Store'
  | 'Wrench'
  | 'Network'
  | 'ShieldCheck'
  | 'Palette'
  | 'TrendingUp'
  | 'CreditCard'
  | 'LifeBuoy'
  | 'Layers';

export interface ServiceItem {
  id: number;
  code: string;
  slug: string;
  name: string;
  shortName: string;
  nameAr: string;
  category: ServiceCategory;
  categoryLabel: string;
  benchmarkPriceBHD: string;
  numericPriceBHD: number;
  timeline: string;
  description: string;
  deliverables: string[];
  techStack: string[];
  iconName: ServiceIconName;
  featured: boolean;
}

export interface CaseStudyItem {
  id: string;
  referenceCode: string;
  client: string;
  clientAr: string;
  sector: string;
  title: string;
  contractValueBHD: string;
  financialNote: string;
  timeline: string;
  status: string;
  summary: string;
  deliverables: string[];
  architecture: string[];
}

export interface XbmsReceiptRecord {
  receiptNo: string;
  date: string;
  client: string;
  service: string;
  totalBHD: string;
  paidBHD: string;
  balanceBHD: string;
  status: 'Paid' | 'Partial (50%)' | 'Pending';
}

export function formatBHD(value: number): string {
  return `${value.toFixed(3)} BHD`;
}

export const COMPANY_INFO = {
  brandName: 'XeroTech Technologies',
  brandShort: 'XeroTech',
  brandNameAr: 'زيروتك للتكنولوجيا',
  slogan: 'Innovate • Automate • Grow',
  crNumber: '201130-1',
  crAuthority: 'Ministry of Industry & Commerce, Kingdom of Bahrain',
  address: 'Near IMC Hospital, Lulu Road, Riffa, Kingdom of Bahrain',
  addressShort: 'Lulu Road, Riffa, Bahrain',
  phones: ['+973 3357 8768', '+973 3694 7843'],
  whatsappDigits: '97333578768',
  whatsappDisplay: '+973 3357 8768',
  emails: ['info@xerotechtechnologies.com', 'madeenaspc@gmail.com', 'xerotech.techno@gmail.com'],
  primaryEmail: 'info@xerotechtechnologies.com',
  website: 'https://www.xerotechtechnologies.com',
  socialHandle: '@xerotechtechnologies',
  currency: 'BHD',
} as const;

export const services: ServiceItem[] = [
  {
    id: 1,
    code: 'DEV-WEB',
    slug: 'software-web-development',
    name: 'Software & Web Development',
    shortName: 'Software & Web',
    nameAr: 'تطوير البرمجيات والمواقع',
    category: 'DEVELOPMENT',
    categoryLabel: 'Development',
    benchmarkPriceBHD: '250.000',
    numericPriceBHD: 250.0,
    timeline: '14–21 Working Days',
    description:
      'High-conversion corporate platforms, bilingual Arabic/English interfaces, and full-stack web portals engineered for speed, SEO visibility, and GCC compliance.',
    deliverables: [
      'Custom responsive Next.js / React frontend architecture',
      'Bilingual RTL/LTR Arabic & English content layout',
      'SSL deployment, technical SEO schema & CMS integration',
    ],
    techStack: ['React 19', 'Next.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
    iconName: 'Code2',
    featured: true,
  },
  {
    id: 2,
    code: 'DEV-MOB',
    slug: 'mobile-app-development',
    name: 'Mobile App Development',
    shortName: 'Mobile Apps',
    nameAr: 'تطوير تطبيقات الجوال',
    category: 'DEVELOPMENT',
    categoryLabel: 'Development',
    benchmarkPriceBHD: '350.000',
    numericPriceBHD: 350.0,
    timeline: '30–45 Working Days',
    description:
      'Cross-platform iOS and Android applications featuring native push notifications, biometric authentication, offline caching, and Bahrain payment integrations.',
    deliverables: [
      'iOS & Android production builds (App Store & Play Store)',
      'BenefitPay / AFS checkout & real-time push alerts',
      'REST API synchronization & telemetry analytics',
    ],
    techStack: ['React Native', 'Flutter', 'TypeScript', 'Firebase', 'REST API'],
    iconName: 'Smartphone',
    featured: true,
  },
  {
    id: 3,
    code: 'AI-AUTO',
    slug: 'ai-automation',
    name: 'AI & Automation',
    shortName: 'AI & Automation',
    nameAr: 'الذكاء الاصطناعي والأتمتة',
    category: 'INTELLIGENCE',
    categoryLabel: 'Intelligence',
    benchmarkPriceBHD: '200.000',
    numericPriceBHD: 200.0,
    timeline: '10–20 Working Days',
    description:
      'Intelligent business process automation, custom LLM workflow agents, WhatsApp lead routing, and document OCR pipelines built to eliminate manual bottlenecks.',
    deliverables: [
      'WhatsApp & CRM automated client intake bots',
      'Document parsing, invoice extraction & RAG search',
      'Custom n8n / Python orchestration & webhook triggers',
    ],
    techStack: ['Python', 'Gemini AI', 'OpenAI API', 'LangChain', 'FastAPI'],
    iconName: 'Sparkles',
    featured: true,
  },
  {
    id: 4,
    code: 'BIZ-POS',
    slug: 'pos-business-applications',
    name: 'POS & Business Applications',
    shortName: 'POS & ERP Apps',
    nameAr: 'نقاط البيع والتطبيقات التجارية',
    category: 'SOLUTIONS',
    categoryLabel: 'Solutions',
    benchmarkPriceBHD: '300.000',
    numericPriceBHD: 300.0,
    timeline: '14–30 Working Days',
    description:
      'Tailored retail point-of-sale, F&B kitchen display workflows, multi-branch inventory tracking, and VAT-compliant BHD financial ledgers for Bahrain enterprises.',
    deliverables: [
      '3-decimal BHD billing & Bahrain VAT 10% receipts',
      'Barcode inventory sync & multi-branch stock alerts',
      'Role-based cashier, supervisor & audit logs',
    ],
    techStack: ['Django', 'PostgreSQL', 'React', 'Thermal ESC/POS', 'Docker'],
    iconName: 'Store',
    featured: true,
  },
  {
    id: 5,
    code: 'INF-SUP',
    slug: 'it-support-computer-repair',
    name: 'IT Support & Computer Repair',
    shortName: 'IT Support',
    nameAr: 'الدعم الفني وصيانة الحواسيب',
    category: 'INFRASTRUCTURE',
    categoryLabel: 'Infrastructure',
    benchmarkPriceBHD: '40.000',
    numericPriceBHD: 40.0,
    timeline: '24–48 Hours SLA',
    description:
      'Rapid workstation diagnostics, NVMe/RAM hardware upgrades, OS provisioning, and on-site technical support across Riffa, Manama, and Muharraq.',
    deliverables: [
      'Full hardware diagnostics & thermal/component servicing',
      'OS recovery, encrypted backup & endpoint hardening',
      'On-site Riffa HQ or remote rapid-response SLA',
    ],
    techStack: ['Windows Server', 'macOS', 'Ubuntu Linux', 'Endpoint EDR', 'NVMe'],
    iconName: 'Wrench',
    featured: false,
  },
  {
    id: 6,
    code: 'INF-NET',
    slug: 'networking-solutions',
    name: 'Networking Solutions',
    shortName: 'Networking',
    nameAr: 'حلول الشبكات والاتصالات',
    category: 'INFRASTRUCTURE',
    categoryLabel: 'Infrastructure',
    benchmarkPriceBHD: '150.000',
    numericPriceBHD: 150.0,
    timeline: '5–10 Working Days',
    description:
      'Enterprise LAN/WAN cabling, multi-floor mesh Wi-Fi 6/7 coverage, VLAN segmentation, and secure branch-to-HQ VPN tunneling for commercial offices.',
    deliverables: [
      'Structured Cat6/Fiber cabling & patch panel labeling',
      'VLAN segmentation, guest isolation & SD-WAN failover',
      'Site-to-site encrypted VPN & MikroTik/Ubiquiti setup',
    ],
    techStack: ['Ubiquiti UniFi', 'MikroTik', 'Cisco', 'WireGuard VPN', 'VLAN'],
    iconName: 'Network',
    featured: false,
  },
  {
    id: 7,
    code: 'INF-SEC',
    slug: 'cloud-cybersecurity',
    name: 'Cloud & Cybersecurity',
    shortName: 'Cloud & Security',
    nameAr: 'الحوسبة السحابية والأمن السيبراني',
    category: 'INFRASTRUCTURE',
    categoryLabel: 'Infrastructure',
    benchmarkPriceBHD: '200.000',
    numericPriceBHD: 200.0,
    timeline: '7–14 Working Days',
    description:
      'Hardened cloud infrastructure provisioning, automated daily off-site backups, zero-trust firewall policies, and vulnerability assessments for business continuity.',
    deliverables: [
      'AWS / DigitalOcean / Contabo hardened server setup',
      'WAF, SSL/TLS enforcement & DDoS mitigation rules',
      'Automated daily snapshots & disaster recovery drill',
    ],
    techStack: ['AWS', 'Docker', 'Cloudflare WAF', 'Nginx', 'Zero-Trust'],
    iconName: 'ShieldCheck',
    featured: false,
  },
  {
    id: 8,
    code: 'DSG-GRP',
    slug: 'graphic-design',
    name: 'Graphic Design',
    shortName: 'Graphic Design',
    nameAr: 'التصميم الجرافيكي والهوية',
    category: 'CREATIVE',
    categoryLabel: 'Creative',
    benchmarkPriceBHD: '80.000',
    numericPriceBHD: 80.0,
    timeline: '5–10 Working Days',
    description:
      'Executive brand identities, bilingual corporate profiles, UI/UX design systems, and print-ready packaging aligned with modern GCC enterprise aesthetics.',
    deliverables: [
      'Vector brand mark, typography & color token kit',
      'Bilingual corporate stationery & company profile PDF',
      'Social media visual templates & Figma UI assets',
    ],
    techStack: ['Figma', 'Adobe Illustrator', 'Photoshop', 'InDesign', 'Brand Kit'],
    iconName: 'Palette',
    featured: false,
  },
  {
    id: 9,
    code: 'MKT-MET',
    slug: 'digital-marketing-meta-ads',
    name: 'Digital Marketing & Meta Ads',
    shortName: 'Meta Ads & Growth',
    nameAr: 'التسويق الرقمي وإعلانات ميتا',
    category: 'CREATIVE',
    categoryLabel: 'Creative',
    benchmarkPriceBHD: '120.000',
    numericPriceBHD: 120.0,
    timeline: 'Monthly Retainer',
    description:
      'Targeted performance campaigns across Meta (Instagram & Facebook), TikTok, and Google Search tailored to Bahrain demographics with WhatsApp lead attribution.',
    deliverables: [
      'Meta Pixel, Conversions API & WhatsApp lead funnel',
      'Localized English/Arabic ad creatives & copywriting',
      'Monthly ROAS, CPL & audience conversion reporting',
    ],
    techStack: ['Meta Ads Manager', 'Conversions API', 'Google Ads', 'TikTok Ads', 'GA4'],
    iconName: 'TrendingUp',
    featured: false,
  },
  {
    id: 10,
    code: 'SOL-NFC',
    slug: 'nfc-digital-cards-menu-solutions',
    name: 'NFC Digital Cards & Menu Solutions',
    shortName: 'NFC Cards & Menus',
    nameAr: 'بطاقات NFC وقوائم الطعام الرقمية',
    category: 'SOLUTIONS',
    categoryLabel: 'Solutions',
    benchmarkPriceBHD: '50.000',
    numericPriceBHD: 50.0,
    timeline: '3–7 Working Days',
    description:
      'Tap-to-connect NFC smart business cards and instant QR/NFC restaurant eMenu platforms with live pricing updates, WhatsApp ordering, and zero printing waste.',
    deliverables: [
      'Custom laser-engraved NFC executive cards or table standees',
      'Cloud-hosted mobile eMenu with instant category updates',
      'Direct vCard save, Google Maps & WhatsApp CTA actions',
    ],
    techStack: ['NFC NTAG215', 'QR Engine', 'React PWA', 'Cloud CDN', 'vCard 4.0'],
    iconName: 'CreditCard',
    featured: true,
  },
  {
    id: 11,
    code: 'DEV-MNT',
    slug: 'website-maintenance',
    name: 'Website Maintenance',
    shortName: 'Web Maintenance',
    nameAr: 'صيانة وإدارة المواقع',
    category: 'DEVELOPMENT',
    categoryLabel: 'Development',
    benchmarkPriceBHD: '45.000',
    numericPriceBHD: 45.0,
    timeline: 'Monthly SLA',
    description:
      'Proactive uptime monitoring, dependency and security patching, database optimization, and priority content updates keeping mission-critical web properties fast.',
    deliverables: [
      '24/7 uptime checks & automated off-site backups',
      'Framework, SSL & security vulnerability patching',
      'Monthly performance audit & priority content edits',
    ],
    techStack: ['CI/CD', 'Sentry', 'Cloudflare', 'Lighthouse', 'Automated Backups'],
    iconName: 'LifeBuoy',
    featured: false,
  },
  {
    id: 12,
    code: 'DEV-APP',
    slug: 'custom-web-applications',
    name: 'Custom Web Applications',
    shortName: 'Custom Web Apps',
    nameAr: 'تطبيقات الويب المخصصة',
    category: 'DEVELOPMENT',
    categoryLabel: 'Development',
    benchmarkPriceBHD: '400.000',
    numericPriceBHD: 400.0,
    timeline: '30–45 Working Days',
    description:
      'End-to-end enterprise portals, multi-role client/staff governance dashboards, visa & booking engines, and custom SaaS platforms built with audit-grade security.',
    deliverables: [
      'Multi-role RBAC authentication & audit trail ledger',
      'Custom relational database schema & REST API docs',
      'Automated PDF receipt generation & payment gateway hooks',
    ],
    techStack: ['Django REST', 'React 19', 'TypeScript', 'PostgreSQL', 'Swagger/OpenAPI'],
    iconName: 'Layers',
    featured: true,
  },
];

export const XEROTECH_SERVICES = services;

export const XEROTECH_CASE_STUDIES: CaseStudyItem[] = [
  {
    id: 'easy-travels-spc',
    referenceCode: 'TTS-PRJ-2026-ET01',
    client: 'Easy Travels SPC',
    clientAr: 'شركة إيزي ترافلز ذ.م.م',
    sector: 'Travel, Visa & Aviation',
    title: 'Online Visa Application & Payment Portal',
    contractValueBHD: '220.000 BHD',
    financialNote: '50% Advance Verified (110.000 BHD Paid · 110.000 BHD Milestone Balance)',
    timeline: '30–45 Working Days',
    status: 'Verified Production Deployment',
    summary:
      'Designed and engineered a secure travel visa processing portal featuring automated passport & ID intake, real-time application status tracking, regional payment integration, and a multi-tier operations dashboard.',
    deliverables: [
      'Multi-step online visa application & secure document upload pipeline',
      'AFS & BenefitPay Bahrain online checkout integration',
      'Multi-tier staff console for case officers & automated status alerts',
    ],
    architecture: ['Django REST Framework', 'React Portal', 'AFS / BenefitPay', 'BHD Ledger'],
  },
  {
    id: 'al-khair-restaurant',
    referenceCode: 'XT-2026-1184',
    client: 'Al-Khair Restaurant',
    clientAr: 'مطعم الخير',
    sector: 'Hospitality & F&B Digitalization',
    title: 'Digital eMenu Platform & Social Growth Retainer',
    contractValueBHD: '80.000 BD',
    financialNote: '50.000 BD eMenu Setup + 10.000 BD/mo × 3 Months Retainer',
    timeline: '7-Day Launch + 3-Month Retainer',
    status: 'Live Hospitality Rollout',
    summary:
      'Delivered an instant bilingual QR/NFC digital menu platform with custom tabletop standees alongside a structured 3-month multi-channel growth retainer publishing 30 localized creatives weekly across Instagram, Facebook, and TikTok.',
    deliverables: [
      'Instant-load bilingual Digital eMenu with real-time price & item controls',
      'Tabletop QR/NFC standees engineered for zero re-printing overhead',
      '30 localized promotional creatives per week across IG, FB & TikTok',
    ],
    architecture: ['React PWA eMenu', 'QR/NFC Standees', 'Meta & TikTok Funnel', 'CDN Edge'],
  },
];

export const XBMS_BASELINE_RECEIPTS: XbmsReceiptRecord[] = [
  {
    receiptNo: 'XT-REC-2026-11-001',
    date: '01 Nov 2026',
    client: 'Gulf Horizon Logistics W.L.L.',
    service: 'Software & Web Development + AI Setup',
    totalBHD: '350.000',
    paidBHD: '350.000',
    balanceBHD: '0.000',
    status: 'Paid',
  },
  {
    receiptNo: 'XT-REC-2026-11-002',
    date: '06 Nov 2026',
    client: 'Easy Travels SPC',
    service: 'Online Visa & Payment Portal (TTS-PRJ-2026-ET01)',
    totalBHD: '220.000',
    paidBHD: '110.000',
    balanceBHD: '110.000',
    status: 'Partial (50%)',
  },
  {
    receiptNo: 'XT-REC-2026-11-003',
    date: '12 Nov 2026',
    client: 'Al-Khair Restaurant',
    service: 'Digital eMenu Platform & 3-Mo Retainer (XT-2026-1184)',
    totalBHD: '80.000',
    paidBHD: '80.000',
    balanceBHD: '0.000',
    status: 'Paid',
  },
  {
    receiptNo: 'XT-REC-2026-11-004',
    date: '18 Nov 2026',
    client: 'Manama Retail Group',
    service: 'POS & Inventory Application Suite',
    totalBHD: '350.000',
    paidBHD: '80.000',
    balanceBHD: '270.000',
    status: 'Partial (50%)',
  },
];
