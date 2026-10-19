export interface ArucoMarker {
  id: number;
  /** Four corners in image pixels, clockwise from the marker's own top-left. */
  corners: { x: number; y: number }[];
  hammingDistance: number;
}

export const AR: {
  Detector: new (config?: { dictionaryName?: string; maxHammingDistance?: number }) => {
    detect(image: { width: number; height: number; data: Uint8ClampedArray }): ArucoMarker[];
  };
  Dictionary: new (name: string) => {
    markSize: number;
    codeList: string[];
    generateSVG(id: number): string;
  };
};
