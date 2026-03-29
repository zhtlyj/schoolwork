import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const artifact = path.join(
  root,
  "backend/hardhat/artifacts/contracts/AcademicIntegrityAnchor.sol/AcademicIntegrityAnchor.json"
);
const outFile = path.join(root, "frontend/src/contracts/academicIntegrityAnchor.ts");
const { abi } = JSON.parse(fs.readFileSync(artifact, "utf8"));

const header = `// ABI 与 backend/hardhat 编译产物 AcademicIntegrityAnchor.json 保持一致；合约变更后请运行 node scripts/sync-academic-anchor-abi.mjs\n`;

const body =
  header +
  `export const ACADEMIC_INTEGRITY_ANCHOR_ABI = ${JSON.stringify(abi, null, 2)} as const;

export const ACADEMIC_INTEGRITY_ANCHOR_ADDRESS = (import.meta.env.VITE_ACADEMIC_INTEGRITY_ANCHOR_ADDRESS ?? "")
  .trim();

export function requireContractAddress(): string {
  if (!ACADEMIC_INTEGRITY_ANCHOR_ADDRESS) {
    throw new Error("请在 frontend/.env 中配置 VITE_ACADEMIC_INTEGRITY_ANCHOR_ADDRESS");
  }
  return ACADEMIC_INTEGRITY_ANCHOR_ADDRESS;
}
`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, body, "utf8");
console.log("Wrote", outFile);
