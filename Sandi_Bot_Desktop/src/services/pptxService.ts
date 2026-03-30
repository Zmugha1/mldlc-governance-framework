import PptxGenJS from 'pptxgenjs';

export interface VisionPptxData {
  client_name: string;
  disc_style: string;
  vision_statement: string;
  dangers: string;
  opportunities: string;
  strengths: string;
  financial_net_worth_range: string;
  launch_timeline: string;
  areas_of_interest: string;
  territory_check_notes: string;
  coach_name: string;
}

const NAVY = '2D4459';
const TEAL = '3BBFBF';
const CORAL = 'F05F57';
const GRAY = '7A8F95';
const OFF_WHITE = 'FEFAF5';
const WHITE = 'FFFFFF';

const SLIDE_H = 7.5;
const ACCENT_W = 0.055;

function bodyOrDash(text: string): string {
  const t = text.trim();
  return t.length > 0 ? t : '—';
}

function visionParagraphs(vision: string): string {
  const t = vision.trim();
  if (!t) return '—';
  return t
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n\n');
}

export async function generateVisionPptx(data: VisionPptxData): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // SLIDE 1 — Cover
  const s1 = pptx.addSlide();
  s1.background = { color: NAVY };
  s1.addText(data.client_name, {
    x: 0.5,
    y: 2.35,
    w: 12.33,
    h: 1.25,
    fontSize: 40,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
  });
  s1.addText('Vision Statement', {
    x: 0.5,
    y: 3.65,
    w: 12.33,
    h: 0.55,
    fontSize: 20,
    color: TEAL,
    align: 'center',
    valign: 'middle',
  });
  if (data.disc_style.trim()) {
    s1.addText(data.disc_style.trim(), {
      x: 0.5,
      y: 4.2,
      w: 12.33,
      h: 0.35,
      fontSize: 12,
      color: GRAY,
      align: 'center',
      valign: 'middle',
    });
  }
  s1.addText(dateStr, {
    x: 0.5,
    y: 6.35,
    w: 12.33,
    h: 0.4,
    fontSize: 14,
    color: GRAY,
    align: 'center',
    valign: 'middle',
  });
  s1.addText(data.coach_name, {
    x: 8.2,
    y: 6.85,
    w: 4.5,
    h: 0.4,
    fontSize: 12,
    color: WHITE,
    align: 'right',
    valign: 'middle',
  });
  const speakerNoteParts = [
    data.disc_style.trim() ? `DISC: ${data.disc_style.trim()}` : '',
    data.territory_check_notes.trim()
      ? `Territory check:\n${data.territory_check_notes.trim()}`
      : '',
  ].filter(Boolean);
  if (speakerNoteParts.length > 0) {
    s1.addNotes(speakerNoteParts.join('\n\n'));
  }

  // SLIDE 2 — One Year Vision
  const s2 = pptx.addSlide();
  s2.background = { color: OFF_WHITE };
  s2.addText('My Vision', {
    x: 0.6,
    y: 0.45,
    w: 12,
    h: 0.55,
    fontSize: 24,
    bold: true,
    color: NAVY,
    valign: 'top',
  });
  s2.addText(visionParagraphs(data.vision_statement), {
    x: 0.6,
    y: 1.15,
    w: 12,
    h: 5.9,
    fontSize: 16,
    color: NAVY,
    lineSpacingMultiple: 1.6,
    valign: 'top',
    wrap: true,
  });

  // SLIDE 3 — Dangers
  const s3 = pptx.addSlide();
  s3.background = { color: WHITE };
  s3.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: ACCENT_W,
    h: SLIDE_H,
    fill: { color: CORAL },
    line: { width: 0 },
  });
  s3.addText('Dangers to Overcome', {
    x: 0.2,
    y: 0.45,
    w: 12.5,
    h: 0.55,
    fontSize: 22,
    bold: true,
    color: CORAL,
    valign: 'top',
  });
  s3.addText(bodyOrDash(data.dangers), {
    x: 0.2,
    y: 1.1,
    w: 12.5,
    h: 5.8,
    fontSize: 14,
    color: NAVY,
    valign: 'top',
    wrap: true,
  });

  // SLIDE 4 — Opportunities
  const s4 = pptx.addSlide();
  s4.background = { color: WHITE };
  s4.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: ACCENT_W,
    h: SLIDE_H,
    fill: { color: TEAL },
    line: { width: 0 },
  });
  s4.addText('Opportunities to Pursue', {
    x: 0.2,
    y: 0.45,
    w: 12.5,
    h: 0.55,
    fontSize: 22,
    bold: true,
    color: TEAL,
    valign: 'top',
  });
  s4.addText(bodyOrDash(data.opportunities), {
    x: 0.2,
    y: 1.1,
    w: 12.5,
    h: 5.8,
    fontSize: 14,
    color: NAVY,
    valign: 'top',
    wrap: true,
  });

  // SLIDE 5 — Strengths
  const s5 = pptx.addSlide();
  s5.background = { color: WHITE };
  s5.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: ACCENT_W,
    h: SLIDE_H,
    fill: { color: NAVY },
    line: { width: 0 },
  });
  s5.addText('Strengths to Leverage', {
    x: 0.2,
    y: 0.45,
    w: 12.5,
    h: 0.55,
    fontSize: 22,
    bold: true,
    color: NAVY,
    valign: 'top',
  });
  s5.addText(bodyOrDash(data.strengths), {
    x: 0.2,
    y: 1.1,
    w: 12.5,
    h: 5.8,
    fontSize: 14,
    color: NAVY,
    valign: 'top',
    wrap: true,
  });

  // SLIDE 6 — Financial and Timeline
  const s6 = pptx.addSlide();
  s6.background = { color: WHITE };
  s6.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: ACCENT_W,
    h: SLIDE_H,
    fill: { color: TEAL },
    line: { width: 0 },
  });
  s6.addText('Financial Goals', {
    x: 0.2,
    y: 0.45,
    w: 12.5,
    h: 0.55,
    fontSize: 22,
    bold: true,
    color: NAVY,
    valign: 'top',
  });
  s6.addText('Target Income', {
    x: 0.25,
    y: 1.35,
    w: 5.9,
    h: 0.35,
    fontSize: 14,
    bold: true,
    color: NAVY,
    valign: 'top',
  });
  s6.addText(bodyOrDash(data.financial_net_worth_range), {
    x: 0.25,
    y: 1.75,
    w: 5.9,
    h: 2.5,
    fontSize: 14,
    color: NAVY,
    valign: 'top',
    wrap: true,
  });
  s6.addText('Launch Timeline', {
    x: 6.9,
    y: 1.35,
    w: 5.9,
    h: 0.35,
    fontSize: 14,
    bold: true,
    color: NAVY,
    valign: 'top',
  });
  s6.addText(bodyOrDash(data.launch_timeline), {
    x: 6.9,
    y: 1.75,
    w: 5.9,
    h: 2.5,
    fontSize: 14,
    color: NAVY,
    valign: 'top',
    wrap: true,
  });

  // SLIDE 7 — Industries
  const s7 = pptx.addSlide();
  s7.background = { color: WHITE };
  s7.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: ACCENT_W,
    h: SLIDE_H,
    fill: { color: CORAL },
    line: { width: 0 },
  });
  s7.addText('Industries of Interest', {
    x: 0.2,
    y: 0.45,
    w: 12.5,
    h: 0.55,
    fontSize: 22,
    bold: true,
    color: NAVY,
    valign: 'top',
  });
  s7.addText(bodyOrDash(data.areas_of_interest), {
    x: 0.2,
    y: 1.1,
    w: 12.5,
    h: 5.8,
    fontSize: 14,
    color: NAVY,
    valign: 'top',
    wrap: true,
  });

  // SLIDE 8 — Next Steps
  const s8 = pptx.addSlide();
  s8.background = { color: NAVY };
  s8.addText('Next Steps with Sandi', {
    x: 0.6,
    y: 1.35,
    w: 12.13,
    h: 0.65,
    fontSize: 24,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
  });
  s8.addText(
    'Your vision is clear.\nNow we find the right vehicle to get you there.',
    {
      x: 1,
      y: 2.35,
      w: 11.33,
      h: 2.2,
      fontSize: 18,
      color: TEAL,
      align: 'center',
      valign: 'middle',
      lineSpacingMultiple: 1.35,
    }
  );
  s8.addText(data.coach_name, {
    x: 0.6,
    y: 6.35,
    w: 12.13,
    h: 0.45,
    fontSize: 14,
    color: WHITE,
    align: 'center',
    valign: 'middle',
  });

  const safeName = data.client_name.replace(/\s+/g, '_');
  await pptx.writeFile({ fileName: `${safeName}_Vision_Statement.pptx` });
}
