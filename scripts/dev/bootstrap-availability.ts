import prisma from "../../src/lib/prisma";
import { bootstrapAvailabilityDev } from "../../src/lib/services/availability-dev-bootstrap.service";

export function parseAvailabilityBootstrapMode(args: readonly string[]) {
  if (args.length === 0 || (args.length === 1 && args[0] === "--check")) {
    return "check" as const;
  }
  if (args.length === 1 && args[0] === "--apply") return "apply" as const;
  throw new Error("AVAILABILITY_DEV_BOOTSTRAP_REJECTED");
}

export async function runAvailabilityDevBootstrap(args = process.argv.slice(2)) {
  return bootstrapAvailabilityDev(prisma, {
    mode: parseAvailabilityBootstrapMode(args),
    env: process.env,
  });
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/dev/bootstrap-availability.ts")) {
  runAvailabilityDevBootstrap()
    .then((result) => console.log(JSON.stringify(result)))
    .catch(() => {
      console.error("AVAILABILITY_DEV_BOOTSTRAP_FAILED");
      process.exitCode = 1;
    });
}
