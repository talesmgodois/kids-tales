import { mkdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { Project, Scope } from "ts-morph";

const SERVICES_GLOB = "services/**/*.ts";
const OUTPUT_DIR = ".tsbr/client";

type ScannedMethod = {
  name: string;
  mid: number;
  parametersText: string;
  argsText: string;
  extraArgsText: string;
  streamArgName?: string;
  isStreamMethod: boolean;
};

function extractSid(decoratorText: string): number {
  const sid = Number.parseInt(decoratorText, 10);
  if (Number.isNaN(sid)) {
    throw new Error(`Invalid TSBR sid: ${decoratorText}`);
  }
  return sid;
}

function normalizeImportPath(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/\.ts$/, "");
  return normalized.startsWith(".") ? normalized : `./${normalized}`;
}

function renderClientClass(
  className: string,
  sid: number,
  serviceImportPath: string,
  methods: ScannedMethod[],
): string {
  const methodBlocks = methods
    .map((method) => {
      const resolvedType = `Awaited<ReturnType<ServiceContract["${method.name}"]>>`;
      const streamCall = `return this.runtime.streamCall<${resolvedType}>(${sid}, ${method.mid}, [${method.extraArgsText}], ${method.streamArgName});`;
      const simpleCall = `return this.runtime.call<${resolvedType}>(${sid}, ${method.mid}, [${method.argsText}]);`;

      return `
  async ${method.name}(${method.parametersText}): Promise<${resolvedType}> {
    ${method.isStreamMethod ? streamCall : simpleCall}
  }`;
    })
    .join("\n");

  return `import { tsbr } from "./runtime";
type ServiceContract = import("${normalizeImportPath(serviceImportPath)}").${className};

export class ${className} {
  constructor(private readonly runtime: typeof tsbr = tsbr) {}
${methodBlocks}
}
`;
}

async function run() {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });

  const serviceFiles = project.addSourceFilesAtPaths(SERVICES_GLOB);
  const outDir = resolve(process.cwd(), OUTPUT_DIR);
  await mkdir(outDir, { recursive: true });

  for (const sourceFile of serviceFiles) {
    for (const classDecl of sourceFile.getClasses()) {
      const tsbrDecorator = classDecl.getDecorators().find((decorator) => decorator.getName() === "TSBR");
      if (!tsbrDecorator) {
        continue;
      }

      const sidArg = tsbrDecorator.getArguments()[0];
      if (!sidArg) {
        throw new Error(`Class ${classDecl.getName() ?? "Unknown"} is missing @TSBR sid.`);
      }

      const sid = extractSid(sidArg.getText());
      const className = classDecl.getName();
      if (!className) {
        continue;
      }

      const scannedMethods: ScannedMethod[] = classDecl
        .getMethods()
        .filter((method) => method.getScope() !== Scope.Private && method.getScope() !== Scope.Protected)
        .filter((method) => !method.isStatic())
        .map((method) => {
          const parameters = method.getParameters();
          const parametersText = parameters.map((parameter) => parameter.getText()).join(", ");
          const allArgNames = parameters.map((parameter) => parameter.getName());
          const lastParameter = parameters[parameters.length - 1];
          const streamArgName = lastParameter?.getName();
          const lastParameterType = lastParameter?.getType().getText(lastParameter) ?? "";
          const isStreamMethod = Boolean(lastParameter) && /ReadableStream/.test(lastParameterType);
          const argsText = allArgNames.join(", ");
          const extraArgsText = isStreamMethod ? allArgNames.slice(0, -1).join(", ") : argsText;

          return {
            name: method.getName(),
            mid: -1,
            parametersText,
            argsText,
            extraArgsText,
            streamArgName: isStreamMethod ? streamArgName : undefined,
            isStreamMethod,
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((method, index) => ({
          ...method,
          mid: index,
        }));

      const serviceImportPath = relative(outDir, sourceFile.getFilePath());
      const output = renderClientClass(className, sid, serviceImportPath, scannedMethods);
      await writeFile(resolve(outDir, `${className}.ts`), output, "utf8");
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
