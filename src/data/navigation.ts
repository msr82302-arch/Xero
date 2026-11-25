export interface NavItem {
  label: string;
  href: string;
  hasDropdown?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {label: 'Services', href: '#services', hasDropdown: true},
  {label: 'AI Studio', href: '#ai-studio'},
  {label: 'Case Studies', href: '#case-studies'},
  {label: 'Contact', href: '#contact'},
];
