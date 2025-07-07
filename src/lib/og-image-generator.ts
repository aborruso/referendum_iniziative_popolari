import sharp from 'sharp';
import type { Initiative } from '../types/initiative';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface OGImageOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  textColor?: string;
  categoryColor?: string;
}

const defaultOptions: Required<OGImageOptions> = {
  width: 1200,
  height: 630,
  backgroundColor: '#1e40af', // blue-800
  textColor: '#ffffff',
  categoryColor: '#3b82f6' // blue-500
};

// Funzione per wrappare il testo su più righe considerando la larghezza del font
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  // Stima approssimativa: carattere medio = fontSize * 0.6
  const avgCharWidth = fontSize * 0.6;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    // Se la parola singola è troppo lunga, la spezziamo
    if (word.length > maxCharsPerLine) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }

      // Spezza la parola lunga
      let remainingWord = word;
      while (remainingWord.length > maxCharsPerLine) {
        lines.push(remainingWord.substring(0, maxCharsPerLine - 1) + '-');
        remainingWord = remainingWord.substring(maxCharsPerLine - 1);
      }
      currentLine = remainingWord;
    } else if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// Funzione per generare il colore basato sulla categoria
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'AMBIENTE': '#10b981', // verde
    'DIRITTO': '#8b5cf6', // viola
    'ENERGIA': '#f59e0b', // ambra
    'ISTRUZIONE E COMUNICAZIONE': '#6366f1', // indaco
    'OCCUPAZIONE E LAVORO': '#14b8a6', // teal
    'QUESTIONI SOCIALI': '#ec4899', // rosa
    'TRASPORTO': '#84cc16', // lime
    'UNIONE EUROPEA': '#3b82f6', // blu
    'VITA POLITICA': '#ef4444', // rosso
  };

  return colors[category.toUpperCase()] || '#3b82f6'; // default blue-500
}

// Funzione per generare l'immagine OG della pagina Numeri
export async function generateNumeriOGImage(outputPath: string, options: OGImageOptions = {}): Promise<void> {
  const opts = { ...defaultOptions, ...options };

  const title = 'Numeri';
  const subtitle = 'Statistiche e analisi delle iniziative referendarie';
  const titleFontSize = 80;
  const subtitleFontSize = 36;
  const titleY = opts.height / 2 - 50;
  const subtitleY = opts.height / 2 + 20;
  const brandText = "Un'idea di onData";

  const svgTemplate = `
    <svg width="${opts.width}" height="${opts.height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Sfondo gradiente -->
      <defs>
        <linearGradient id="numericBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3730a3;stop-opacity:1" />
        </linearGradient>
      </defs>

      <rect width="100%" height="100%" fill="url(#numericBg)" />

      <!-- Elementi grafici decorativi -->
      <!-- Barre istogramma stilizzate -->
      <rect x="80" y="120" width="200" height="20" rx="10" fill="rgba(16, 185, 129, 0.6)" />
      <rect x="80" y="160" width="300" height="20" rx="10" fill="rgba(59, 130, 246, 0.6)" />
      <rect x="80" y="200" width="150" height="20" rx="10" fill="rgba(139, 92, 246, 0.6)" />

      <!-- Lollipop chart stilizzato -->
      <line x1="900" y1="400" x2="1100" y2="400" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      <circle cx="1100" cy="400" r="12" fill="#10b981" opacity="0.8"/>
      <line x1="900" y1="450" x2="1050" y2="450" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      <circle cx="1050" cy="450" r="12" fill="#3b82f6" opacity="0.8"/>
      <line x1="900" y1="500" x2="980" y2="500" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      <circle cx="980" cy="500" r="12" fill="#8b5cf6" opacity="0.8"/>

      <!-- Icone numeriche -->
      <text x="900" y="180" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="bold" fill="rgba(255,255,255,0.2)">123</text>
      <text x="950" y="250" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="bold" fill="rgba(255,255,255,0.15)">45%</text>

      <!-- Titolo principale -->
      <text x="60" y="${titleY}"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="${titleFontSize}"
            font-weight="900"
            fill="${opts.textColor}">
        ${title}
      </text>

      <!-- Sottotitolo -->
      <text x="60" y="${subtitleY}"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="${subtitleFontSize}"
            font-weight="400"
            fill="rgba(255,255,255,0.9)">
        ${subtitle}
      </text>

      <!-- Logo/Brand text -->
      <text x="${opts.width - 60}" y="${opts.height - 40}"
            text-anchor="end"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="20"
            font-weight="500"
            fill="rgba(255,255,255,0.7)">
        ${brandText}
      </text>

      <!-- Elemento decorativo angolare -->
      <polygon points="0,0 100,0 0,100" fill="rgba(255,255,255,0.05)" />
      <polygon points="${opts.width},${opts.height} ${opts.width-100},${opts.height} ${opts.width},${opts.height-100}" fill="rgba(255,255,255,0.05)" />
    </svg>
  `;

  try {
    const pngBuffer = await sharp(Buffer.from(svgTemplate))
      .png({
        quality: 90,
        compressionLevel: 6
      })
      .toBuffer();

    const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(outputPath, pngBuffer);

    console.log(`✅ Immagine OG Numeri generata: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Errore nella generazione dell'immagine Numeri:`, error);
    throw error;
  }
}

