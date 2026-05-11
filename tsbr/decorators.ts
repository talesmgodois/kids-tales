export const TSBR_SID_PROPERTY = "__tsbrSid";

export type TsbrDecoratedPrototype = {
  [TSBR_SID_PROPERTY]?: number;
};

export function TSBR(sid: number): ClassDecorator {
  return (target) => {
    Object.defineProperty(target.prototype, TSBR_SID_PROPERTY, {
      value: sid,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  };
}
