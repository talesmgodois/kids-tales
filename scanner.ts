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

type ScannedService = {
  className: string;
  sourcePath: string;
  sid: number;
  methods: ScannedMethod[];
};

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

  const scannedServices: ScannedService[] = [];

  for (const sourceFile of serviceFiles) {
    for (const classDecl of sourceFile.getClasses()) {
      const tsbrDecorator = classDecl.getDecorators().find((decorator) => decorator.getName() === "TSBR");
      if (!tsbrDecorator) {
        continue;
      }

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

      scannedServices.push({
        className,
        sourcePath: sourceFile.getFilePath(),
        sid: -1,
        methods: scannedMethods,
      });
    }
  }

  const duplicatedNames = scannedServices
    .map((service) => service.className)
    .filter((name, index, all) => all.indexOf(name) !== index);

  if (duplicatedNames.length > 0) {
    throw new Error(
      `Duplicated TSBR service names found: ${Array.from(new Set(duplicatedNames)).join(", ")}`,
    );
  }

  scannedServices
    .sort(
      (left, right) =>
        left.className.localeCompare(right.className) || left.sourcePath.localeCompare(right.sourcePath),
    )
    .forEach((service, index) => {
      service.sid = index;
    });

  for (const service of scannedServices) {
    const serviceImportPath = relative(outDir, service.sourcePath);
    const output = renderClientClass(
      service.className,
      service.sid,
      serviceImportPath,
      service.methods,
    );
    await writeFile(resolve(outDir, `${service.className}.ts`), output, "utf8");
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
