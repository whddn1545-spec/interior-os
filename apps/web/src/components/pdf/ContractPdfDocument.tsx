import React from "react";
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "NotoSansKR",
  src: "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.0.woff2",
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansKR",
    padding: 48,
    fontSize: 10,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  center: { textAlign: "center" },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 10, color: "#666", textAlign: "center", marginBottom: 32 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 6 },
  articleTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 4, color: "#1d4ed8" },
  articleBody: { fontSize: 9, color: "#333", lineHeight: 1.6, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  label: { color: "#666", flex: 1 },
  value: { flex: 2, textAlign: "right" },
  paymentBox: { backgroundColor: "#f0fdf4", border: "1pt solid #86efac", borderRadius: 4, padding: 12, marginTop: 12 },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  signatureArea: { marginTop: 40, flexDirection: "row", justifyContent: "space-around" },
  signatureBlock: { alignItems: "center", width: 160 },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: "#666", width: 140, marginBottom: 4 },
  signatureLabel: { fontSize: 9, color: "#666" },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, borderTopWidth: 0.5, borderTopColor: "#ddd", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#999" },
  legalNote: { backgroundColor: "#fef9c3", padding: 8, borderRadius: 4, fontSize: 8, color: "#713f12", marginTop: 12 },
});

function won(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

const ARTICLES = [
  {
    title: "제1조 (계약의 목적)",
    body: "본 계약은 발주자(이하 '갑')와 수급자(이하 '을') 간에 인테리어 공사의 시공에 관한 사항을 정함을 목적으로 한다.",
  },
  {
    title: "제2조 (공사 범위)",
    body: "을은 본 계약에 첨부된 견적서에 명시된 공사 범위에 따라 성실히 시공하여야 한다.",
  },
  {
    title: "제3조 (공사 금액 및 지급 방법)",
    body: "공사 금액은 별도 명시된 금액으로 하며, 지급 방법은 계약금/중도금/잔금으로 분할하여 지급한다.",
  },
  {
    title: "제4조 (공사 기간)",
    body: "을은 합의된 공사 기간 내에 공사를 완료하여야 하며, 불가항력 등의 사유로 기간 연장이 필요한 경우 갑에게 즉시 통보하여야 한다.",
  },
  {
    title: "제5조 (하자 보수)",
    body: "공사 완료 후 1년 이내에 발생하는 하자에 대하여 을은 무상으로 보수하여야 한다. 단, 갑의 고의 또는 과실로 인한 손상은 제외한다.",
  },
  {
    title: "제6조 (계약 해지)",
    body: "갑 또는 을이 본 계약의 조항을 위반하거나 계약 이행이 불가능한 사유가 발생한 경우 상대방에게 서면으로 통보하고 계약을 해지할 수 있다.",
  },
  {
    title: "제7조 (분쟁 해결)",
    body: "본 계약과 관련한 분쟁이 발생한 경우, 갑과 을은 상호 협의하여 해결하며, 협의가 이루어지지 않을 경우 관할 법원에 제소한다.",
  },
];

export function ContractPdfDocument({ contract }: { contract: Record<string, unknown> }) {
  const quote = contract.quotes as Record<string, unknown> | null;
  const site = quote?.sites as { name: string; address: string; area_pyeong: number; customers: { name: string; phone: string } | null } | null;
  const paymentTerms = contract.payment_terms as { deposit: number; interim: number; final: number; totalAmount: number } | null;
  const totalAmount = paymentTerms?.totalAmount ?? (quote?.total_amount as number) ?? 0;
  const specialTerms = contract.special_terms as string | null;
  const createdAt = contract.created_at as string;
  const dateStr = createdAt ? new Date(createdAt).toLocaleDateString("ko-KR") : "";

  return (
    <Document title="인테리어 공사 계약서">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>인테리어 공사 계약서</Text>
        <Text style={styles.subtitle}>작성일: {dateStr}</Text>

        {/* 계약 당사자 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계약 당사자</Text>
          <View style={styles.row}>
            <Text style={styles.label}>발주자(갑)</Text>
            <Text style={styles.value}>{site?.customers?.name ?? "-"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>연락처</Text>
            <Text style={styles.value}>{site?.customers?.phone ?? "-"}</Text>
          </View>
        </View>

        {/* 공사 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>공사 정보</Text>
          <View style={styles.row}>
            <Text style={styles.label}>공사 현장</Text>
            <Text style={styles.value}>{site?.name ?? "-"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>주소</Text>
            <Text style={styles.value}>{site?.address ?? "-"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>면적</Text>
            <Text style={styles.value}>{site?.area_pyeong ?? "-"}평</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>총 공사 금액</Text>
            <Text style={styles.value}>{won(totalAmount)}</Text>
          </View>
        </View>

        {/* 대금 지급 조건 */}
        {paymentTerms && (
          <View style={styles.paymentBox}>
            <Text style={{ ...styles.sectionTitle, marginBottom: 8 }}>대금 지급 조건</Text>
            <View style={styles.paymentRow}>
              <Text>계약금 ({paymentTerms.deposit}%)</Text>
              <Text>{won(Math.round(totalAmount * paymentTerms.deposit / 100))}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text>중도금 ({paymentTerms.interim}%)</Text>
              <Text>{won(Math.round(totalAmount * paymentTerms.interim / 100))}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text>잔금 ({paymentTerms.final}%)</Text>
              <Text>{won(Math.round(totalAmount * paymentTerms.final / 100))}</Text>
            </View>
          </View>
        )}

        {/* 계약 조항 */}
        <View style={{ ...styles.section, marginTop: 20 }}>
          <Text style={styles.sectionTitle}>계약 조항</Text>
          {ARTICLES.map((a) => (
            <View key={a.title}>
              <Text style={styles.articleTitle}>{a.title}</Text>
              <Text style={styles.articleBody}>{a.body}</Text>
            </View>
          ))}
        </View>

        {/* 특약 사항 */}
        {specialTerms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>특약 사항</Text>
            <Text style={styles.articleBody}>{specialTerms}</Text>
          </View>
        )}

        {/* 법적 고지 */}
        <View style={styles.legalNote}>
          <Text>본 계약서는 법적 효력을 가지며, 갑과 을이 서명함으로써 효력이 발생합니다.</Text>
          <Text>계약서 원본 2부를 작성하여 각 1부씩 보관합니다.</Text>
        </View>

        {/* 서명란 */}
        <View style={styles.signatureArea}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>발주자(갑) 서명</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>수급자(을) 서명</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>InteriorOS 계약서</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
