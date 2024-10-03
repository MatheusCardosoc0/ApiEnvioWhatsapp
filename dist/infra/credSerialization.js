"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/infra/credSerialization.ts
var credSerialization_exports = {};
__export(credSerialization_exports, {
  decodeCreds: () => decodeCreds,
  encodeCreds: () => encodeCreds
});
module.exports = __toCommonJS(credSerialization_exports);
var encodeCreds = (creds) => {
  return JSON.stringify(creds, (key, value) => {
    if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
      return {
        type: "Buffer",
        data: Array.from(value)
        // Converte Buffer ou Uint8Array em array
      };
    }
    return value;
  });
};
var decodeCreds = (credsString) => {
  return JSON.parse(credsString, (key, value) => {
    if (value && value.type && value.data && Array.isArray(value.data)) {
      return Buffer.from(value.data);
    }
    return value;
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  decodeCreds,
  encodeCreds
});
