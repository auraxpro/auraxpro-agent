// src/lib/kb.ts

export type KB = {
  brand: string; site: string; services: string[];
  core_stack: string[]; strengths: string[]; process: string[];
  faqs: { q: string; a: string }[]; tone: string;
};

export async function loadKB(): Promise<KB> {
  const res = await fetch('/auraxpro-kb.json', { cache: 'no-store' });
  return res.json();
}

export function kbToContext(kb: KB) {
  const lines = [
    `Brand: ${kb.brand} (${kb.site})`,
    `Services: ${kb.services.join(', ')}`,
    `Core stack: ${kb.core_stack.join(', ')}`,
    `Strengths: ${kb.strengths.join(', ')}`,
    `Process: ${kb.process.join(' → ')}`,
    `FAQs:\n${kb.faqs.map(f => `- Q: ${f.q}\n  A: ${f.a}`).join('\n')}`,
    `Tone: ${kb.tone}`
  ];
  return lines.join('\n');
}

