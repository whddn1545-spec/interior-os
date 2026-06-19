import React from "react";
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "NotoSansKR",
  src: "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.0.woff2",
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansKR",
    padding: 40,
    fontSize: 10,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 20 },
  infoRow: { flexDirection: "row", marginBottom: 4 },
  infoLabel: { width: 60, color: "#888" },
  infoValue: { flex: 1, fontWeight: "bold" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginVertical: 12 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1d4ed8",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  tableRowAlt: { backgroundColor: "#f9fafb" },
  colNo: { width: 24, color: "#fff", fontSize: 9 },
  colTitle: { flex: 3 },
  colKind: { width: 48, textAlign: "center" },
  colStart: { width: 64, textAlign: "center" },
  colEnd: { width: 64, textAlign: "center" },
  colDays: { width: 36, textAlign: "right" },
  colStatus: { width: 48, textAlign: "center" },
  headerText: { color: "#fff", fontSize: 9 },
  kindWork: { color: "#1d4ed8" },
  kindReserve: { color: "#d97706" },
  kindContingency: { color: "#ea580c" },
  statusDone: { color: "#16a34a" },
  statusActive: { color: "#2563eb" },
  statusPlanned: { color: "#9ca3af" },
  summaryBox: { flexDirection: "row", gap: 12, marginTop: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#f0f9ff",
    borderRadius: 4,
    padding: 10,
    alignItems: "center",
  },
  summaryNum: { fontSize: 18, fontWeight: "bold", color: "#1d4ed8" },
  summaryLabel: { fontSize: 8, color: "#64748b", marginTop: 2 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: "#aaa" },
});

const KIND_LABEL: Record<string, string> = { work: "공사", reserve: "예비", contingency: "비상" };
const STATUS_LABEL: Record<string, string> = { planned: "예정", active: "진행", done: "완료", canceled: "취소" };

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

export function SchedulePdfDocument({
  site,
  tasks,
}: {
  site: Record<string, unknown>;
  tasks: Record<string, unknown>[];
}) {
  const siteName = site.name as string;
  const siteAddr = site.address as string | null;
  const customerName = (site.customers as { name: string } | null)?.name ?? null;
  const startDate = site.start_date as string | null;
  const endDate = site.end_date as string | null;
  const createdStr = new Date().toLocaleDateString("ko-KR");

  const workTasks = tasks.filter((t) => t.kind === "work");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const totalDays = tasks.reduce((s, t) => s + ((t.duration_days as number) ?? 0), 0);

  return (
    <Document title={`${siteName} 공사 일정표`}>
      <Page size="A4" style={styles.page} orientation="landscape">
        {/* 헤더 */}
        <Text style={styles.title}>{siteName} — 공사 일정표</Text>
        <Text style={styles.subtitle}>출력일: {createdStr}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>현장</Text>
          <Text style={styles.infoValue}>{siteAddr ?? siteName}</Text>
        </View>
        {customerName && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>고객</Text>
            <Text style={styles.infoValue}>{customerName}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>공사 기간</Text>
          <Text style={styles.infoValue}>
            {startDate ? new Date(startDate).toLocaleDateString("ko-KR") : "-"}
            {" ~ "}
            {endDate ? new Date(endDate).toLocaleDateString("ko-KR") : "-"}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* 테이블 헤더 */}
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.colNo, ...styles.headerText }}>#</Text>
          <Text style={{ ...styles.colTitle, ...styles.headerText }}>작업명</Text>
          <Text style={{ ...styles.colKind, ...styles.headerText }}>구분</Text>
          <Text style={{ ...styles.colStart, ...styles.headerText }}>시작</Text>
          <Text style={{ ...styles.colEnd, ...styles.headerText }}>종료</Text>
          <Text style={{ ...styles.colDays, ...styles.headerText }}>일수</Text>
          <Text style={{ ...styles.colStatus, ...styles.headerText }}>상태</Text>
        </View>

        {/* 테이블 행 */}
        {tasks.map((task, i) => {
          const kind = task.kind as string;
          const status = task.status as string;
          const kindStyle = kind === "reserve" ? styles.kindReserve : kind === "contingency" ? styles.kindContingency : styles.kindWork;
          const statusStyle = status === "done" ? styles.statusDone : status === "active" ? styles.statusActive : styles.statusPlanned;
          const tradeName = (task.trades as { name_ko: string } | null)?.name_ko ?? "";
          const title = (task.title as string) + (tradeName && tradeName !== task.title ? ` (${tradeName})` : "");

          return (
            <View key={task.id as string} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={styles.colNo}>{i + 1}</Text>
              <Text style={styles.colTitle}>{title}</Text>
              <Text style={{ ...styles.colKind, ...kindStyle }}>{KIND_LABEL[kind] ?? kind}</Text>
              <Text style={styles.colStart}>{fmtDate(task.start_date as string | null)}</Text>
              <Text style={styles.colEnd}>{fmtDate(task.end_date as string | null)}</Text>
              <Text style={styles.colDays}>{task.duration_days as number}일</Text>
              <Text style={{ ...styles.colStatus, ...statusStyle }}>{STATUS_LABEL[status] ?? status}</Text>
            </View>
          );
        })}

        {/* 요약 */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{tasks.length}</Text>
            <Text style={styles.summaryLabel}>전체 작업</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{workTasks.length}</Text>
            <Text style={styles.summaryLabel}>공사 항목</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{doneTasks.length}</Text>
            <Text style={styles.summaryLabel}>완료</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{totalDays}일</Text>
            <Text style={styles.summaryLabel}>총 소요일</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>
              {tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0}%
            </Text>
            <Text style={styles.summaryLabel}>진행률</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>InteriorOS — {siteName} 공사 일정표</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
