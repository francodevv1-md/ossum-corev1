import React from "react";
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
import { encodeCode128B, CODE128_QUIET_ZONE_MODULES, CODE128_BAR_HEIGHT_MODULES } from "@/lib/code128";

export interface PdfBarcodeProps extends Omit<PDFComponentProps, "children"> {
  value?: string;
  data?: string;
  width?: number | string;
  height?: number;
  color?: string;
  backgroundColor?: string;
  showText?: boolean;
  caption?: string;
  children?: never;
}

export type BarcodeProps = PdfBarcodeProps;

const createBarcodeStyles = (t: PdfcnTheme) => {
  const { spacing } = t.primitives;
  return StyleSheet.create({
    caption: {
      color: t.colors.mutedForeground,
      fontFamily: t.typography.body.fontFamily,
      fontSize: 6.5,
      marginTop: spacing[0.5] ?? 2,
      textAlign: "center",
      letterSpacing: 1.5,
    },
    container: { alignItems: "center", display: "flex", flexDirection: "column" },
  });
};

interface BarSegment {
  x: number;
  width: number;
}

const generateBarcodeData = (value: string): { totalModules: number; bars: BarSegment[] } | null => {
  if (!value || typeof value !== "string" || value.trim().length === 0) return null;
  try {
    const cleanValue = value.trim();
    const encoded = encodeCode128B(cleanValue);
    let cursor = CODE128_QUIET_ZONE_MODULES;
    const bars: BarSegment[] = [];

    for (const match of encoded.moduleStream.matchAll(/(1+)|(0+)/g)) {
      const runWidth = match[0].length;
      if (match[1]) {
        bars.push({ x: cursor, width: runWidth });
      }
      cursor += runWidth;
    }

    return {
      totalModules: encoded.totalModules,
      bars,
    };
  } catch {
    return null;
  }
};

export const PdfBarcode = ({
  value,
  data,
  width = 140,
  height = 32,
  color = "#000000",
  backgroundColor = "transparent",
  showText = true,
  caption,
  style,
}: PdfBarcodeProps) => {
  const resolvedValue = value ?? data ?? "";
  const theme = usePdfcnTheme();
  const styles = useSafeMemo(() => createBarcodeStyles(theme), [theme]);
  const barcodeData = useSafeMemo(
    () => generateBarcodeData(resolvedValue),
    [resolvedValue]
  );

  const resolvedColor = resolveColor(color, theme.colors);
  const resolvedBgColor =
    backgroundColor === "transparent"
      ? undefined
      : resolveColor(backgroundColor, theme.colors);

  const containerStyles: Style[] = [styles.container];
  if (style) {
    containerStyles.push(...[style].flat());
  }

  if (!resolvedValue || !barcodeData) {
    return <View style={containerStyles} />;
  }

  const { totalModules, bars } = barcodeData;
  const barHeight = CODE128_BAR_HEIGHT_MODULES;
  const viewBoxHeight = barHeight;

  return (
    <View style={containerStyles}>
      <Svg width={width} height={height} viewBox={`0 0 ${totalModules} ${viewBoxHeight}`}>
        {resolvedBgColor !== undefined && (
          <Rect x={0} y={0} width={totalModules} height={viewBoxHeight} fill={resolvedBgColor} />
        )}
        {bars.map((bar, index) => (
          <Rect
            key={`bar-${index}-${bar.x}`}
            x={bar.x}
            y={0}
            width={bar.width}
            height={barHeight}
            fill={resolvedColor}
          />
        ))}
      </Svg>
      {showText && (
        <PDFText style={styles.caption}>
          {caption ?? resolvedValue}
        </PDFText>
      )}
    </View>
  );
};

export const Barcode = PdfBarcode;
export default PdfBarcode;
