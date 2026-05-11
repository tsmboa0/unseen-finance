import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    minHeight: 28,
  },
  logo: {
    width: 108,
    height: 28,
    objectFit: "contain" as const,
  },
  wordmark: {
    fontSize: 12,
    fontWeight: 700,
    color: "#5b21b6",
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  sub: {
    fontSize: 7,
    color: "#6b7280",
    marginLeft: 8,
    marginTop: 2,
  },
});

export function UnseenPdfBrandHeader(props: { logoPath?: string | null }) {
  return (
    <View style={styles.wrap} fixed>
      {props.logoPath ? (
        <Image src={props.logoPath} style={styles.logo} />
      ) : (
        <>
          <Text style={styles.wordmark}>Unseen</Text>
          <Text style={styles.sub}>Finance</Text>
        </>
      )}
    </View>
  );
}
