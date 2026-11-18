// Appels manqués traités par la secrétaire (démo). En production, ils viennent
// du worker (fournisseur de téléphonie + transcription), même forme.
// Les conversations sont écrites dans les mots du métier de l'entreprise.

import { voiceFor } from '@/lib/demoTrades';

export interface MissedCall {
  id: string;
  name: string;
  phone: string;
  when: string; // libellé relatif
  time: string;
  duration: string;
  urgency: 'urgent' | 'normal' | 'info';
  summary: string;
  outcome: string;
  outcomeIcon: string;
  transcript: { who: 'bob' | 'client'; text: string }[];
  lead?: { request: string; city: string; estimate?: number };
}

export function callsFor(trade: string | undefined, company: string, boss: string): MissedCall[] {
  const v = voiceFor(trade);
  const who = boss || 'le patron';
  const u = v.urgent;
  return [
    {
      id: 'call1', name: u.name, phone: '04 78 52 10 20', when: "Aujourd'hui", time: '11:42', duration: '1 min 38', urgency: 'urgent',
      summary: u.summary,
      outcome: 'Prévenu par SMS · rappel promis avant 14 h', outcomeIcon: 'BellRing',
      transcript: [
        { who: 'bob', text: `Bonjour, ${company}, je suis Bob, l’assistant de ${who}. Il est sur un chantier : dites-moi tout, je lui transmets tout de suite.` },
        { who: 'client', text: `Oui bonjour, c’est ${u.name}. ${u.say}` },
        { who: 'bob', text: u.ask },
        { who: 'client', text: u.answer },
        { who: 'bob', text: `Merci. Je préviens ${who} tout de suite par SMS, il vous rappelle avant 14 h. Je note le 04 78 52 10 20 ?` },
        { who: 'client', text: 'Oui c’est ça, merci.' },
      ],
      lead: { request: u.request, city: 'Lyon 2e', estimate: u.estimate },
    },
    {
      id: 'call2', name: 'Nathalie Perrin', phone: '06 72 18 44 09', when: "Aujourd'hui", time: '09:15', duration: '2 min 04', urgency: 'normal',
      summary: v.visit.summary,
      outcome: 'Visite réservée jeudi à 17 h 30', outcomeIcon: 'CalendarCheck',
      transcript: [
        { who: 'bob', text: `Bonjour, ${company}, je suis Bob, l’assistant de ${who}. Que puis-je faire pour vous ?` },
        { who: 'client', text: `Bonjour. ${v.visit.say}` },
        { who: 'bob', text: `Très bien. ${who} peut passer voir ça jeudi à 17 h 30 ou vendredi à 8 h. Qu’est-ce qui vous arrange ?` },
        { who: 'client', text: 'Jeudi 17 h 30 c’est parfait. C’est au 8 rue Anatole France à Villeurbanne.' },
        { who: 'bob', text: 'C’est noté, jeudi 17 h 30. Vous recevez une confirmation par SMS. Bonne journée !' },
      ],
      lead: { request: v.visit.request, city: 'Villeurbanne', estimate: v.visit.estimate },
    },
    {
      id: 'call3', name: 'Marc Roche · SCI Les Tilleuls', phone: '04 72 33 18 90', when: 'Hier', time: '16:20', duration: '0 min 52', urgency: 'normal',
      summary: 'Demande où en est la cage C et si l’avenant est prêt.',
      outcome: 'Avenant à envoyer · rappel demandé demain matin', outcomeIcon: 'FileText',
      transcript: [
        { who: 'bob', text: `Bonjour, ${company}, je suis Bob. ${who} est sur un chantier, je peux prendre un message ?` },
        { who: 'client', text: 'Oui c’est Marc Roche de la SCI, je voulais savoir où vous en êtes sur la cage C, et pour l’avenant.' },
        { who: 'bob', text: `La cage C est prévue jeudi et vendredi. Je dis à ${who} de vous envoyer l’avenant et de vous rappeler demain matin.` },
      ],
    },
    {
      id: 'call4', name: 'Numéro masqué', phone: 'Masqué', when: 'Hier', time: '10:03', duration: '0 min 21', urgency: 'info',
      summary: 'Démarchage pour un contrat d’énergie. Bob a poliment décliné.',
      outcome: 'Aucune suite à donner', outcomeIcon: 'ShieldCheck',
      transcript: [
        { who: 'client', text: 'Bonjour, je vous appelle au sujet de votre contrat d’électricité professionnel…' },
        { who: 'bob', text: 'Merci, mais nous ne sommes pas intéressés. Bonne journée.' },
      ],
    },
  ];
}

export const BOB_LINE = '09 73 21 45 80';
