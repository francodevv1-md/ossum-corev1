import qrcodeLib from "qrcode";

import {
  usePdfcnTheme,
  useSafeMemo,
} from "@/components/pdf/theme-provider";
import {
  View,
  Text as PDFText,
  StyleSheet,
} from "@/lib/pdf-primitives";
import type { Style } from "@/lib/pdf-primitives";
import { Rect, Svg } from "@/lib/pdf-svg";
import { resolveColor } from "@/lib/resolve-color";
import type { PDFComponentProps } from "@/types/pdf-components";
import type { PdfcnTheme } from "@/types/pdf-themes";

export type QRCodeErrorLevel = "L" | "M" | "Q" | "H";

/**
 * QR code rendered as an SVG grid for use in PDF documents.
 * Props - `value` | `size` | `color` | `backgroundColor` | `errorLevel` | `margin` | `caption` | `style`
 * @see {@link PdfQRCodeProps}
 */
export interface PdfQRCodeProps extends Omit<PDFComponentProps, "children"> {
  value?: string;
  data?: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  errorLevel?: QRCodeErrorLevel;
  margin?: number;
  caption?: string;
  children?: never;
}

export type QRCodeProps = PdfQRCodeProps;

const createQRCodeStyles = (t: PdfcnTheme) => {
  const { spacing } = t.primitives;
  return StyleSheet.create({
    caption: {
      color: t.colors.mutedForeground,
      fontFamily: t.typography.body.fontFamily,
      fontSize: t.primitives.typography.xs,
      marginTop: spacing[1],
      textAlign: "center",
    },
    container: { alignItems: "center" },
  });
};

const generateQRMatrix = (
  value: string,
  errorLevel: QRCodeErrorLevel,
  margin: number
): boolean[][] => {
  if (!value) return [];
  try {
    const qr = qrcodeLib.create(value, { errorCorrectionLevel: errorLevel });

    const { size, data } = qr.modules;
    const totalSize = size + margin * 2;
    const matrix: boolean[][] = [];
    for (let row = 0; row < totalSize; row += 1) {
      const rowData: boolean[] = [];
      for (let col = 0; col < totalSize; col += 1) {
        const isInMargin =
          row < margin ||
          row >= size + margin ||
          col < margin ||
          col >= size + margin;
        if (isInMargin) {
          rowData.push(false);
        } else {
          rowData.push(data[(row - margin) * size + (col - margin)] === 1);
        }
      }
      matrix.push(rowData);
    }
    return matrix;
  } catch {
    return [];
  }
};

export const PdfQRCode = ({
  value,
  data,
  size = 100,
  color = "#000000",
  backgroundColor = "#ffffff",
  errorLevel = "M",
  margin = 2,
  caption,
  style,
}: PdfQRCodeProps) => {
  const resolvedValue = value ?? data ?? "";
  const theme = usePdfcnTheme();
  const styles = useSafeMemo(() => createQRCodeStyles(theme), [theme]);
  const matrix = useSafeMemo(
    () => generateQRMatrix(resolvedValue, errorLevel, margin),
    [resolvedValue, errorLevel, margin]
  );
  const moduleSize = matrix.length > 0 ? size / matrix.length : 0;
  const resolvedColor = resolveColor(color, theme.colors);
  const resolvedBgColor =
    backgroundColor === "transparent"
      ? undefined
      : resolveColor(backgroundColor, theme.colors);
  const containerStyles: Style[] = [styles.container];
  if (style) {
    containerStyles.push(...[style].flat());
  }

  if (!resolvedValue || matrix.length === 0) {
    return <View style={containerStyles} />;
  }

  return (
    <View style={containerStyles}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {resolvedBgColor !== undefined && (
          <Rect x={0} y={0} width={size} height={size} fill={resolvedBgColor} />
        )}
        {matrix
          .flatMap((row, y) =>
            row
              .map((isDark, x) => (isDark ? { x, y } : null))
              .filter((pos): pos is { x: number; y: number } => pos !== null)
          )
          .map((pos) => (
            <Rect
              key={`qr-${pos.y}-${pos.x}`}
              x={pos.x * moduleSize}
              y={pos.y * moduleSize}
              width={moduleSize}
              height={moduleSize}
              fill={resolvedColor}
            />
          ))}
      </Svg>
      {caption && <PDFText style={styles.caption}>{caption}</PDFText>}
    </View>
  );
};

export const QRCode = PdfQRCode;
export default PdfQRCode;
