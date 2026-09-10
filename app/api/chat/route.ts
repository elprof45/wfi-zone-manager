import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      model = 'gemini-3.8-flash',
      systemInstruction = 'Tu es l\'assistant IA expert de NetPulse Hotspot Manager (v2026). Tu es un spécialiste de l\'écosystème MikroTik RouterOS v7, de la gestion de réseau captive portal, du dimensionnement des profils de bande passante (queues PCQ, FastTrack), et de la gestion comptable des ventes de tickets. Réponds de façon précise, technique si nécessaire, en français, avec un ton professionnel et direct.',
      networkContext,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'La liste des messages est requise pour une conversation multi-tours.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Clé API Gemini non configurée (GEMINI_API_KEY). Veuillez la configurer dans AI Studio Secrets.',
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Build enhanced system instruction with live network context if provided
    let fullSystemInstruction = systemInstruction;
    if (networkContext) {
      fullSystemInstruction += `\n\n[CONTEXTE ACTUEL DU RÉSEAU NETPULSE]:\n` +
        `- Routeurs actifs: ${networkContext.routersCount ?? 'N/A'}\n` +
        `- Utilisateurs connectés: ${networkContext.activeUsersCount ?? 'N/A'}\n` +
        `- Chiffre d'affaires du jour: ${networkContext.todayRevenue ?? 0} ${networkContext.currency ?? 'XOF'}\n` +
        `- Charge CPU moyenne: ${networkContext.cpuAverage ?? 'N/A'}%\n` +
        `- Tickets vendus aujourd'hui: ${networkContext.ticketsSoldCount ?? 0}\n` +
        `Utilise ces métriques pour fournir des conseils précis si l'utilisateur pose une question relative à sa situation opérationnelle.`;
    }

    // Format messages for @google/genai contents
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // Supported models
    const validModels = [
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.1-pro-preview',
    ];

    const selectedModel = validModels.includes(model) ? model : 'gemini-3.8-flash';

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction: fullSystemInstruction,
      },
    });

    const replyText = response.text || 'Aucune réponse générée par le modèle.';

    return NextResponse.json({
      text: replyText,
      model: selectedModel,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erreur Gemini Chat API:', error);
    const errorMessage = error?.message || 'Une erreur est survenue lors de la communication avec Gemini.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
