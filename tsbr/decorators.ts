export const TSBR_MARKER_PROPERTY = "__tsbrService";

export type TsbrDecoratedPrototype = {
  [TSBR_MARKER_PROPERTY]?: boolean;
};

export function TSBR(): ClassDecorator {
  return (target) => {
    Object.defineProperty(target.prototype, TSBR_MARKER_PROPERTY, {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  };
}