export async function generateOGImage(
  initiative: Initiative,
  outputPath: string,
  options: OGImageOptions = {}
): Promise<void> {
  const opts = { ...defaultOptions, ...options };

  // Layout speciale per la default image (id === 0)
  if (initiative.id === 0) {
    // Titolo e sottotitolo centrati
    const title = 'Referendum e Iniziative Popolari';
    const subtitle = 'Scopri e partecipa alle iniziative democratiche';
    const titleFontSize = 60;
    const subtitleFontSize = 36;
    const titleY = opts.height / 2 - 30;
    const subtitleY = opts.height / 2 + 40;
    const brandText = "Un'idea di onData";

    const svgTemplate = `
      <svg width="${opts.width}" height="${opts.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${opts.backgroundColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1e3a8a;stop-opacity:1" />
          </linearGradient>
          <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)" />
        <rect width="100%" height="100%" fill="url(#dots)" />
        <text x="50%" y="${titleY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${titleFontSize}" font-weight="700" fill="${opts.textColor}">${title}</text>
        <text x="50%" y="${subtitleY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${subtitleFontSize}" font-weight="400" fill="rgba(255,255,255,0.85)">${subtitle}</text>
        <text x="${opts.width - 60}" y="${opts.height - 40}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="500" fill="rgba(255,255,255,0.7)">${brandText}</text>
        <circle cx="${opts.width - 100}" cy="100" r="80" fill="rgba(255,255,255,0.05)" />
        <circle cx="${opts.width - 100}" cy="100" r="50" fill="rgba(255,255,255,0.1)" />
      </svg>
    `;

    try {
      const pngBuffer = await sharp(Buffer.from(svgTemplate))
        .png({ quality: 90, compressionLevel: 6 })
        .toBuffer();
      const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
      mkdirSync(dir, { recursive: true });
      writeFileSync(outputPath, pngBuffer);
      console.log(`✅ Immagine OG generata: ${outputPath}`);
    } catch (error) {
      console.error(`❌ Errore nella generazione dell'immagine di default:`, error);
      throw error;
    }
    return;
  }

  const title = initiative.titolo || 'Iniziativa Popolare';
  const category = initiative.idDecCatIniziativa?.nome || 'GENERALE';
  const status = initiative.idDecStatoIniziativa?.nome || 'IN RACCOLTA FIRME';

  // Wrapper del titolo considerando la larghezza disponibile
  const titleMaxWidth = opts.width - 120; // Margini laterali
  const titleFontSize = 56;
  const titleLines = wrapText(title, titleMaxWidth, titleFontSize);
  const maxLines = 3;
  const displayLines = titleLines.slice(0, maxLines);
  if (titleLines.length > maxLines) {
    displayLines[maxLines - 1] = displayLines[maxLines - 1].slice(0, -3) + '...';
  }

  const categoryColor = getCategoryColor(category);

  // Calcolo più preciso delle larghezze
  const categoryWidth = Math.max(category.length * 11 + 40, 120);
  const statusWidth = Math.max(status.length * 9 + 30, 100);

  // Creo il template SVG per l'immagine
  const svgTemplate = `
    <svg width="${opts.width}" height="${opts.height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Sfondo gradiente -->
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${opts.backgroundColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1e3a8a;stop-opacity:1" />
        </linearGradient>

        <!-- Pattern decorativo -->
        <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)" />
        </pattern>
      </defs>

      <!-- Sfondo principale -->
      <rect width="100%" height="100%" fill="url(#bg)" />
      <rect width="100%" height="100%" fill="url(#dots)" />

      <!-- Barra superiore -->
      <rect x="0" y="0" width="100%" height="8" fill="${categoryColor}" />

      <!-- Badge categoria -->
      <rect x="60" y="60" width="${categoryWidth}" height="40" rx="20" fill="${categoryColor}" />
      <text x="${60 + categoryWidth / 2}" y="85"
            text-anchor="middle"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="18"
            font-weight="600"
            fill="white">
        ${category}
      </text>

      <!-- Titolo principale -->
      ${displayLines.map((line, index) => `
        <text x="60" y="${180 + (index * 65)}"
              font-family="system-ui, -apple-system, sans-serif"
              font-size="56"
              font-weight="700"
              fill="${opts.textColor}"
              textLength="${Math.min(line.length * 33, titleMaxWidth)}"
              lengthAdjust="spacingAndGlyphs">
          ${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </text>
      `).join('')}

      <!-- Status badge -->
      <rect x="60" y="${opts.height - 120}" width="${statusWidth}" height="35" rx="17" fill="rgba(255,255,255,0.2)" />
      <text x="${60 + statusWidth / 2}" y="${opts.height - 97}"
            text-anchor="middle"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="16"
            font-weight="500"
            fill="${opts.textColor}">
        ${status}
      </text>

      <!-- Logo/Brand text -->
      <text x="${opts.width - 60}" y="${opts.height - 40}"
            text-anchor="end"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="20"
            font-weight="500"
            fill="rgba(255,255,255,0.7)">
        Referendum e Iniziative Popolari
      </text>

      <!-- Elemento decorativo -->
      <circle cx="${opts.width - 100}" cy="100" r="80" fill="rgba(255,255,255,0.05)" />
      <circle cx="${opts.width - 100}" cy="100" r="50" fill="rgba(255,255,255,0.1)" />
    </svg>
  `;

  try {
    // Genero l'immagine PNG usando Sharp
    const pngBuffer = await sharp(Buffer.from(svgTemplate))
      .png({
        quality: 90,
        compressionLevel: 6
      })
      .toBuffer();

    // Creo la directory se non esiste
    const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
    mkdirSync(dir, { recursive: true });

    // Salvo il file
    writeFileSync(outputPath, pngBuffer);

    console.log(`✅ Immagine OG generata: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Errore nella generazione dell'immagine per ${initiative.id}:`, error);
    throw error;
  }
}

export async function generateAllOGImages(initiatives: Initiative[], outputDir: string): Promise<void> {
  console.log(`🎨 Generazione di ${initiatives.length} immagini Open Graph...`);

  // Genero l'immagine di default per la homepage
  const defaultInitiative: Initiative = {
    id: 0,
    titolo: 'Referendum e Iniziative Popolari',
    dataApertura: '',
    idDecCatIniziativa: { id: 0, nome: 'DEMOCRAZIA' },
    idDecStatoIniziativa: { id: 0, nome: 'ATTIVE' }
  };

  await generateOGImage(
    defaultInitiative,
    join(outputDir, 'og-default.png')
  );

  // Genero l'immagine dedicata per la pagina Numeri
  await generateNumeriOGImage(join(outputDir, 'og-numeri.png'));

  // Genero le immagini per ogni iniziativa
  const promises = initiatives.map(initiative =>
    generateOGImage(
      initiative,
      join(outputDir, `og-${initiative.id}.png`)
    )
  );

  await Promise.all(promises);
  console.log(`✅ Tutte le immagini Open Graph generate in: ${outputDir}`);
}
