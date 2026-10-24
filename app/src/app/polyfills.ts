// Browser Buffer polyfill — must run before loading any Solana libraries
import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
}