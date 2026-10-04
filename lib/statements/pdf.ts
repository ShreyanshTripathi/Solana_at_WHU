import "server-only";
import PDFDocument from "pdfkit";
import type { Locale } from "@/lib/i18n/config";
import { createFormat } from "@/lib/i18n/format";
import { MESSAGES } from "@/lib/i18n/messages";
import { explorerTxUrl } from "@/lib/solana/wallets";
import { VAT_RATE } from "./compute";
import type { Statement } from "./load";

// The monthly statement as an A4 PDF, in German or English. Built with pdfkit's standard Helvetica
// (covers €, umlauts and §), with every on-chain payment as a clickable explorer link.

const MARGIN = 50;
const WIDTH = 595.28 - 2 * MARGIN;
const INK = "#14213d";
const MUTED = "#5b6472";
const RULE = "#d9dde3";
const ACCENT = "#2a78d6";

type Align = "left" | "right";
interface Column {
  width: number;
  align?: Align;
}

export function renderStatementPdf(s: Statement, locale: Locale): Promise<Buffer> {
  const m = MESSAGES[locale].statements;
  const common = MESSAGES[locale].common;
  const f = createFormat(locale);
  const eur = (micro: number) => f.eur(micro / 1_000_000);
  const title = `${m.docTitle} ${f.month(s.periodStart)}`;

  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    bufferPages: true,
    info: { Title: `${title} · ${s.member.name}`, Author: "Volty", Subject: s.number },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const bottom = () => doc.page.height - MARGIN - 40;
  const ensure = (space: number) => {
    if (doc.y + space > bottom()) doc.addPage();
  };
  const rule = () => {
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + WIDTH, doc.y).strokeColor(RULE).lineWidth(0.75).stroke();
    doc.moveDown(0.4);
  };
  const heading = (text: string) => {
    ensure(60);
    doc.moveDown(0.8).font("Helvetica-Bold").fontSize(12).fillColor(INK).text(text, MARGIN, doc.y, { width: WIDTH });
    doc.moveDown(0.3);
  };
  const note = (text: string) => {
    ensure(24);
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(text, MARGIN, doc.y, { width: WIDTH });
    doc.moveDown(0.3);
  };
  // One table row; cells may carry a link. Returns nothing, advances doc.y by the tallest cell.
  const row = (cols: Column[], cells: (string | { text: string; link?: string })[], opts: { bold?: boolean; muted?: boolean } = {}) => {
    ensure(18);
    const y = doc.y;
    let x = MARGIN;
    let tallest = 0;
    doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.5);
    cells.forEach((cell, i) => {
      const c = typeof cell === "string" ? { text: cell } : cell;
      const col = cols[i];
      doc.fillColor(c.link ? ACCENT : opts.muted ? MUTED : INK);
      doc.text(c.text, x, y, { width: col.width - 6, align: col.align ?? "left", link: c.link, underline: Boolean(c.link) });
      tallest = Math.max(tallest, doc.y - y);
      x += col.width;
    });
    doc.y = y + tallest + 3;
  };

  // Header: issuer, title, recipient and statement details side by side.
  doc.font("Helvetica-Bold").fontSize(18).fillColor(INK).text("Volty", MARGIN, MARGIN);
  doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(m.issuer);
  doc.moveDown(1.2);
  doc.font("Helvetica-Bold").fontSize(15).fillColor(INK).text(title);
  doc.moveDown(0.6);
  const top = doc.y;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(s.member.name, MARGIN, top, { width: WIDTH / 2 - 10 });
  doc.font("Helvetica").fontSize(9.5).fillColor(INK);
  if (s.site?.address) doc.text(s.site.address, { width: WIDTH / 2 - 10 });
  doc.fillColor(MUTED).text(`${m.workspace}: ${common.kind[s.member.kind] ?? s.member.kind}`, { width: WIDTH / 2 - 10 });
  const leftEnd = doc.y;
  const details: [string, string][] = [
    [m.number, s.number],
    [m.period, `${f.date(s.periodStart)} – ${f.date(s.periodEnd - 1)}`],
    [m.issued, f.date(Date.now())],
    ...(s.site?.meterId ? [[m.meter, s.site.meterId] as [string, string]] : []),
  ];
  doc.y = top;
  for (const [label, value] of details) {
    const y = doc.y;
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(label, MARGIN + WIDTH / 2, y, { width: 95 });
    doc.font("Helvetica").fontSize(9).fillColor(INK).text(value, MARGIN + WIDTH / 2 + 95, y, { width: WIDTH / 2 - 95 });
  }
  doc.y = Math.max(doc.y, leftEnd) + 10;
  rule();

  // Summary.
  heading(m.summary);
  const two: Column[] = [{ width: WIDTH - 120 }, { width: 120, align: "right" }];
  row(two, [m.paidOut, eur(s.totals.paidOutMicro)], { bold: true });
  if (s.totals.simulatedMicro > 0) row(two, [common.batchStatus.simulated, eur(s.totals.simulatedMicro)]);
  row(two, [m.toBill, eur(s.totals.billedMicro)], { bold: true });
  if (s.totals.paidFromWalletMicro > 0) row(two, [m.paidFromWallet, eur(s.totals.paidFromWalletMicro)], { bold: true });
  if (s.totals.unsettledMicro !== 0) row(two, [m.unsettled, eur(s.totals.unsettledMicro)]);
  note(m.nettingNote);

  // Energy tables.
  const priceCols: Column[] = [{ width: WIDTH - 230 }, { width: 110, align: "right" }, { width: 120, align: "right" }];
  heading(m.bought);
  if (s.bought.lines.length === 0) note(m.noneBought);
  else {
    row(priceCols, [m.table.description, m.table.kwh, m.table.amount], { muted: true });
    for (const l of s.bought.lines) row(priceCols, [m.atPrice(f.ct(l.priceCt)), f.num(l.kwh, 2), eur(l.grossMicro)]);
    row(priceCols, [m.subtotal, f.num(s.bought.kwh, 2), eur(s.bought.grossMicro)], { bold: true });
    note(m.vatIncluded(f.pct(VAT_RATE), eur(s.bought.vatMicro)));
  }

  heading(m.sold);
  if (s.sold.lines.length === 0) note(m.noneSold);
  else {
    row(priceCols, [m.table.description, m.table.kwh, m.table.amount], { muted: true });
    for (const l of s.sold.lines) row(priceCols, [l.grid ? m.fedIn(f.ct(l.priceCt)) : m.atPrice(f.ct(l.priceCt)), f.num(l.kwh, 2), eur(l.grossMicro)]);
    row(priceCols, [m.subtotal, f.num(s.sold.kwh, 2), eur(s.sold.grossMicro)], { bold: true });
    note(s.sold.vatRate > 0 ? m.vatIncluded(f.pct(VAT_RATE), eur(s.sold.vatMicro)) : m.noVatSmall);
    if (s.sold.deductions) {
      heading(m.waterfall);
      row(two, [m.sold, eur(s.sold.grossMicro)]);
      row(two, [`– ${m.fee} (${m.vatIncluded(f.pct(VAT_RATE), eur(s.sold.deductions.feeVatMicro))})`, eur(-s.sold.deductions.feeMicro)]);
      row(two, [`– ${m.reserve}`, eur(-s.sold.deductions.reserveMicro)]);
      row(two, [`– ${m.investors}`, eur(-s.sold.deductions.investorMicro)]);
      row(two, [m.toYou, eur(s.sold.creditedMicro)], { bold: true });
    }
  }

  if (s.repayments.lines.length > 0) {
    heading(m.repayments);
    for (const l of s.repayments.lines) row(two, [m.roof(s.roofNames[l.siteId] ?? l.siteId), eur(l.grossMicro)]);
    row(two, [m.subtotal, eur(s.repayments.totalMicro)], { bold: true });
    note(m.repaymentsNote);
  }

  if (s.meter) {
    heading(m.usage);
    const u = m.usageRows;
    row(two, [u.load, f.kwh(s.meter.loadKwh)]);
    row(two, [`   ${u.fromNeighbours}`, f.kwh(s.meter.fromNeighboursKwh, 2)]);
    row(two, [`   ${u.fromGrid}`, f.kwh(Math.max(0, s.meter.importKwh - s.meter.fromNeighboursKwh))]);
    if (s.meter.generationKwh > 0) {
      row(two, [u.generated, f.kwh(s.meter.generationKwh)]);
      row(two, [u.exported, f.kwh(s.meter.exportKwh)]);
    }
  }

  // Payments with links.
  heading(m.payments);
  note(m.paymentsNote);
  if (s.payments.length === 0) note(m.noPayments);
  else {
    const payCols: Column[] = [{ width: 130 }, { width: 85, align: "right" }, { width: 120 }, { width: WIDTH - 335 }];
    row(payCols, [m.paymentTable.hour, m.paymentTable.amount, m.paymentTable.status, m.paymentTable.tx], { muted: true });
    for (const p of s.payments) {
      const tx =
        p.signatures.length === 0
          ? "–"
          : { text: p.signatures.map((sig) => `${sig.slice(0, 6)}…${sig.slice(-6)}`).join(", "), link: explorerTxUrl(p.signatures[0]) };
      const status = (common.batchStatus[p.status] ?? p.status) + (p.amountMicro < 0 ? ` (${m.outgoing})` : "");
      row(payCols, [`${f.day(p.periodStart)} ${f.time(p.periodStart)}`, eur(p.amountMicro), status, tx]);
    }
  }

  // Footer on every page: disclaimer and page numbers.
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    // The footer sits inside the bottom margin; lift the margin while writing it, or pdfkit starts a new page.
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - MARGIN + 6;
    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
    doc.text(m.disclaimer, MARGIN, y, { width: WIDTH - 90, lineBreak: false });
    doc.text(`${s.number} · ${m.page(i + 1, range.count)}`, MARGIN + WIDTH - 200, y + 11, { width: 200, align: "right", lineBreak: false });
    doc.page.margins.bottom = bottomMargin;
  }
  doc.end();
  return done;
}
