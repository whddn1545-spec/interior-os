import React from "react";
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "NotoSansKR",
  src: "/fonts/NotoSansKR.ttf",
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansKR",
    padding: 48,
    fontSize: 10,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  header: { marginBottom: 32 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#555" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 4, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  label: { color: "#666", flex: 1 },
  value: { flex: 2, textAlign: "right" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", paddingVertical: 5, paddingHorizontal: 4, borderRadius: 2 },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  colTrade: { flex: 2 },
  colQty: { flex: 1, textAlign: "right" },
  colMat: { flex: 2, textAlign: "right" },
  colLabor: { flex: 2, textAlign: "right" },
  colTotal: { flex: 2, textAlign: "right" },
  totalBox: { backgroundColor: "#1d4ed8", padding: 12, borderRadius: 4, marginTop: 12 },
  totalLabel: { color: "#bfdbfe", fontSize: 10 },
  totalAmount: { color: "#ffffff", fontSize: 18, fontWeight: "bold", marginTop: 2 },
  notice: { backgroundColor: "#fef9c3", padding: 10, borderRadius: 4, fontSize: 9, color: "#713f12" },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, borderTopWidth: 0.5, borderTopColor: "#ddd", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#999" },
});

function won(n: unknown) {
  const num = typeof n === "number" && !isNaN(n) ? n : 0;
  return num.toLocaleString("ko-KR") + "원";
}

interface QuotePdfDocumentProps {
  quote: Record<string, unknown>;
  audience: "customer" | "internal";
}

export function QuotePdfDocument({ quote, audience }: QuotePdfDocumentProps) {
  const site = quote.sites as { name: string; address: string; area_pyeong: number; customers: { name: string; phone: string } | null } | null;
  const items = (quote.quote_items as { id: string; trades?: { name_ko: string } | null; quantity: number; material_cost: number; labor_cost: number; line_total: number }[] | null) ?? [];
  const totalAmount = (quote.total_amount as number) ?? 0;
  const isCustomer = audience === "customer";
  const createdAt = quote.created_at as string;
  const dateStr = createdAt ? new Date(createdAt).toLocaleDateString("ko-KR") : "";

  return (
    <Document title={isCustomer ? "인테리어 견적서" : "견적서 (내부)"}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{isCustomer ? "인테리어 공사 견적서" : "견적서 (내부용)"}</Text>
          <Text style={styles.subtitle}>작성일: {dateStr}</Text>
        </View>

        {/* 고객/현장 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>현장 정보</Text>
          <View style={styles.row}>
            <Text style={styles.label}>현장명</Text>
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
          {isCustomer && site?.customers && (
            <View style={styles.row}>
              <Text style={styles.label}>고객명</Text>
              <Text style={styles.value}>{site.customers.name}</Text>
            </View>
          )}
        </View>

        {/* 견적 항목 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>공사 항목</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colTrade}>공종</Text>
            <Text style={styles.colQty}>수량</Text>
            <Text style={styles.colMat}>자재비</Text>
            {!isCustomer && <Text style={styles.colLabor}>인건비</Text>}
            <Text style={styles.colTotal}>소계</Text>
          </View>
          {items.map((item) => {
            const mat = item.material_cost;
            const labor = item.labor_cost;
            const lineTotal = item.line_total;
            return (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.colTrade}>{item.trades?.name_ko ?? "-"}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colMat}>{won(mat)}</Text>
                {!isCustomer && <Text style={styles.colLabor}>{won(labor)}</Text>}
                <Text style={styles.colTotal}>{won(lineTotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* 합계 */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>총 공사 금액 (VAT 별도)</Text>
          <Text style={styles.totalAmount}>{won(totalAmount)}</Text>
        </View>

        {/* 고객용 안내 */}
        {isCustomer && (
          <View style={{ ...styles.notice, marginTop: 16 }}>
            <Text>• 본 견적서는 현장 실측 전 참고용입니다. 실측 후 최종 금액이 확정됩니다.</Text>
            <Text>• 자재 가격 변동에 따라 견적 금액이 변경될 수 있습니다.</Text>
            <Text>• 견적 유효기간: 발행일로부터 30일</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>InteriorOS</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
