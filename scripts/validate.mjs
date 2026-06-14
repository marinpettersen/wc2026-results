import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "../schema/results.schema.json");
const dataPath = join(__dirname, "../results.json");

let rootSchema, data;
try {
  rootSchema = JSON.parse(readFileSync(schemaPath, "utf8"));
} catch (e) {
  console.error(`Gagal membaca schema: ${e.message}`);
  process.exit(1);
}
try {
  data = JSON.parse(readFileSync(dataPath, "utf8"));
} catch (e) {
  const msg = e.code === "ENOENT" ? "file tidak ditemukan" : `JSON korup — ${e.message}`;
  console.error(`results.json ${msg}`);
  process.exit(1);
}

// --- minimal JSON Schema validator (draft-07 subset) ---

function resolveRef(ref) {
  if (!ref.startsWith("#/")) throw new Error(`$ref tidak didukung: ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .reduce((node, key) => node[key], rootSchema);
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function matchesType(value, t) {
  if (t === "integer") return Number.isInteger(value);
  if (t === "number") return typeof value === "number";
  return typeOf(value) === t;
}

function validate(value, schema, path) {
  if (schema.$ref) return validate(value, resolveRef(schema.$ref), path);

  const errors = [];

  if (schema.anyOf) {
    const ok = schema.anyOf.some((s) => validate(value, s, path).length === 0);
    if (!ok) {
      const tried = schema.anyOf.map((s) => s.type ?? s.$ref ?? "?").join(" | ");
      errors.push(`${path}: tidak cocok dengan anyOf [${tried}] (nilai: ${JSON.stringify(value)})`);
    }
    return errors;
  }

  // type
  if (schema.type !== undefined) {
    const types = [].concat(schema.type);
    if (!types.some((t) => matchesType(value, t))) {
      errors.push(
        `${path}: diharapkan ${types.join("|")}, dapat ${typeOf(value)} (${JSON.stringify(value)})`
      );
      return errors;
    }
  }

  // enum
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: "${value}" tidak ada dalam enum [${schema.enum.join(", ")}]`);
  }

  // minimum
  if (schema.minimum !== undefined && typeof value === "number" && value < schema.minimum) {
    errors.push(`${path}: ${value} < minimum ${schema.minimum}`);
  }

  // object
  if (typeOf(value) === "object") {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${path}: field wajib "${key}" tidak ada`);
    }
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (key in value) errors.push(...validate(value[key], sub, `${path}.${key}`));
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) errors.push(`${path}: field tidak dikenal "${key}"`);
      }
    }
  }

  // array
  if (typeOf(value) === "array") {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: minItems ${schema.minItems}, dapat ${value.length}`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path}: maxItems ${schema.maxItems}, dapat ${value.length}`);
    }
    if (schema.items) {
      value.forEach((item, i) => errors.push(...validate(item, schema.items, `${path}[${i}]`)));
    }
  }

  return errors;
}

// --- jalankan validasi ---

const errors = validate(data, rootSchema, "$");

if (errors.length > 0) {
  console.error(`results.json TIDAK VALID — ${errors.length} error:`);
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  process.exit(1);
} else {
  console.log(`results.json valid. (${data.matches?.length ?? 0} laga)`);
}
