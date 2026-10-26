import { AgentRecord, SenderSettings, LabelFontSettings, DEFAULT_FONT_SETTINGS } from '@/types/agent';

/**
 * Generates an isolated, pixel-perfect HTML document for A4 Landscape printing
 * of 4 parcel slips (exact 1/4 A4 size each, filling 100% of the 297mm x 210mm sheet).
 */
export function generateParcelPrintHtml(
  slots: (AgentRecord | null)[],
  sender: SenderSettings,
  fontSettings?: LabelFontSettings
): string {
  const fonts = fontSettings || DEFAULT_FONT_SETTINGS;
  const displaySlots = [
    slots[0] || null,
    slots[1] || null,
    slots[2] || null,
    slots[3] || null,
  ];

  const renderSlip = (agent: AgentRecord | null, idx: number) => {
    if (!agent) {
      return `
        <div class="slip-outer">
          <div class="slip-border slip-empty">
            <p>කොටස ${idx + 1}</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="slip-outer">
        <div class="slip-border">
          <!-- Top Section: Agent / Recipient Details -->
          <div class="recipient-section">
            <div class="field-row">
              <span class="field-label">අලෙවි නියෝජිත :</span>
              <span class="field-value agent-name">${escapeHtml(agent.name || '')}</span>
            </div>
            <div class="field-row">
              <span class="field-label">නගරය :</span>
              <span class="field-value agent-town">${escapeHtml(agent.town || '')}</span>
            </div>
            <div class="field-row">
              <span class="field-label">දුරකථන අංකය :</span>
              <span class="field-value agent-phone">${escapeHtml(agent.phone || '')}</span>
            </div>
          </div>

          <!-- Center Section: Delivery Note (ලබා දෙන්න.) -->
          <div class="center-section">
            <div class="delivery-note">${escapeHtml(sender.centerNote || 'ලබා දෙන්න.')}</div>
          </div>

          <!-- Bottom Section: Sender / Dealer Details -->
          <div class="sender-section">
            <div class="sender-name">${escapeHtml(sender.name || '')}</div>
            <div class="sender-desig">${escapeHtml(sender.designation || '')}</div>
            <div class="sender-address">${escapeHtml(sender.address || '')}</div>
            <div class="sender-phone">${escapeHtml(sender.phone || '')}</div>
          </div>
        </div>
      </div>
    `;
  };

  return `<!DOCTYPE html>
<html lang="si">
<head>
  <meta charset="utf-8" />
  <title>A4 Parcel Labels (1/4 Size x 4)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: 297mm 210mm landscape;
      margin: 0mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 297mm;
      height: 210mm;
      margin: 0;
      padding: 0;
      background: #ffffff;
      overflow: hidden;
      font-family: 'Noto Sans Sinhala', 'Segoe UI', Tahoma, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      width: 297mm;
      height: 210mm;
      position: relative;
      display: grid;
      grid-template-columns: 148.5mm 148.5mm;
      grid-template-rows: 105mm 105mm;
      background: #ffffff;
    }

    /* Cut Guidelines (Exact 50% = 148.5mm / 105mm) */
    .cut-line-v {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 148.5mm;
      width: 0;
      border-left: 1px dashed #cbd5e1;
      pointer-events: none;
      z-index: 10;
    }
    .cut-line-h {
      position: absolute;
      left: 0;
      right: 0;
      top: 105mm;
      height: 0;
      border-top: 1px dashed #cbd5e1;
      pointer-events: none;
      z-index: 10;
    }

    .slip-outer {
      width: 148.5mm;
      height: 105mm;
      padding: 2mm;
      box-sizing: border-box;
      display: flex;
    }

    .slip-border {
      width: 100%;
      height: 100%;
      border: 1px solid #000000;
      padding: 16px 20px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
    }

    .slip-empty {
      border: 1px dashed #cbd5e1;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 14px;
    }

    /* Top Section */
    .recipient-section {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .field-row {
      display: flex;
      align-items: baseline;
      gap: 12px;
      line-height: 1.25;
    }
    .field-label {
      font-size: ${Math.round(fonts.agentDetailsSize * 0.9)}px;
      font-weight: 400;
      color: #0f172a;
      white-space: nowrap;
    }
    .field-value {
      font-size: ${fonts.agentDetailsSize}px;
      font-weight: 400;
      color: #000000;
    }
    .agent-name {
      font-size: ${fonts.agentNameSize}px;
      font-weight: 500;
    }
    .agent-phone {
      letter-spacing: 1.5px;
      font-family: 'Courier New', Courier, monospace, 'Noto Sans Sinhala';
      font-size: ${fonts.agentDetailsSize}px;
      font-weight: 500;
    }

    /* Center Section */
    .center-section {
      width: 100%;
      text-align: center;
      margin: auto 0;
      padding: 6px 0;
    }
    .delivery-note {
      font-size: ${fonts.centerNoteSize}px;
      font-weight: 400;
      color: #000000;
      letter-spacing: 2px;
    }

    /* Bottom Section */
    .sender-section {
      display: flex;
      flex-direction: column;
      gap: 2.5px;
      line-height: 1.25;
      padding-top: 6px;
    }
    .sender-name {
      font-size: ${Math.round(fonts.senderSize * 1.15)}px;
      font-weight: 500;
      color: #000000;
    }
    .sender-desig, .sender-address {
      font-size: ${fonts.senderSize}px;
      font-weight: 400;
      color: #1e293b;
    }
    .sender-phone {
      font-size: ${fonts.senderSize}px;
      font-weight: 500;
      color: #000000;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="cut-line-v"></div>
    <div class="cut-line-h"></div>
    ${displaySlots.map((agent, i) => renderSlip(agent, i)).join('')}
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Triggers direct browser printing of the A4 Landscape Parcel Sheet
 * using an isolated print iframe, ensuring zero margin overflow and full A4 coverage.
 */
export function directPrintParcelLabels(
  slots: (AgentRecord | null)[],
  sender: SenderSettings,
  fontSettings?: LabelFontSettings,
  onDone?: () => void
): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const html = generateParcelPrintHtml(slots, sender, fontSettings);

    let printFrame = document.getElementById('parcel-labels-print-frame') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'parcel-labels-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.left = '-9999px';
      printFrame.style.top = '-9999px';
      printFrame.style.width = '297mm';
      printFrame.style.height = '210mm';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      printFrame.style.zIndex = '-9999';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      return true;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        onDone?.();
      } catch (err) {
        console.error('Print frame error:', err);
        window.print();
      }
    }, 250);

    return true;
  } catch (err) {
    console.error('Direct parcel label print failed:', err);
    window.print();
    return false;
  }
}
